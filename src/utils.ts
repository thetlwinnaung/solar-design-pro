/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SolarSurvey, ClientInfo, SiteSurveyData, RoofMeasurements, EnergyConsumption } from './types';

// Real-time solar angle math
export interface SolarAngles {
  altitude: number; // in degrees
  azimuth: number;  // in degrees
  peakSunHours: number; // estimated average peak sun hours
}

/**
 * Approximate solar position calculator
 * Uses basic astronomical formulas based on Latitude, Longitude, Day of Year, and Local Time
 */
export function calculateSolarAngles(
  latitude: number,
  longitude: number,
  dateString: string,
  timeString: string
): SolarAngles {
  const date = new Date(`${dateString}T${timeString}`);
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );

  // Solar declination (degrees)
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 80) * (Math.PI / 180));

  // Hour Angle (degrees)
  const hours = date.getHours() + date.getMinutes() / 60;
  // Standard solar time approximation
  const hourAngle = (hours - 12) * 15;

  const latRad = latitude * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  const hourRad = hourAngle * (Math.PI / 180);

  // Solar Altitude (angle above horizon)
  const sinAltitude =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad);
  const altitudeRad = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));
  let altitude = altitudeRad * (180 / Math.PI);

  // Solar Azimuth (direction along horizon)
  const cosAzimuth =
    (Math.sin(decRad) * Math.cos(latRad) -
      Math.cos(decRad) * Math.sin(latRad) * Math.cos(hourRad)) /
    Math.cos(altitudeRad);
  let azimuthRad = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)));
  let azimuth = azimuthRad * (180 / Math.PI);

  if (hourAngle > 0) {
    azimuth = 360 - azimuth;
  }

  // Adjust for below horizon
  if (altitude < 0) {
    altitude = 0;
  }

  // Estimate peak sun hours based on latitude (lower latitudes closer to equator generally get higher peak hours)
  const absLat = Math.abs(latitude);
  let peakHours = 5.2; // default
  if (absLat < 15) peakHours = 5.5; // Tropical zones e.g., Yangon
  else if (absLat >= 15 && absLat < 30) peakHours = 6.0; // Desert/Arid belt e.g. Phoenix
  else if (absLat >= 30 && absLat < 45) peakHours = 4.8; // Mid-latitude
  else peakHours = 3.8; // High-latitudes

  return {
    altitude: Math.round(altitude * 10) / 10,
    azimuth: Math.round(azimuth * 10) / 10,
    peakSunHours: peakHours,
  };
}

/**
 * Solves mathematical calculations locally as a high-fidelity backup
 */
export function calculateSolarMetrics(survey: Partial<SolarSurvey>) {
  const pitch = survey.roofMeasurements?.pitchDegrees ?? 30;
  const azimuth = survey.roofMeasurements?.azimuthDegrees ?? 180;
  const shading = survey.siteSurvey?.shadingPercent ?? 0;
  const area = survey.roofMeasurements?.installAreaSqFt ?? 800;
  const avgBill = survey.energyConsumption?.avgMonthlyBill ?? 450000;
  const avgKwh = survey.energyConsumption?.avgMonthlyKwh ?? (avgBill / 120);

  // High-fidelity factor adjustments
  const azimuthRad = (azimuth - 180) * (Math.PI / 180);
  const pitchRad = pitch * (Math.PI / 180);

  // Orientation efficiency offset (South is optimal, East/West gets 15-20% drop, North gets 35-40% drop)
  const diffFromSouth = Math.min(Math.abs(azimuth - 180), 360 - Math.abs(azimuth - 180));
  const orientationFactor = Math.max(0.55, 1.0 - (diffFromSouth / 180) * 0.40);

  // Slant angle cosine adjustment
  const slantFactor = Math.max(0.9, Math.cos(pitchRad - 0.26)); // optimum slant is lat - 15 degrees (~15-30 deg)

  // Shading mitigations
  const safetyShadingFactor = Math.max(0.1, 1.0 - (shading / 100) * 0.80);

  // Premium 400W cell size is roughly 17.5 sq ft
  const panelsPerSqFtLimit = Math.floor(area / 18);

  const yearlyUsageKwh = avgKwh * 12;
  // We assume normal generation in US/Tropics gets approx 1380 kWh per installed kWe, corrected by physical metrics
  const unitKwhYield = 1420 * orientationFactor * slantFactor * safetyShadingFactor;

  // System target Size to cover 100% consumption
  const idealKwSystem = yearlyUsageKwh / unitKwhYield;

  // Limit layout by roof boundary
  const recommendedKw = Math.round(Math.min(idealKwSystem, (panelsPerSqFtLimit * 0.4)) * 10) / 10;
  const finalPanelCount = Math.max(2, Math.ceil((recommendedKw * 1000) / 400));
  const exactSystemRatingKw = (finalPanelCount * 400) / 1000;

  const estimatedYearlyKwh = Math.round(exactSystemRatingKw * unitKwhYield);

  // Average capital costs in MMK (approx 3,500 MMK per Watt turnkey)
  const unitCostW = 3500; 
  const totalCost = exactSystemRatingKw * 1000 * unitCostW;
  const federalIncentive = totalCost * 0.30; // standard duty exception or incentive
  const netCost = totalCost - federalIncentive;
  const yearlySavings = Math.round(Math.min(yearlyUsageKwh, estimatedYearlyKwh) * 500); // ~500 MMK/kWh savings rate
  const payback = yearlySavings > 0 ? Math.round((netCost / yearlySavings) * 10) / 10 : 7.5;

  let suitability: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
  if (shading < 12 && orientationFactor > 0.85) suitability = 'excellent';
  else if (shading > 45 || orientationFactor < 0.65) suitability = 'fair';
  else if (shading > 70) suitability = 'poor';

  const CO2OffsetTons = Math.round((estimatedYearlyKwh * 0.0004) * 10) / 10; // 0.4kg/kWh
  const treesPlantedEquivalent = Math.round(CO2OffsetTons * 45); // 45 trees per ton of CO2 absorbed in standard cycle

  return {
    suitability,
    recommendedSystemKw: exactSystemRatingKw,
    panelCount: finalPanelCount,
    annualProductionKwh: estimatedYearlyKwh,
    totalCostEstimated: Math.round(totalCost),
    federalIncentive: Math.round(federalIncentive),
    netCost: Math.round(netCost),
    yearlySavings: Math.round(yearlySavings),
    paybackPeriodYears: Math.max(1, payback),
    CO2OffsetTons,
    treesPlantedEquivalent
  };
}

// Sample Survey Templates
export const SAMPLE_SURVEYS: SolarSurvey[] = [
  {
    id: 'survey-yangon-urban',
    createdAt: '2026-06-16T10:00:00Z',
    updatedAt: '2026-06-17T12:00:00Z',
    clientInfo: {
      projectName: 'Yangon Residence Solarization',
      clientName: 'U Thant Thaw',
      email: 'thantthaw@domain.mm',
      phone: '+95 9 123 4567',
      address: '74 Pyay Road, Kamayut Township, Yangon, Myanmar',
      latitude: 16.8256,
      longitude: 96.1345,
      notes: 'Three-story residential concrete property. Flat tile roof with clear Southern view. Owner wants to reduce dependency on generators during active loadshedding times.'
    },
    siteSurvey: {
      shadingSources: ['Trees', 'Water Overheads'],
      shadingPercent: 10,
      gridConnection: 'grid-battery', // Solar panel hybrid configuration
      panelCapacityAmps: 100,
      circuitsSpace: true,
      serviceVoltage: '120/240V',
      structuralCheck: 'good',
      meterType: 'single',
      voltageStabilizer: true,
      voltageRecord: '215V - 235V dynamic fluctuation',
      incomingCableSize: '16mm sq',
      mainBreakerSize: '63A',
      hasGenerator: true,
      generatorSize: '15 kVA Soundproof',
      hasAts: true,
      atsSize: '100A Automatic',
      acCableLengthFeet: '45',
      dcCableLengthFeet: '90',
      solarDbLocation: 'near-main-db',
      wifiAvailable: true
    },
    roofMeasurements: {
      material: 'tile',
      pitchDegrees: 15,
      azimuthDegrees: 180, // True South
      roofAgeYears: 4,
      installAreaSqFt: 1200,
      obstructions: ['Water Tank', 'Pipes'],
      roofType: 'Concrete Tile Slanted',
      shadingIssueDetails: 'Minor shade from nearby teak tree in early morning hours',
      buildingHeightStoreys: '3',
      roofSizeMeasurementFt: '40 x 30'
    },
    energyConsumption: {
      avgMonthlyBill: 850000,
      avgMonthlyKwh: 1250,
      utilityProvider: 'YESC (Yangon Electricity Supply Corporation)',
      monthlyKwhUsage: [1300, 1450, 1600, 1500, 1200, 1100, 1000, 1050, 1100, 1150, 1250, 1300],
      backupTimeRequirementHours: '6 hours general backup',
      outageSchedule: 'Daily scheduled morning rotation 9am to 1pm',
      avgLoadKw: '3.5',
      minLoadKw: '0.8',
      maxLoadKw: '7.5',
      avgUsageKwhPerDay: '41',
      hourlyLoadProfile: 'Peak usage between 6 PM to 10 PM at 6 kW',
      monthlyElectricityBill: '850,000 MMK',
      appliances: [
        { id: 'app-1', name: 'Inverter Aircon (1.5 HP)', qty: 2, powerWatts: 1200, usageHoursPerDay: 8, isAircon: true, startingLoadWatts: 2800 },
        { id: 'app-2', name: 'Refrigerator / Freezer', qty: 1, powerWatts: 250, usageHoursPerDay: 24, isAircon: false, startingLoadWatts: 800 },
        { id: 'app-3', name: 'LED Lights Layout', qty: 15, powerWatts: 12, usageHoursPerDay: 6, isAircon: false, startingLoadWatts: 180 },
        { id: 'app-4', name: 'Water Pump Motor', qty: 1, powerWatts: 750, usageHoursPerDay: 1.5, isAircon: false, startingLoadWatts: 2200 },
        { id: 'app-5', name: 'Smart TV & Soundbar', qty: 2, powerWatts: 150, usageHoursPerDay: 5, isAircon: false, startingLoadWatts: 300 }
      ]
    },
    roofSketch: {
      elements: [
        { id: 'bound-1', type: 'roof-boundary', points: [{ x: 50, y: 50 }, { x: 450, y: 50 }, { x: 450, y: 350 }, { x: 50, y: 350 }], color: '#4b5563', label: 'Main Roof' },
        { id: 'obs-1', type: 'obstruction', points: [{ x: 320, y: 120 }, { x: 380, y: 120 }, { x: 380, y: 180 }, { x: 320, y: 180 }], color: '#ef4444', label: 'Water Tank' }
      ],
      panelLayout: {
        panelWidth: 35,
        panelHeight: 20,
        positions: [
          { x: 80, y: 80, width: 35, height: 20, rotation: 0 },
          { x: 125, y: 80, width: 35, height: 20, rotation: 0 },
          { x: 170, y: 80, width: 35, height: 20, rotation: 0 },
          { x: 215, y: 80, width: 35, height: 20, rotation: 0 },
          { x: 260, y: 80, width: 35, height: 20, rotation: 0 },
          { x: 80, y: 110, width: 35, height: 20, rotation: 0 },
          { x: 125, y: 110, width: 35, height: 20, rotation: 0 },
          { x: 170, y: 110, width: 35, height: 20, rotation: 0 },
          { x: 215, y: 110, width: 35, height: 20, rotation: 0 },
          { x: 260, y: 110, width: 35, height: 20, rotation: 0 }
        ]
      },
      notes: 'Water tank centered in Northeast corner, panels placed in clear zone Southwest.'
    },
    photos: [
      {
        id: 'photo-1',
        title: 'Roof Satellite Layout view',
        category: 'roof',
        dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%231e293b"/><line x1="0" y1="75" x2="200" y2="75" stroke="%23fbbf24" stroke-dasharray="5,5"/><text x="10" y="30" fill="white" font-size="12">Yangon Roof Sketch</text></svg>',
        uploadedAt: '2026-06-16T10:15:00Z'
      }
    ],
    aiRecommendation: {
      suitability: 'excellent',
      suitabilityReason: 'The site features substantial unshaded roof area, an optimal 15-degree tilt facing pure South, and high tropical peak sun hours.',
      recommendedSystemKw: 8.0,
      panelCount: 20,
      annualProductionKwh: 12100,
      totalCostEstimated: 28000000,
      federalIncentive: 8400000,
      netCost: 19600000,
      yearlySavings: 6050000,
      paybackPeriodYears: 3.2,
      aiSummaryMarkdown: `### Yangon Residence Solar Project Review

High performance assessment for **U Thant Thaw**:

* **Technical Space Layout Analysis:** Your available roof footprint measures **1,200 sq ft**, with a clean tiled surface and excellent structural integrity. The 15° slope coordinates perfectly with Yangon’s coordinates (16.8° N) to capture optimal sunlight.
* **Shading Audit:** Tree margins are minimal, causing only a ~10% estimated daily shading profile. This will not impede production significantly, but string inverter performance is optimal when paired with optimizers on the East row.
* **Electrical Safety Evaluation:** Your service panel rating is 100A; installing an 8.0 kW premium system requires the installation of a dual-pole breaker. Since grid loadshedding is active, mounting a 10 kWh lithium-iron phosphate battery storage pack is strongly advised to guarantee night and afternoon load offset.
* **Financial Payback Analysis:** The system is estimated to deliver **12,100 kWh** annually, keeping active battery systems charged and mitigating utility costs. Payback period stands at **3.2 years** with local duty exemptions.`,
      generatedAt: '2026-06-17T12:00:00Z'
    }
  },
  {
    id: 'survey-phoenix-residential',
    createdAt: '2026-06-17T14:00:00Z',
    updatedAt: '2026-06-18T01:10:00Z',
    clientInfo: {
      projectName: 'Phoenix Solar Heat Recovery',
      clientName: 'Sarah Jenkins',
      email: 'sarah.jenkins@gmail.com',
      phone: '+1 602 555 7890',
      address: '2412 Desert Vista Way, Phoenix, AZ 85012',
      latitude: 33.4484,
      longitude: -112.0740,
      notes: 'Single story ranch home. Tile roof needing zero shading work. Extremely high summer usage due to central AC running continuously.'
    },
    siteSurvey: {
      shadingSources: ['None'],
      shadingPercent: 0,
      gridConnection: 'net-metering',
      panelCapacityAmps: 200,
      circuitsSpace: true,
      serviceVoltage: '120/240V',
      structuralCheck: 'good',
      meterType: 'single',
      voltageStabilizer: false,
      voltageRecord: '121V constant',
      incomingCableSize: '4/0 AWG Aluminum',
      mainBreakerSize: '200A',
      hasGenerator: false,
      generatorSize: '',
      hasAts: false,
      atsSize: '',
      acCableLengthFeet: '35',
      dcCableLengthFeet: '75',
      solarDbLocation: 'near-main-db',
      wifiAvailable: true
    },
    roofMeasurements: {
      material: 'tile',
      pitchDegrees: 24,
      azimuthDegrees: 165, // South-Southeast
      roofAgeYears: 2,
      installAreaSqFt: 650,
      obstructions: ['AC unit Vents'],
      roofType: 'Concrete Tile Slanted',
      shadingIssueDetails: 'None. Completely unshaded desert roof.',
      buildingHeightStoreys: '1',
      roofSizeMeasurementFt: '45 x 25'
    },
    energyConsumption: {
      avgMonthlyBill: 1020000,
      avgMonthlyKwh: 1950,
      utilityProvider: 'APS (Arizona Public Service)',
      monthlyKwhUsage: [1100, 1050, 1300, 1600, 2400, 2900, 3100, 2950, 2500, 1800, 1400, 1200],
      backupTimeRequirementHours: '0',
      outageSchedule: 'Extremely rare major outages',
      avgLoadKw: '5.2',
      minLoadKw: '1.2',
      maxLoadKw: '12.5',
      avgUsageKwhPerDay: '64',
      hourlyLoadProfile: 'AC cycling in late afternoon can draw up to 8kW peak',
      monthlyElectricityBill: 'Avg 1,020,000 MMK (450,000 MMK Cool Season / 1,650,000 MMK Hot Season)'
    },
    roofSketch: {
      elements: [
        { id: 'bound-1', type: 'roof-boundary', points: [{ x: 80, y: 70 }, { x: 380, y: 70 }, { x: 380, y: 310 }, { x: 80, y: 310 }], color: '#4b5563', label: 'Main pitch' }
      ],
      panelLayout: {
        panelWidth: 35,
        panelHeight: 20,
        positions: [
          { x: 100, y: 100, width: 35, height: 20, rotation: 0 },
          { x: 145, y: 100, width: 35, height: 20, rotation: 0 },
          { x: 190, y: 100, width: 35, height: 20, rotation: 0 },
          { x: 100, y: 130, width: 35, height: 20, rotation: 0 },
          { x: 145, y: 130, width: 35, height: 20, rotation: 0 },
          { x: 190, y: 130, width: 35, height: 20, rotation: 0 }
        ]
      },
      notes: 'Panel layout maximized on South-facing pitch.'
    },
    photos: []
  }
];
