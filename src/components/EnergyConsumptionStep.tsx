/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EnergyConsumption } from '../types';
import { Calendar, Info, TrendingUp, DollarSign, Zap, Calculator } from 'lucide-react';
import { ApplianceLoadCalculator } from './ApplianceLoadCalculator';

interface EnergyConsumptionStepProps {
  data: EnergyConsumption;
  onChange: (fields: Partial<EnergyConsumption>) => void;
}

const MONTHS_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LOAD_PROFILES = [
  {
    name: 'Summer Peak (A/C)',
    desc: 'Heavy cooling loads (e.g., Phoenix, Texas)',
    pattern: [1000, 950, 1100, 1400, 2000, 2600, 2900, 2750, 2100, 1500, 1200, 1050],
    avgBill: 750000,
    avgKwh: 1710
  },
  {
    name: 'Dual Peak (Heating + A/C)',
    desc: 'Severe Winters + Hot Summers',
    pattern: [1500, 1300, 1100, 900, 1000, 1400, 1800, 1750, 1200, 1000, 1100, 1400],
    avgBill: 570000,
    avgKwh: 1300
  },
  {
    name: 'Continuous Flat load',
    desc: 'Moderate climates & constant loads (e.g., Tropical, Yangon)',
    pattern: [1100, 1150, 1200, 1250, 1200, 1150, 1100, 1120, 1150, 1120, 1100, 1080],
    avgBill: 500000,
    avgKwh: 1150
  }
];

export const EnergyConsumptionStep: React.FC<EnergyConsumptionStepProps> = ({ data, onChange }) => {
  const [calcUnits, setCalcUnits] = React.useState<number>(data.avgMonthlyKwh || 194);

  // Keep calculator in sync with average kwh from the survey, if available
  React.useEffect(() => {
    if (data.avgMonthlyKwh) {
      setCalcUnits(data.avgMonthlyKwh);
    }
  }, [data.avgMonthlyKwh]);

  const calculateMmkBill = (units: number) => {
    const u = Math.max(0, units);
    const c1 = Math.min(50, u) * 50;
    const c2 = Math.min(50, Math.max(0, u - 50)) * 100;
    const c3 = Math.max(0, u - 100) * 150;
    const total = c1 + c2 + c3;
    return {
      c1,
      c2,
      c3,
      u1: Math.min(50, u),
      u2: Math.min(50, Math.max(0, u - 50)),
      u3: Math.max(0, u - 100),
      total
    };
  };

  const billBreakdown = calculateMmkBill(calcUnits);

  const handleApplyBillToSurvey = () => {
    onChange({
      avgMonthlyKwh: calcUnits,
      avgMonthlyBill: billBreakdown.total,
    });
  };

  const handleLoadProfileSelect = (profile: typeof LOAD_PROFILES[0]) => {
    onChange({
      avgMonthlyBill: profile.avgBill,
      avgMonthlyKwh: profile.avgKwh,
      monthlyKwhUsage: [...profile.pattern]
    });
  };

  const handleMonthValChange = (index: number, val: number) => {
    const usage = [...(data.monthlyKwhUsage || Array(12).fill(600))];
    usage[index] = Math.max(0, val);
    
    // Auto-update average consumption
    const total = usage.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / 12);

    onChange({
      monthlyKwhUsage: usage,
      avgMonthlyKwh: avg
    });
  };

  const maxVal = Math.max(100, ...(data.monthlyKwhUsage || Array(12).fill(600)));

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-400 rounded-full"></span>
          HISTORICAL ENERGY CONSUMPTION ANALYSIS
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">Monthly bills & consumption target</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-slate-950">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Average Monthly Bill (MMK)</label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full border-b border-slate-200 py-1 pr-10 text-xs focus:border-amber-400 bg-transparent outline-none transition-colors"
                  placeholder="e.g. 450000"
                  value={data.avgMonthlyBill || ''}
                  onChange={(e) => onChange({ avgMonthlyBill: parseInt(e.target.value) || 0 })}
                />
                <span className="absolute inset-y-0 right-0 flex items-center text-slate-400 text-[10px] font-bold">
                  MMK
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Utility Grid Provider</label>
              <div className="relative">
                <select
                  className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent outline-none transition-colors"
                  value={data.utilityProvider}
                  onChange={(e) => onChange({ utilityProvider: e.target.value })}
                >
                  <option value="Standard Public Utility">Standard Public Utility</option>
                  <option value="Arizona Public Service (APS)">APS (Arizona Public Service)</option>
                  <option value="Salt River Project (SRP)">SRP (Salt River Project)</option>
                  <option value="YESC (Yangon Utility)">YESC (Yangon Electricity)</option>
                  <option value="MESC (Mandalay Utility)">MESC (Mandalay Electricity)</option>
                  <option value="FPL (Florida Power)">FPL (Florida Power & Light)</option>
                  <option value="Southern California Edison">SCE (Southern California Edison)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Load Profiles Macro Selection */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Quick-Load Consumption Patterns:</span>
            <div className="grid grid-cols-1 gap-1.5">
              {LOAD_PROFILES.map((prof) => (
                <button
                  key={prof.name}
                  type="button"
                  onClick={() => handleLoadProfileSelect(prof)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-amber-400 transition-colors cursor-pointer outline-none"
                >
                  <div className="max-w-[75%]">
                    <span className="text-xs font-bold text-slate-800 block">{prof.name}</span>
                    <span className="text-[9px] leading-tight text-slate-400 block">{prof.desc}</span>
                  </div>
                  <div className="text-right text-[10px]">
                    <span className="font-mono font-bold text-slate-800 block">{prof.avgKwh} kWh/mo</span>
                    <span className="text-[9px] text-slate-400 block">Bill: {prof.avgBill.toLocaleString()} MMK</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex gap-2.5">
              <Info className="h-4.5 w-4.5 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-600 leading-normal">
                <span className="font-bold text-slate-800 block">Why historical usage is critical:</span>
                Solar output is selective to daytime. High energy demands in specific tariff cycles might necessitate hybrid battery blocks or specific off-grid options.
              </div>
            </div>
          </div>
        </div>

        {/* Visual Monthly consumption Bar Graph via SVG */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block mb-2">Usage Curve (Historical Monthly KWh)</span>
          
          <div className="flex-1 relative flex items-end justify-between h-28 border-b border-slate-100 pb-1.5 px-1">
            {/* Draw Vertical background scale markers */}
            <div className="absolute inset-y-0 left-0 pr-1 flex flex-col justify-between text-[8px] text-slate-400 font-mono w-full pointer-events-none">
              <div className="border-t border-slate-100/70 w-full pt-0.5 text-right">{maxVal} kWh</div>
              <div className="border-t border-slate-100/70 w-full pt-0.5 text-right">{Math.round(maxVal / 2)} kWh</div>
              <div className="border-t border-slate-100/70 w-full pt-0.5 text-right">0 kWh</div>
            </div>

            {/* Render Bars */}
            {(data.monthlyKwhUsage || Array(12).fill(600)).map((val, idx) => {
              const heightPct = (val / maxVal) * 90; // max out at 90%
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group z-10">
                  <div className="absolute opacity-0 group-hover:opacity-100 bg-slate-800 text-white rounded px-1.5 py-0.5 text-[9px] font-mono transition-opacity -top-8 shadow-md">
                    {val} kWh
                  </div>
                  <div
                    className="w-3 bg-amber-400 hover:bg-amber-500 rounded-t-sm transition-all duration-300 ease-out cursor-pointer"
                    style={{ height: `${heightPct}%`, minHeight: '3px' }}
                  />
                  <span className="text-[9px] text-slate-400 font-bold mt-1 scale-90">{MONTHS_LABELS[idx]}</span>
                </div>
              );
            })}
          </div>

          {/* Interactive Input grid for 12 months */}
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {MONTHS_LABELS.map((m, idx) => (
              <div key={m} className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">{m} (kWh)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs text-center font-mono focus:bg-white focus:border-amber-400 outline-none"
                  value={(data.monthlyKwhUsage || Array(12).fill(600))[idx] || ''}
                  onChange={(e) => handleMonthValChange(idx, parseInt(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>

          {/* Average statistics footer */}
          <div className="mt-3 border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-400 text-[9px] uppercase font-bold">Annual Target Net Consumption:</span>
            <span className="font-mono font-bold text-slate-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              {((data.monthlyKwhUsage || Array(12).fill(600)).reduce((a, b) => a + b, 0)).toLocaleString()} kWh / yr
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic, Precise Myanmar Kyat (MMK) Tiered Tariff Slab Calculator */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 rounded text-amber-500">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                Myanmar (MMK) Tiered Tariff Slab Calculator
              </h3>
              <p className="text-[9px] text-slate-400">
                Calculates precise multi-tiered billing by sequentially cascading units into slabs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCalcUnits(194)}
              className="px-2 py-1 text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
            >
              Preset: 194 Units
            </button>
            <button
              type="button"
              onClick={() => setCalcUnits(300)}
              className="px-2 py-1 text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
            >
              Preset: 300 Units
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Controls Panel */}
          <div className="md:col-span-5 space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">
                Total Monthly Units (kWh / Units)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="10000"
                  className="w-full rounded border border-slate-200 px-3 py-1.5 pr-14 text-sm font-mono focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all"
                  value={calcUnits}
                  onChange={(e) => setCalcUnits(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-[10px] font-bold leading-none">
                  Units
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block">
                Interactive Range Slider
              </label>
              <input
                type="range"
                min="0"
                max="500"
                className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                value={Math.min(500, calcUnits)}
                onChange={(e) => setCalcUnits(parseInt(e.target.value) || 0)}
              />
              <div className="flex justify-between text-[8px] text-slate-400 font-mono font-bold">
                <span>0</span>
                <span>50</span>
                <span>100</span>
                <span>200</span>
                <span>500+ Units</span>
              </div>
            </div>

            {/* Sync Action */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleApplyBillToSurvey}
                className="w-full py-2 px-3 bg-amber-500 text-white rounded font-sans text-[11px] font-bold shadow-sm hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="h-3 w-3 fill-current" /> Apply This Energy Bill to Survey
              </button>
              <p className="text-[8px] text-slate-400 text-center mt-1 leading-normal">
                Sets average monthly consumption to {calcUnits} Units and average bill to {billBreakdown.total.toLocaleString()} MMK.
              </p>
            </div>
          </div>

          {/* Sequential Tier Breakdown Progress Panel */}
          <div className="md:col-span-7 rounded border border-slate-100 bg-slate-50/50 p-3 space-y-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block border-b border-slate-100 pb-1">
              Sequential Tier Allocation breakdown
            </span>

            {/* Slabs list */}
            <div className="space-y-2.5">
              {/* Tier 1 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    Tier 1 (1 to 50 Units)
                  </span>
                  <span className="font-mono text-slate-500">
                    {billBreakdown.u1} / 50 units × 50 MMK
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(billBreakdown.u1 / 50) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Max Cap: 2,500 MMK</span>
                  <span className="font-bold font-mono text-emerald-600">Ks {billBreakdown.c1.toLocaleString()}</span>
                </div>
              </div>

              {/* Tier 2 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    Tier 2 (51 to 100 Units)
                  </span>
                  <span className="font-mono text-slate-500">
                    {billBreakdown.u2} / 50 units × 100 MMK
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(billBreakdown.u2 / 50) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Max Cap: 5,000 MMK</span>
                  <span className="font-bold font-mono text-amber-600">Ks {billBreakdown.c2.toLocaleString()}</span>
                </div>
              </div>

              {/* Tier 3 */}
              <div className="space-y-1 font-sans">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    Tier 3 (101 to 200+ Units)
                  </span>
                  <span className="font-mono text-slate-500">
                    {billBreakdown.u3} units × 150 MMK
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-700 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (billBreakdown.u3 / 100) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Open-ended sequential block</span>
                  <span className="font-bold font-mono text-slate-800">Ks {billBreakdown.c3.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Total Display */}
            <div className="border-t border-slate-200/60 pt-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Total System Output
                </span>
                <p className="text-[8px] text-slate-400 leading-none">
                  Sum of sequential cascading slabs
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-mono text-slate-900 tracking-tight">
                  Ks {billBreakdown.total.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-400 font-bold block leading-none">MMK / Month</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Power Demand & Outage Backup Requirements */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3.5 mt-4 text-slate-900">
        <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-1.5 uppercase">
          <span className="w-1 h-3 bg-amber-400 rounded-full"></span>
          Consumer Load Ranges & Backup Interruption Survey
        </h3>

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-3">
          {/* Average Load Usage */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Average Base Load (kW)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 3.5 kW"
              value={data.avgLoadKw || ''}
              onChange={(e) => onChange({ avgLoadKw: e.target.value })}
            />
          </div>

          {/* Minimum Load */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Minimum Night/Idle Load (kW)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 0.8 kW"
              value={data.minLoadKw || ''}
              onChange={(e) => onChange({ minLoadKw: e.target.value })}
            />
          </div>

          {/* Maximum Load */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Maximum Peak Load (kW)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 10 kW"
              value={data.maxLoadKw || ''}
              onChange={(e) => onChange({ maxLoadKw: e.target.value })}
            />
          </div>

          {/* Average Usage per Day */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Average Daily Energy Usage (kWh)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 45 kWh/day"
              value={data.avgUsageKwhPerDay || ''}
              onChange={(e) => onChange({ avgUsageKwhPerDay: e.target.value })}
            />
          </div>

          {/* Monthly Electricity Bill */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Localized Monthly Bill Reference</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. MMK 850,000"
              value={data.monthlyElectricityBill || ''}
              onChange={(e) => onChange({ monthlyElectricityBill: e.target.value })}
            />
          </div>

          {/* Back Up Time Requirement */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Required Backup Duration (Hours)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 6 hours during loadshedding"
              value={data.backupTimeRequirementHours || ''}
              onChange={(e) => onChange({ backupTimeRequirementHours: e.target.value })}
            />
          </div>

          {/* Electrical Outage Schedule */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Electrical Outage/Loadshedding Schedule</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. Four-hour rotative outages (9 AM - 1 PM)"
              value={data.outageSchedule || ''}
              onChange={(e) => onChange({ outageSchedule: e.target.value })}
            />
          </div>

          {/* Load per Hrs in Kw */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Hourly Load Profile Distribution</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. Morning: 2kW, Noon: 6kW, Night: 1.5kW"
              value={data.hourlyLoadProfile || ''}
              onChange={(e) => onChange({ hourlyLoadProfile: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Appliance Load Inventory Sizing Table */}
      <ApplianceLoadCalculator
        appliances={data.appliances || []}
        onChange={(newList) => {
          // Calculate running kW sum and energy totals to dynamically sync corresponding survey inputs
          const runningWatts = newList.reduce((sum, item) => sum + (item.powerWatts * item.qty), 0);
          const energyWh = newList.reduce((sum, item) => sum + (item.powerWatts * item.qty * item.usageHoursPerDay), 0);
          
          onChange({
            appliances: newList,
            avgLoadKw: runningWatts > 0 ? (runningWatts / 1000).toFixed(2) : data.avgLoadKw,
            avgUsageKwhPerDay: energyWh > 0 ? (energyWh / 1000).toFixed(2) : data.avgUsageKwhPerDay,
          });
        }}
        backupHours={parseFloat(data.backupTimeRequirementHours || '6') || 6}
      />
    </div>
  );
};
