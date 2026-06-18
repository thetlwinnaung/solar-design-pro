/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClientInfo {
  projectName: string;
  clientName: string;
  email: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  notes: string;
}

export type GridConnectionType = 'net-metering' | 'grid-battery' | 'off-grid';
export type StructuralCondition = 'good' | 'reinforce' | 'unknown';
export type ServiceVoltage = '120/240V' | '120/208V' | '277/480V';

export interface SiteSurveyData {
  shadingSources: string[]; // ['Trees', 'Chimney', 'Adjacent Buildings', 'None']
  shadingPercent: number; // 0 to 100
  gridConnection: GridConnectionType;
  panelCapacityAmps: number; // 100, 150, 200, 400
  circuitsSpace: boolean;
  serviceVoltage: ServiceVoltage;
  structuralCheck: StructuralCondition;
  
  // Additional requested inputs
  meterType?: 'single' | 'power';
  voltageStabilizer?: boolean;
  voltageRecord?: string;
  incomingCableSize?: string;
  mainBreakerSize?: string;
  hasGenerator?: boolean;
  generatorSize?: string;
  hasAts?: boolean;
  atsSize?: string;
  acCableLengthFeet?: string; // string or number, string is safer for user typing
  dcCableLengthFeet?: string; // string or number
  solarDbLocation?: string;   // e.g., 'near-main-db' or 'separate'
  wifiAvailable?: boolean;
}

export type RoofMaterial = 'asphalt-shingle' | 'metal-seam' | 'tile' | 'flat-tpo' | 'slate' | 'other';
export type SolarOrientation = 'S' | 'SE' | 'SW' | 'E' | 'W' | 'NE' | 'NW' | 'N';

export interface RoofMeasurements {
  material: RoofMaterial;
  pitchDegrees: number; // Slope angle (0 - 60)
  azimuthDegrees: number; // Direction (0 - 360)
  roofAgeYears: number;
  installAreaSqFt: number; // Usable space for solar panel rows
  obstructions: string[]; // ['Skylights', 'Vents', 'Chimneys']
  
  // Additional requested inputs
  roofType?: string; // Roof structure style or specific type
  shadingIssueDetails?: string; // Shading issue details text
  buildingHeightStoreys?: string; // Storey height
  roofSizeMeasurementFt?: string; // e.g. "40 x 50"
}

export interface ApplianceLoad {
  id: string;
  name: string;
  qty: number;
  powerWatts: number;
  usageHoursPerDay: number;
  isAircon: boolean;
  startingLoadWatts?: number; // Starting Load assuming the Aircon with starting load (peak/surge)
}

export interface EnergyConsumption {
  avgMonthlyBill: number; // in MMK
  avgMonthlyKwh: number; // active kWh
  utilityProvider: string;
  monthlyKwhUsage: number[]; // 12 numbers representing Jan to Dec
  
  // Additional requested inputs
  backupTimeRequirementHours?: string; // Back Up Time Requirement
  outageSchedule?: string; // Electrical Outage Schedule
  avgLoadKw?: string; // Average Load Usage
  minLoadKw?: string; // Minimum Load
  maxLoadKw?: string; // Maximum Load
  avgUsageKwhPerDay?: string; // Average Usage per day
  hourlyLoadProfile?: string; // Load per Hrs in Kw
  monthlyElectricityBill?: string; // Monthly Electricity Bill
  appliances?: ApplianceLoad[];
}

export interface DrawingElement {
  id: string;
  type: 'roof-boundary' | 'obstruction' | 'panel-array';
  points: { x: number; y: number }[];
  color: string;
  label?: string;
}

export interface SolarPanelLayout {
  panelWidth: number; // Custom panel width pixels
  panelHeight: number; // Custom panel height pixels
  positions: { x: number; y: number; width: number; height: number; rotation: number }[];
}

export interface RoofSketch {
  backgroundImageUrl?: string; // Uploaded roof canvas helper
  elements: DrawingElement[];
  panelLayout: SolarPanelLayout;
  notes: string;
}

export interface AiRecommendation {
  suitability: 'excellent' | 'good' | 'fair' | 'poor';
  suitabilityReason: string;
  recommendedSystemKw: number;
  panelCount: number;
  annualProductionKwh: number;
  totalCostEstimated: number;
  federalIncentive: number;
  netCost: number;
  yearlySavings: number;
  paybackPeriodYears: number;
  aiSummaryMarkdown: string;
  generatedAt: string;
}

export interface PhotoAsset {
  id: string;
  title: string;
  category: 'roof' | 'electrical' | 'bill' | 'site' | 'sketch';
  dataUrl: string; // base64 representation or source url
  uploadedAt: string;
}

export interface SolarSurvey {
  id: string;
  createdAt: string;
  updatedAt: string;
  clientInfo: ClientInfo;
  siteSurvey: SiteSurveyData;
  roofMeasurements: RoofMeasurements;
  energyConsumption: EnergyConsumption;
  roofSketch: RoofSketch;
  photos: PhotoAsset[];
  aiRecommendation?: AiRecommendation;
}
