/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SolarSurvey } from '../types';
import { calculateSolarMetrics, calculateSolarAngles, SolarAngles } from '../utils';
import { Sun, Leaf, Percent, Award, Landmark, TrendingUp, Compass, Calendar, Clock, DollarSign, Zap, TrendingDown } from 'lucide-react';

interface SolarCalculatorsProps {
  survey: Partial<SolarSurvey>;
}

export const SolarCalculators: React.FC<SolarCalculatorsProps> = ({ survey }) => {
  // Local Time calculator variables
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [solarAngles, setSolarAngles] = useState<SolarAngles>({ altitude: 45, azimuth: 180, peakSunHours: 5.2 });

  // Compute metrics based on survey inputs in real-time
  const metrics = calculateSolarMetrics(survey);

  // Re-run solar position formulas if date, time, or client coordinates change
  useEffect(() => {
    const lat = survey.clientInfo?.latitude || 16.8256;
    const lng = survey.clientInfo?.longitude || 96.1345;
    const angles = calculateSolarAngles(lat, lng, selectedDate, selectedTime);
    setSolarAngles(angles);
  }, [selectedDate, selectedTime, survey.clientInfo?.latitude, survey.clientInfo?.longitude]);

  return (
    <div className="space-y-4 text-slate-900">
      {/* Real-time Engineering Projections header */}
      <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-400 rounded-full"></span>
          REAL-TIME SURVEY ESTIMATION & SITE SOLAR PHYSICS
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">Thermodynamics & payback models</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Bento Column 1: Solar System Size recommended */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">System Sizing Recommended</span>
            <div className="rounded bg-amber-50 p-1 text-amber-600">
              <Sun className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-850 font-mono tracking-tight block">
              {metrics.recommendedSystemKw} <span className="text-xs font-semibold text-slate-400">kW DC</span>
            </span>
            <span className="mt-0.5 text-[10px] text-slate-500 block">
              Assuming **{metrics.panelCount}** Premium 400W Cells
            </span>
          </div>
          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 leading-none flex gap-1.5 items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Area: **{survey.roofMeasurements?.installAreaSqFt ?? 800} sq ft**
          </div>
        </div>

        {/* Bento Column 2: Annual Generation potential */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Annual Output Yield</span>
            <div className="rounded bg-slate-100 p-1 text-slate-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-850 font-mono tracking-tight block">
              {metrics.annualProductionKwh.toLocaleString()} <span className="text-xs font-semibold text-slate-400">kWh/Yr</span>
            </span>
            <span className="mt-0.5 text-[10px] text-slate-500 block">
              Reduces electrical load by approx{' '}
              <span className="font-bold text-emerald-600">
                {Math.min(
                  100,
                  Math.round(
                    (metrics.annualProductionKwh /
                      ((survey.energyConsumption?.avgMonthlyKwh ?? 600) * 12)) *
                      100
                  ) || 0
                )}
                %
              </span>
            </span>
          </div>
          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 flex gap-1.5 items-center leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Insolation: **{solarAngles.peakSunHours} hrs/day**
          </div>
        </div>

        {/* Bento Column 3: Payback period ROI */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Capital Payback Timeline</span>
            <div className="rounded bg-emerald-50 p-1 text-emerald-600">
              <Percent className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-850 font-mono tracking-tight block">
              {metrics.paybackPeriodYears} <span className="text-xs font-bold text-emerald-600">Years ROI</span>
            </span>
            <span className="mt-0.5 text-[10px] text-slate-500 block">
              Amortized equipment rates index
            </span>
          </div>
          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 flex gap-1.5 items-center leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Savings: **Ks {metrics.yearlySavings.toLocaleString()}/yr**
          </div>
        </div>
      </div>

      {/* Dynamic Solar Energy Output & Bill Savings Comparison Widget */}
      {(() => {
        const avgBill = survey.energyConsumption?.avgMonthlyBill ?? 450000;
        const avgKwh = survey.energyConsumption?.avgMonthlyKwh ?? (avgBill / 120);
        const weeklyYieldKwh = Math.round(metrics.annualProductionKwh / 52.14);
        const billReductionPercent = Math.min(100, Math.round((metrics.yearlySavings / (avgBill * 12 || 1)) * 100));
        const estimatedNewMonthlyBill = Math.max(0, Math.round(avgBill - (metrics.yearlySavings / 12)));
        const gridIndependencePercent = Math.min(100, Math.round((metrics.annualProductionKwh / (avgKwh * 12 || 1)) * 100));

        return (
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-1.5 bg-amber-50 rounded text-amber-500">
                <Zap className="h-4 w-4 fill-amber-50" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Solar Energy Yield Output & Bill Savings Comparison
                </h3>
                <p className="text-[9px] text-slate-400">
                  Comprehensive performance yields parsed sequentially against Myanmar (MMK) tariff slab savings.
                </p>
              </div>
            </div>

            {/* 1. Solar Energy Yield Outputs Block */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded p-3 text-center space-y-1 shadow-2xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Peak Solar Capacity</span>
                <div className="text-lg font-black font-mono text-amber-600">
                  {metrics.recommendedSystemKw.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">kWh / hr</span>
                </div>
                <p className="text-[8px] leading-tight text-slate-400">
                  Maximum dynamic power produced under ideal astronomical solar conditions.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded p-3 text-center space-y-1 shadow-2xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Weekly Output Yield</span>
                <div className="text-lg font-black font-mono text-amber-600">
                  {weeklyYieldKwh.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">kWh / week</span>
                </div>
                <p className="text-[8px] leading-tight text-slate-400">
                  Aggregate weekly generation averaged across dual seasonal weather profiles.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded p-3 text-center space-y-1 shadow-2xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Annual Production</span>
                <div className="text-lg font-black font-mono text-emerald-600">
                  {metrics.annualProductionKwh.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">kWh / year</span>
                </div>
                <p className="text-[8px] leading-tight text-slate-400">
                  Total thermodynamic green energy produced across the local annual orbit.
                </p>
              </div>
            </div>

            {/* 2. Side-by-Side Savings Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              
              {/* Left Column: Old Bill (Without Solar) */}
              <div className="md:col-span-5 bg-white border border-slate-200 rounded p-3.5 space-y-3 flex flex-col justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter block">
                    Pre-Solar Grid Costs (Without Solar)
                  </span>
                  <div className="font-mono text-slate-800">
                    <span className="text-lg font-black">Ks {avgBill.toLocaleString()}</span>
                    <span className="text-[9px] font-bold block text-slate-400 leading-none">Monthly Average Expenses</span>
                  </div>
                </div>

                <div className="space-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                  <div className="flex justify-between font-mono">
                    <span>Annual Cost:</span>
                    <span className="font-bold text-slate-700">Ks {(avgBill * 12).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Annual Load:</span>
                    <span className="font-bold text-slate-700">{Math.round(avgKwh * 12).toLocaleString()} kWh</span>
                  </div>
                  <div className="text-[8px] text-red-500 font-bold mt-1 leading-tight">
                    * Locked into high-rate cascading tiers of utility provider.
                  </div>
                </div>
              </div>

              {/* Center Column: Savings Rate */}
              <div className="md:col-span-2 flex flex-col items-center justify-center text-center p-3 rounded-md bg-amber-50 border border-amber-200 min-h-[120px] shadow-sm">
                <TrendingDown className="h-5 w-5 text-emerald-600 animate-bounce" />
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter mt-1.5 block leading-none">
                  Saves Rate
                </span>
                <span className="text-lg font-black text-emerald-600 font-mono tracking-tight leading-none block mt-1">
                  {billReductionPercent}%
                </span>
                <span className="text-[8px] text-slate-400 leading-none block mt-1 font-bold">
                  Expenses Trimmed
                </span>
              </div>

              {/* Box: Post-Solar Costs (With Solar) */}
              <div className="md:col-span-5 bg-emerald-50/20 border border-emerald-200 rounded p-3.5 space-y-3 flex flex-col justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter block">
                    Optimized Clean Energy (With Solar)
                  </span>
                  <div className="font-mono text-emerald-700">
                    <span className="text-lg font-black">Ks {estimatedNewMonthlyBill.toLocaleString()}</span>
                    <span className="text-[9px] font-bold block text-emerald-600/70 leading-none">Est. New Monthly Bill</span>
                  </div>
                </div>

                <div className="space-y-1 border-t border-emerald-100 pt-2 text-[10px] text-slate-500">
                  <div className="flex justify-between font-mono text-emerald-800">
                    <span>Annual Savings Saved:</span>
                    <span className="font-bold text-emerald-600">Ks {metrics.yearlySavings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Est. New Annual Bill:</span>
                    <span className="font-bold text-slate-700">
                      Ks {Math.max(0, (avgBill * 12) - metrics.yearlySavings).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[8px] text-emerald-600 font-bold mt-1 leading-tight">
                    * 30% Net standard Duty exempt offsets factored.
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Expected Energy Self-Sufficiency Progress Index */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                <span>Total Net Grid Independence Ratio</span>
                <span className="text-emerald-600 font-mono">
                  {gridIndependencePercent}% Solar Autonomy
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${gridIndependencePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-bold text-slate-400">
                <span>100% Utility Grid Reliant</span>
                <span>Mixed Multi-Source Generation</span>
                <span className="text-emerald-600">100% Net Zero Energy Autonomy</span>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Box: Financial Ledger Sheet & Outlay details */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-display text-xs font-bold uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5 text-amber-500" /> Financial Projections & Incentives
          </h3>
          <p className="text-[9px] text-slate-400 mt-0.5">Calculates equipment incentives based on standard 30% duty and import exemptions.</p>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-600">Estimated Turnkey Equipment & Labor Cost:</span>
              <span className="font-mono font-bold text-slate-900">Ks {metrics.totalCostEstimated.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-emerald-700">
              <span className="font-semibold flex items-center gap-1">
                <Award className="h-3 w-3" /> Standard Duty & Tax Relief Incentive (30% Net):
              </span>
              <span className="font-mono font-bold">-Ks {metrics.federalIncentive.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-bold">
              <span className="text-slate-900">Total Net System out-of-pocket Capital:</span>
              <span className="font-mono text-amber-700">Ks {metrics.netCost.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-emerald-700 font-semibold">
              <span className="font-medium">Expected Utility Bill Reductions (Yr 1):</span>
              <span className="font-mono">+Ks {metrics.yearlySavings.toLocaleString()} / Yr</span>
            </div>
          </div>

          {/* Graphical timeline illustration of savings payback */}
          <div className="mt-4 space-y-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Payback Timeline Progress Array (20 Years)</span>
            <div className="flex h-4 items-stretch rounded overflow-hidden bg-slate-100 border border-slate-200">
              <div
                className="bg-emerald-500 text-white text-[8px] font-bold font-sans flex items-center justify-center transition-all duration-300"
                style={{ width: `${Math.min(100, (metrics.paybackPeriodYears / 20) * 100)}%` }}
              >
                Capital Payback
              </div>
              <div className="bg-slate-900 text-white text-[8px] font-bold font-sans flex items-center justify-center flex-1">
                Net Profit Zone
              </div>
            </div>
            <div className="flex justify-between text-[8px] font-bold text-slate-400">
              <span>Year 0 (Install)</span>
              <span className="text-emerald-600">Year {metrics.paybackPeriodYears} (Payback)</span>
              <span>Year 20+</span>
            </div>
          </div>
        </div>

        {/* Box: Specific Solar Angle Instrument */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-display text-xs font-bold uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-amber-500" /> Solar Incident Positioning Instrument
          </h3>
          <p className="text-[9px] text-slate-400 mt-0.5">Precise incident sun clearance angles at current client geolocation points.</p>

          <div className="mt-2.5 grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Set Analysis Date
              </label>
              <input
                type="date"
                className="w-full border-b border-slate-200 py-0.5 text-xs outline-none bg-transparent"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Solar Hour Clock
              </label>
              <input
                type="time"
                className="w-full border-b border-slate-200 py-0.5 text-xs outline-none bg-transparent"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3.5">
            <div className="rounded border border-slate-200 bg-slate-50/50 p-2 text-center">
              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-tighter">Elevation (Altitude)</span>
              <span className="text-sm font-mono font-black text-slate-800">{solarAngles.altitude}°</span>
              <p className="text-[8px] leading-tight text-slate-400 mt-1">Horizon angle (0° dusk, 90° overhead)</p>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50/50 p-2 text-center">
              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-tighter">Solar Azimuth Angle</span>
              <span className="text-sm font-mono font-black text-slate-800">{solarAngles.azimuth}°</span>
              <p className="text-[8px] leading-tight text-slate-400 mt-1">Compass direction (180° points South)</p>
            </div>
          </div>

          {/* Environmental carbon emissions counters */}
          <div className="mt-3.5 border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1">
              <Leaf className="h-3.5 w-3.5 text-emerald-500" /> Carbon offset profile:
            </span>
            <div className="flex gap-2.5 text-[10px] font-bold">
              <div className="text-emerald-700">
                <span>{metrics.CO2OffsetTons} Tons CO₂ / yr</span>
              </div>
              <div className="text-slate-800">
                <span>{metrics.treesPlantedEquivalent} Trees / yr</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
