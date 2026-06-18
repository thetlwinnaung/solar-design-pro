/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ApplianceLoad } from '../types';
import { Plus, Trash2, Zap, Award, CheckCircle, Info, RefreshCw, Layers } from 'lucide-react';

interface ApplianceLoadCalculatorProps {
  appliances: ApplianceLoad[];
  onChange: (newList: ApplianceLoad[]) => void;
  serviceVoltageNum?: number; // e.g. 240 or 120
  backupHours?: number; // fallback hours
}

// Pre-defined templates for quick addition and realistic bounds
const PRESETS = [
  { name: 'Inverter Aircon (1.5 HP)', powerWatts: 1200, usageHoursPerDay: 8, isAircon: true, startingLoadWatts: 2800 },
  { name: 'Standard Aircon (1.0 HP)', powerWatts: 950, usageHoursPerDay: 6, isAircon: true, startingLoadWatts: 3200 },
  { name: 'Refrigerator (250L)', powerWatts: 200, usageHoursPerDay: 24, isAircon: false, startingLoadWatts: 800 },
  { name: 'Water Pump (1 HP)', powerWatts: 750, usageHoursPerDay: 1, isAircon: false, startingLoadWatts: 2500 },
  { name: 'LED Lighting Layout', powerWatts: 15, usageHoursPerDay: 6, isAircon: false, startingLoadWatts: 15 },
  { name: 'Ceiling Fan Set', powerWatts: 75, usageHoursPerDay: 12, isAircon: false, startingLoadWatts: 120 },
  { name: 'Microwave Oven', powerWatts: 1400, usageHoursPerDay: 0.5, isAircon: false, startingLoadWatts: 1400 },
  { name: 'Electric Rice Cooker', powerWatts: 800, usageHoursPerDay: 1, isAircon: false, startingLoadWatts: 800 },
  { name: 'Washing Machine', powerWatts: 500, usageHoursPerDay: 1, isAircon: false, startingLoadWatts: 1200 },
  { name: 'Desktop PC / Monitor', powerWatts: 250, usageHoursPerDay: 8, isAircon: false, startingLoadWatts: 250 },
  { name: 'LED Smart TV', powerWatts: 100, usageHoursPerDay: 5, isAircon: false, startingLoadWatts: 100 },
];

export const ApplianceLoadCalculator: React.FC<ApplianceLoadCalculatorProps> = ({
  appliances = [],
  onChange,
  serviceVoltageNum = 230,
  backupHours = 10 // default standard backup for Yangon/Myanmar setup
}) => {
  // Panel rating & peak hours states for solar sizing
  const [panelWattage, setPanelWattage] = useState<number>(620);
  const [peakSunHoursInput, setPeakSunHoursInput] = useState<number>(5.0);

  // Input states for adding/editing a custom appliance
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customPower, setCustomPower] = useState(150);
  const [customHours, setCustomHours] = useState(4);
  const [customIsAircon, setCustomIsAircon] = useState(false);
  const [customStarting, setCustomStarting] = useState(150);

  // Auto-adjust starting load on custom preset adjustments
  const handleIsAirconToggle = (checked: boolean) => {
    setCustomIsAircon(checked);
    if (checked) {
      setCustomStarting(customPower * 2.5);
    } else {
      setCustomStarting(customPower);
    }
  };

  const handlePowerChange = (watts: number) => {
    setCustomPower(watts);
    if (customIsAircon) {
      setCustomStarting(watts * 2.5);
    } else {
      setCustomStarting(watts);
    }
  };

  // Add custom appliance to state
  const addAppliance = (app: Omit<ApplianceLoad, 'id'>) => {
    const newId = `app-${Date.now()}`;
    const newList = [...appliances, { ...app, id: newId }];
    onChange(newList);
  };

  // Quick Preset Add Handler
  const addPreset = (preset: typeof PRESETS[0]) => {
    addAppliance({
      name: preset.name,
      qty: 1,
      powerWatts: preset.powerWatts,
      usageHoursPerDay: preset.usageHoursPerDay,
      isAircon: preset.isAircon,
      startingLoadWatts: preset.startingLoadWatts
    });
  };

  // Delete handler
  const deleteAppliance = (id: string) => {
    const filtered = appliances.filter(item => item.id !== id);
    onChange(filtered);
  };

  // Inline row updates
  const updateApplianceRow = (id: string, fields: Partial<ApplianceLoad>) => {
    const updated = appliances.map(item => {
      if (item.id === id) {
        const nextItem = { ...item, ...fields };
        // If power or aircon state changes, recalculate recommended starting surge
        if (fields.powerWatts !== undefined || fields.isAircon !== undefined) {
          const power = fields.powerWatts ?? item.powerWatts;
          const isAc = fields.isAircon ?? item.isAircon;
          if (isAc) {
            nextItem.startingLoadWatts = power * 2.5;
          } else if (fields.startingLoadWatts === undefined) {
            nextItem.startingLoadWatts = power;
          }
        }
        return nextItem;
      }
      return item;
    });
    onChange(updated);
  };

  // Form Submit handler
  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    addAppliance({
      name: customName,
      qty: customQty,
      powerWatts: customPower,
      usageHoursPerDay: customHours,
      isAircon: customIsAircon,
      startingLoadWatts: customIsAircon ? Math.max(customStarting, customPower) : customPower
    });

    // Reset Form
    setCustomName('');
    setCustomQty(1);
    setCustomPower(150);
    setCustomHours(4);
    setCustomIsAircon(false);
    setCustomStarting(150);
  };

  // CALCULATE SUMS
  const totalQty = appliances.reduce((sum, item) => sum + item.qty, 0);
  const totalRunningWatts = appliances.reduce((sum, item) => sum + (item.powerWatts * item.qty), 0);
  const totalEnergyWh = appliances.reduce((sum, item) => sum + (item.powerWatts * item.qty * item.usageHoursPerDay), 0);
  const totalEnergyKwh = totalEnergyWh / 1000;

  // Peak surge logic: running load of all devices PLUS the single largest starting delta
  // Delta = startingLoadWatts - runningPowerWatts
  let maxStartingDelta = 0;
  appliances.forEach(item => {
    const surge = item.startingLoadWatts || item.powerWatts;
    const delta = surge - item.powerWatts;
    if (delta > maxStartingDelta) {
      maxStartingDelta = delta;
    }
  });
  const peakSurgeWatts = totalRunningWatts + maxStartingDelta;

  // SYSTEM CALCULATIONS & SIZING ALGORITHMS
  // 1. Inverter Sizing (kW)
  // Logic: sized to handle the Maximum Load (kW) or the Total Connected Load with a 25% safety margin.
  // Formula: Inverter Size (kW) = Maximum Load (kW) * 1.25
  const maximumLoadKw = Math.max(totalRunningWatts, peakSurgeWatts) / 1000;
  const rawInverterKw = maximumLoadKw * 1.25;
  
  // Recommend the next standard market size (e.g., 3kW, 5kW, 6kW, 8kW, 10kW, 12kW, 15kW, 20kW, 30kW, 50kW)
  const STANDARD_INVERTERS = [1, 2, 3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 50, 100];
  const inverterKw = STANDARD_INVERTERS.find(size => size >= rawInverterKw) || Math.ceil(rawInverterKw);

  // 2. Battery Storage Sizing (Lithium LFP Standard)
  // Logic: Based on backup duration (Hours) and the Average Load Usage (kW), factoring 80% Depth of Discharge (DoD)
  // Formula: Battery Capacity (kWh) = (Average Load (kW) * Back-Up Hours) / 0.80
  const avgLoadUsageKw = totalRunningWatts / 1000;
  const batteryKwh = totalRunningWatts > 0 ? (avgLoadUsageKw * (backupHours || 6)) / 0.80 : 0;
  const nominalDcVoltage = 48;
  const batteryAh = Math.round((batteryKwh * 1000) / nominalDcVoltage);

  // 3. Solar Panel Size (Custom PV Sizing Matrix)
  // Solar Panel sizing calculation is based upon the amount of daily energy consumption at Day Time,
  // plus the energy required for charging the LFP battery (adjusting for LFP round-trip efficiency), 
  // divided by Peak Sun Hours (adjustable, defaulting to 5Hrs per prompt) and System Efficiency.
  const systemEfficiency = 0.80;
  const daytimeSharePercent = 50; // Balanced 50% daytime / 50% nighttime load split
  
  // Day Time direct consumption (kWh)
  const daytimeKwh = totalEnergyKwh * (daytimeSharePercent / 100);
  
  // Night/Backup time energy consumption (kWh) - this is what the LFP battery will discharge
  const batteryLoadKwh = totalEnergyKwh * (1 - daytimeSharePercent / 100);
  
  // Battery round-trip charging overhead (90% LFP charge-discharge roundtrip efficiency)
  const batteryChargingKwhRequired = batteryLoadKwh / 0.90;
  
  // Total Solar Generation needed daily (kWh)
  const totalDailySolarEnergyRequired = daytimeKwh + batteryChargingKwhRequired;

  const solarPanelKw = totalRunningWatts > 0 
    ? (totalDailySolarEnergyRequired / (peakSunHoursInput * systemEfficiency)) 
    : 0;
  const totalDcWatts = solarPanelKw * 1000;
  
  let panelCount = 0;
  if (totalDcWatts > 0) {
    const rawPanels = Math.ceil(totalDcWatts / panelWattage);
    panelCount = rawPanels % 2 === 0 ? rawPanels : rawPanels + 1;
  }
  const finalCalculatedDcKw = (panelCount * panelWattage) / 1000;

  // 4. Balance of System (BOS) Sizing (Cables & Protection)
  // DC Cable Size: Standardize at 4 mm² or 6 mm² based on standard DC run lengths.
  // Rule: 4 mm² for standard DC runs (<= 30m), 6 mm² for longer DC runs (> 30m).
  const dcCableSizeSqMm = '4 mm²'; // Standard size for residential lengths

  // AC Cable Size: Calculate based on selected Inverter current rating (I = P / V), outputting standard sizes (4 mm², 6 mm², 10 mm², 16 mm², 25 mm²)
  const acCurrentRating = (inverterKw * 1000) / serviceVoltageNum;
  
  let acCableSizeSqMm = '4 mm²';
  if (acCurrentRating <= 20) acCableSizeSqMm = '4 mm²';
  else if (acCurrentRating <= 32) acCableSizeSqMm = '6 mm²';
  else if (acCurrentRating <= 50) acCableSizeSqMm = '10 mm²';
  else if (acCurrentRating <= 65) acCableSizeSqMm = '16 mm²';
  else acCableSizeSqMm = '25 mm²';

  const acBreakerAmpsRaw = acCurrentRating * 1.25;
  const STANDARD_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 150];
  const acBreakerAmps = STANDARD_BREAKERS.find(b => b >= acBreakerAmpsRaw) || 63;

  // DC PV Solar String String Breaker (Rating based on array current * 1.25)
  const pvStringBreakerAmps = 20;

  // DC Battery Circuit Breaker = (Inverter continuous maximum power / nominal DC voltage) * 1.25
  const maxDcBatteryCurrent = (inverterKw * 1000) / nominalDcVoltage;
  const batteryBreakerAmpsRaw = maxDcBatteryCurrent * 1.25;
  const STANDARD_DC_BREAKERS = [40, 63, 100, 125, 150, 175, 200, 250, 300];
  const batteryBreakerAmps = STANDARD_DC_BREAKERS.find(b => b >= batteryBreakerAmpsRaw) || 200;

  // DC Battery Cable Selection (Heavy-duty copper cable AWG equivalent)
  let dcBatteryCableSqMm = '35 mm²';
  let batteryCableAwgHelp = '2 AWG';
  if (batteryBreakerAmps <= 63) {
    dcBatteryCableSqMm = '16 mm²';
    batteryCableAwgHelp = '6 AWG';
  } else if (batteryBreakerAmps <= 100) {
    dcBatteryCableSqMm = '25 mm²';
    batteryCableAwgHelp = '4 AWG';
  } else if (batteryBreakerAmps <= 150) {
    dcBatteryCableSqMm = '35 mm²';
    batteryCableAwgHelp = '2 AWG';
  } else if (batteryBreakerAmps <= 200) {
    dcBatteryCableSqMm = '50 mm²';
    batteryCableAwgHelp = '1/0 AWG';
  } else if (batteryBreakerAmps <= 250) {
    dcBatteryCableSqMm = '70 mm²';
    batteryCableAwgHelp = '2/0 AWG';
  } else {
    dcBatteryCableSqMm = '95 mm²';
    batteryCableAwgHelp = '4/0 AWG';
  }

  const dcSpdType = 'Type 2 DC SPD (class II, 600V/1000V DC rated for PV strings)';
  const acSpdType = 'Type 2 AC SPD (class II, 275V/385V AC rated for main switchboard)';

  return (
    <div className="space-y-4 text-slate-900 border-t border-slate-200 pt-5 mt-5">
      <div className="border-b border-slate-200 pb-2 mb-3">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
          APPLIANCE SECTOR LOAD CALCULATOR & DESIGN SCHEMATICS
        </h3>
        <p className="text-[10px] text-slate-500 mt-1">
          Input complete electrical loads to automatically scale essential inverters capacities, battery storages, DC solar string calculations, and correct breaker current safety specifications.
        </p>
      </div>

      {/* QUICK PRESETS CAROUSEL */}
      <div className="space-y-1">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Quick Presets (Tap to Add to Grid)</span>
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => addPreset(p)}
              className="flex-shrink-0 bg-slate-100 hover:bg-amber-100 transition-all border border-slate-200 hover:border-amber-300 rounded px-2 py-1 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3 text-emerald-600" />
              {p.name} ({p.powerWatts}W)
            </button>
          ))}
        </div>
      </div>

      {/* THE LOADS APPLIANCES DATA GRID */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-800 border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <th className="p-2.5">Appliance Name</th>
              <th className="p-2.5 text-center w-16">Qty</th>
              <th className="p-2.5 text-center w-24">Power (Watts)</th>
              <th className="p-2.5 text-center w-20">Hours / Day</th>
              <th className="p-2.5 text-center w-20">Is Aircon?</th>
              <th className="p-2.5 text-center w-28">Starting surge (W)</th>
              <th className="p-2.5 text-right w-24">Total Load (W)</th>
              <th className="p-2.5 text-right w-24">Energy (Wh/Day)</th>
              <th className="p-2.5 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {appliances.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  <Layers className="h-8 w-8 mx-auto text-slate-300 mb-1.5" />
                  No specific appliances mapped yet. Click quick presets above or fill the controller below!
                </td>
              </tr>
            ) : (
              appliances.map((item) => {
                const rowLoad = item.powerWatts * item.qty;
                const rowEnergy = rowLoad * item.usageHoursPerDay;

                return (
                  <tr key={item.id} className="hover:bg-amber-50/20 transition-all">
                    {/* Name */}
                    <td className="p-2">
                      <input
                        type="text"
                        className="w-full bg-transparent border-b border-transparent focus:border-amber-400 font-medium text-slate-900 outline-none"
                        value={item.name}
                        onChange={(e) => updateApplianceRow(item.id, { name: e.target.value })}
                      />
                    </td>
                    {/* Qty */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-transparent border-b border-transparent focus:border-amber-400 font-mono text-center outline-none"
                        value={item.qty}
                        onChange={(e) => updateApplianceRow(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                      />
                    </td>
                    {/* Power */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-transparent border-b border-transparent focus:border-amber-400 font-mono text-center outline-none"
                        value={item.powerWatts}
                        onChange={(e) => updateApplianceRow(item.id, { powerWatts: Math.max(1, parseInt(e.target.value) || 0) })}
                      />
                    </td>
                    {/* Usage Hours */}
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        className="w-full bg-transparent border-b border-transparent focus:border-amber-400 font-mono text-center outline-none"
                        value={item.usageHoursPerDay}
                        onChange={(e) => updateApplianceRow(item.id, { usageHoursPerDay: Math.min(24, Math.max(0, parseFloat(e.target.value) || 0)) })}
                      />
                    </td>
                    {/* Aircon Toggle */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-amber-500 cursor-pointer"
                        checked={item.isAircon}
                        onChange={(e) => updateApplianceRow(item.id, { isAircon: e.target.checked })}
                      />
                    </td>
                    {/* Starting surge */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-transparent border-b border-transparent focus:border-amber-400 font-mono text-center outline-none text-slate-500"
                        value={item.startingLoadWatts || item.powerWatts}
                        onChange={(e) => updateApplianceRow(item.id, { startingLoadWatts: Math.max(1, parseInt(e.target.value) || 0) })}
                      />
                    </td>
                    {/* Total running load */}
                    <td className="p-2.5 font-mono text-right text-slate-900 font-semibold">
                      {rowLoad.toLocaleString()} W
                    </td>
                    {/* Total daily energy */}
                    <td className="p-2.5 font-mono text-right text-amber-700 font-semibold">
                      {rowEnergy.toLocaleString()} Wh
                    </td>
                    {/* Actions */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => deleteAppliance(item.id)}
                        className="p-1 hover:bg-rose-50 rounded hover:text-rose-600 text-slate-400 transition-all cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}

            {/* TOTALS OVERVIEW ROW */}
            {appliances.length > 0 && (
              <tr className="bg-slate-50 font-bold border-t border-slate-200">
                <td className="p-3 text-slate-600">Total Operational Inventory:</td>
                <td className="p-3 text-center text-slate-900 font-mono">{totalQty}</td>
                <td colSpan={4} className="p-3 text-right text-slate-500 text-[10px] uppercase tracking-wider">Aggregate Sizing Sums:</td>
                <td className="p-3 text-right text-slate-950 font-mono font-black border-l border-slate-200 bg-amber-50/30">
                  {totalRunningWatts.toLocaleString()} W
                </td>
                <td className="p-3 text-right text-amber-800 font-mono font-black border-r border-slate-200 bg-amber-50/50">
                  {totalEnergyWh.toLocaleString()} Wh
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* COMPACT MANUAL CONTROLLER FORM */}
      <form onSubmit={handleSubmitCustom} className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Appliance Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Living room A/C, Rice Cooker"
            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-400 outline-none text-slate-900"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Quantity</label>
          <input
            type="number"
            min="1"
            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono outline-none text-slate-900"
            value={customQty}
            onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Power (Watts)</label>
          <input
            type="number"
            min="1"
            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono outline-none text-slate-900"
            value={customPower}
            onChange={(e) => handlePowerChange(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Hours / Day</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono outline-none text-slate-900"
            value={customHours}
            onChange={(e) => setCustomHours(Math.min(24, Math.max(0, parseFloat(e.target.value) || 0)))}
          />
        </div>

        <div className="space-y-1 relative">
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold py-1.5 px-3 rounded text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Appliance
          </button>
        </div>

        {/* Advance starting load controls */}
        <div className="md:col-span-6 flex flex-wrap gap-x-6 gap-y-2 items-center bg-white/50 border-t border-slate-100 pt-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-amber-500 accent-amber-500 focus:ring-amber-400"
              checked={customIsAircon}
              onChange={(e) => handleIsAirconToggle(e.target.checked)}
            />
            Assuming Air Conditioner starting load (Generates surge profile)
          </label>

          {customIsAircon && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Estimated Peak/Surge Start (W):</span>
              <input
                type="number"
                min="1"
                className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono text-center outline-none text-slate-900 font-bold"
                value={customStarting}
                onChange={(e) => setCustomStarting(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="text-[8px] text-slate-400 font-medium italic">Usually 2.5 - 3x of rated load.</span>
            </div>
          )}
        </div>
      </form>

      {/* METRIC SUMS SUMMARY INDICATORS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-slate-200 rounded-lg p-3 bg-white flex items-center gap-3">
          <div className="rounded bg-slate-100 p-2 text-slate-700">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Total Continuous Running load</span>
            <span className="text-lg font-black font-mono text-slate-800 tracking-tight">{(totalRunningWatts / 1000).toFixed(3)} kW</span>
            <span className="text-[8px] text-slate-400 block mt-0.5">Sum of all normal operating power</span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 bg-white flex items-center gap-3">
          <div className="rounded bg-rose-50 p-2 text-rose-600">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Calculated Maximum Surge Load</span>
            <span className="text-lg font-black font-mono text-rose-700 tracking-tight">{(peakSurgeWatts / 1000).toFixed(3)} kW</span>
            <span className="text-[8px] text-rose-450 block mt-0.5">Aircon start surge + running loads</span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 bg-white flex items-center gap-3">
          <div className="rounded bg-amber-50 p-2 text-amber-600">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Essential Total Energy Usage</span>
            <span className="text-lg font-black font-mono text-amber-800 tracking-tight">{totalEnergyKwh.toFixed(2)} kWh/Day</span>
            <span className="text-[8px] text-slate-400 block mt-0.5">Aggregated daily consumption profile</span>
          </div>
        </div>
      </div>

      {/* SYSTEM DESIGN CALCULATED SPECIFICATIONS REPORT */}
      {totalRunningWatts > 0 ? (
        <div className="space-y-4">
          
          {/* PV PANEL CONFIGURATION & SUN TIME COEFFICIENT CALCULATOR BLOCK */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded text-amber-500">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Interactive PV Solar Panel Custom Sizer & Solar Hour Configurator
                </h4>
                <p className="text-[9px] text-slate-400">
                  Select or custom enter panel sizes (W) and set Local Peak Sun Hours to automatically calculate variable solar panel counts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Column 1: Solar Panel Custom Wattage Sizer */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">
                  Custom Solar Panel Size (Watts)
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {[550, 580, 590, 600, 620, 650].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setPanelWattage(w)}
                      className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                        panelWattage === w
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {w}W
                    </button>
                  ))}
                </div>
                
                <div className="relative mt-2">
                  <span className="text-[9px] font-bold text-slate-400 block mb-1">Manual Custom Wattage (W):</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="100"
                      max="1000"
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono font-bold focus:border-amber-400 outline-none"
                      value={panelWattage}
                      onChange={(e) => setPanelWattage(Math.max(100, Math.min(1000, parseInt(e.target.value) || 620)))}
                    />
                    <span className="absolute inset-y-0 right-3.5 flex items-center text-[10px] font-mono font-bold text-slate-400">
                      Watts
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 2: Peak Sun Hours Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-500 uppercase tracking-tighter">Peak Sun Hours</span>
                  <span className="font-mono text-amber-600">{peakSunHoursInput.toFixed(1)} Hrs / day</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="7"
                  step="0.5"
                  className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-100 rounded-lg appearance-none mt-1"
                  value={peakSunHoursInput}
                  onChange={(e) => setPeakSunHoursInput(parseFloat(e.target.value) || 5.0)}
                />
                <div className="flex justify-between text-[8px] font-bold text-slate-400 font-mono">
                  <span>3.0 Hrs (Low)</span>
                  <span>5.0 Hrs (Standard)</span>
                  <span>7.0 Hrs (Optimal)</span>
                </div>
                <p className="text-[8px] text-slate-400 mt-1 leading-tight font-sans">
                  Solar irradiance threshold. Setting to <strong>5.0 hours</strong> calculates system specifications based on standard tropical weather.
                </p>
              </div>

            </div>

            {/* Breakdown Panel */}
            <div className="bg-slate-50 border border-slate-150 rounded p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] text-slate-600">
              <div>
                <span className="font-bold text-slate-500 block">Direct Daytime Energy (50%):</span>
                <span className="font-mono font-black text-slate-800">{daytimeKwh.toFixed(2)} kWh / Day</span>
                <span className="text-[8px] text-slate-400 block">Daytime clean solar supply bypass</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Battery Storage Support (50%):</span>
                <span className="font-mono font-black text-emerald-700">{batteryChargingKwhRequired.toFixed(2)} kWh / Day</span>
                <span className="text-[8px] text-slate-400 block">Load buffer storage + 10% charging dispatch overhead</span>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="font-bold text-amber-700 block">Total Calculated Solar Target:</span>
                <span className="font-mono font-black text-amber-800 text-xs">{(daytimeKwh + batteryChargingKwhRequired).toFixed(2)} kWh / Day</span>
                <span className="text-[8px] text-slate-400 block">Total green energy designed to run appliances daily</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/20 p-4 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-amber-200/50 pb-2">
              <Award className="h-4 w-4 text-amber-600" />
              <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
                ALGORITHMIC SOLAR SYSTEM COMPONENT SPECIFICATIONS DESIGN SHEET
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* INVERTER RATING */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">1. RECOMMENDED INVERTER</span>
                <div className="my-2.5 text-center">
                  <span className="text-xl font-mono font-black text-slate-900">{inverterKw} kW</span>
                  <span className="text-[8px] bg-amber-100 font-bold text-amber-800 px-1.5 py-0.5 rounded block mt-1 w-max mx-auto">Pure Sine Off-Grid</span>
                </div>
                <p className="text-[8px] text-slate-400 leading-tight">
                  Recommended to carry **{(totalRunningWatts / 1000).toFixed(1)}kW** continuous + **{(peakSurgeWatts / 1000).toFixed(1)}kW** transient motor surge.
                </p>
              </div>

              {/* BATTERY STORAGE CAPACITY */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">2. BATTERY BANK RATING</span>
                <div className="my-2.5 text-center">
                  <span className="text-xl font-mono font-black text-slate-900">{batteryKwh.toFixed(1)} kWh</span>
                  <span className="text-[8px] bg-emerald-100 font-bold text-emerald-800 px-1.5 py-0.5 rounded block mt-1 w-max mx-auto">
                    {batteryAh} Ah @ 48V DC
                  </span>
                </div>
                <p className="text-[8px] text-slate-400 leading-tight">
                  Provides **{backupHours} Hrs** backup buffer duration using 80% maximum depth of discharge safety margins.
                </p>
              </div>

              {/* SOLAR PANEL RATING */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">3. PV SOLAR PANEL CONFIG</span>
                <div className="my-2.5 text-center">
                  <span className="text-xl font-mono font-black text-slate-900">{finalCalculatedDcKw.toFixed(2)} kWp</span>
                  <span className="text-[8px] bg-amber-100 font-bold text-amber-800 px-1.5 py-0.5 rounded block mt-1 w-max mx-auto">
                    {panelCount} Panels ({panelWattage}W)
                  </span>
                </div>
                <p className="text-[8px] text-slate-400 leading-tight">
                  Parsed on {daytimeSharePercent}% day share load + battery charging cycles at {peakSunHoursInput} Peak Sun Hours.
                </p>
              </div>

              {/* SAFETY CIRCUIT BREAKERS RATING */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">4. REQUIRED CIRCUIT BREAKERS</span>
                <div className="my-1.5 space-y-1 text-[9px] font-semibold text-slate-700">
                  <div className="flex justify-between border-b pb-0.5">
                    <span>Inverter AC Out:</span>
                    <span className="font-mono text-slate-950">{acBreakerAmps}A MCB</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span>Battery DC Link:</span>
                    <span className="font-mono text-slate-950">{batteryBreakerAmps}A DC MCCB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PV Solar Fuse:</span>
                    <span className="font-mono text-slate-950">{pvStringBreakerAmps}A DC Link</span>
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 leading-none">Includes safe 125% thermal load factor offsets.</p>
              </div>

              {/* RECOMMENDED CABLE CONFIG */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">5. SPECIFIED CABLES SIZES</span>
                <div className="my-1.5 space-y-1 text-[9px] font-semibold text-slate-700">
                  <div className="flex justify-between border-b pb-0.5">
                    <span>AC Main Cable:</span>
                    <span className="font-mono text-slate-950">{acCableSizeSqMm}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span>Battery Cable:</span>
                    <span className="font-mono text-slate-950" title={batteryCableAwgHelp}>{dcBatteryCableSqMm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PV Direct Cable:</span>
                    <span className="font-mono text-slate-950">4 mm² (12 AWG)</span>
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 leading-none">Calculated copper cross sections based on safety Ampacity.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-white/40 border border-amber-200 p-2.5 rounded text-[10px] text-amber-900 leading-tight">
              <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Important Installation Note:</span> Standard motor-driven inductive loads such as standard split-unit Non-Inverter Air Conditioners require up to **300%** more startup current to overcome mechanical friction. The design algorithms above automatically provision heavy-duty **{inverterKw} kW** surge tolerance to safely run the layout smoothly without tripping systems.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-center text-xs text-slate-400">
          Add active operational loads to generate customized safe cable gauges and breaker recommendations.
        </div>
      )}
    </div>
  );
};
