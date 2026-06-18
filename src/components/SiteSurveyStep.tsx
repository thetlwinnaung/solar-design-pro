/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SiteSurveyData, GridConnectionType, ServiceVoltage, StructuralCondition } from '../types';
import { Shield, Sparkles, Battery, RefreshCw, Zap, Wrench } from 'lucide-react';

interface SiteSurveyStepProps {
  data: SiteSurveyData;
  onChange: (fields: Partial<SiteSurveyData>) => void;
}

const SHADING_PRESETS = [
  { label: 'Unobstructed', val: 0, desc: 'Zero shade, clear direct sky' },
  { label: 'Minor Chimney / Vent', val: 10, desc: 'Short casting shadow' },
  { label: 'Moderate Canopy', val: 35, desc: 'Deciduous trees partially pruneable' },
  { label: 'Severe Canopy / Tall structures', val: 70, desc: 'Major dense shadow' }
];

export const SiteSurveyStep: React.FC<SiteSurveyStepProps> = ({ data, onChange }) => {
  const toggleShadingSource = (source: string) => {
    const list = data.shadingSources || [];
    if (list.includes(source)) {
      onChange({ shadingSources: list.filter((v) => v !== source) });
    } else {
      onChange({ shadingSources: [...list, source] });
    }
  };

  const setGridConnectionType = (type: GridConnectionType) => {
    onChange({ gridConnection: type });
  };

  const getShadingColor = (pct: number) => {
    if (pct < 15) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (pct < 40) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-rose-500 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-400 rounded-full"></span>
          UTILITY & ELECTRICAL SYSTEM SURVEY
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">Grid connections & amp panels</span>
      </div>

      <div className="space-y-4 text-slate-950">
        {/* Shading Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Estimated Site Shading Impact</label>
            <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${getShadingColor(data.shadingPercent)}`}>
              {data.shadingPercent}% Annual Shade
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">Every 10% shading approximately reduces generation yield by 8-9% depending on optimal bypass diode activation.</p>
          <div className="py-2">
            <input
              type="range"
              min="0"
              max="100"
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-solar-500 outline-none"
              value={data.shadingPercent}
              onChange={(e) => onChange({ shadingPercent: parseInt(e.target.value) || 0 })}
            />
            <div className="mt-2 grid grid-cols-4 text-[10px] font-medium text-gray-400">
              <span className="text-left">0% (None)</span>
              <span className="text-center">30% (Moderate)</span>
              <span className="text-center">60% (High)</span>
              <span className="text-right">100% (Full Shade)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SHADING_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange({ shadingPercent: preset.val })}
                className={`rounded-lg border p-2 text-left transition-all cursor-pointer outline-none ${
                  data.shadingPercent === preset.val
                    ? 'border-amber-400 bg-amber-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="text-xs font-bold text-slate-800">{preset.label}</div>
                <div className="mt-0.5 text-[9px] text-slate-400 line-clamp-2 leading-normal">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Shading Contributors */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Shading Contributors Detected</label>
          <div className="flex flex-wrap gap-1">
            {['None', 'Trees / Deciduous Forest', 'Chimneys / Flues', 'Utility Poles', 'Adjacent Buildings', 'Dormers'].map((item) => {
              const active = (data.shadingSources || []).includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleShadingSource(item)}
                  className={`rounded p-1 text-[10px] font-bold border transition-colors outline-none cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid & Electrical parameters */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Grid Connection Option */}
          <div className="col-span-1 space-y-2 md:col-span-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Electricity Tariff Configuration</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setGridConnectionType('net-metering')}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all cursor-pointer outline-none ${
                  data.gridConnection === 'net-metering'
                    ? 'border-amber-400 bg-amber-50/25'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`rounded p-1.5 ${data.gridConnection === 'net-metering' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Net Metering (NEM)</h4>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-400">Feeds excess solar energy back to the public utility grid for billing credits.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGridConnectionType('grid-battery')}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all cursor-pointer outline-none ${
                  data.gridConnection === 'grid-battery'
                    ? 'border-amber-400 bg-amber-50/25'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`rounded p-1.5 ${data.gridConnection === 'grid-battery' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  <Battery className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Hybrid / Solar Battery</h4>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-400">Saves excess power locally in home batteries to offset loadshedding or night rates.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGridConnectionType('off-grid')}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all cursor-pointer outline-none ${
                  data.gridConnection === 'off-grid'
                    ? 'border-amber-400 bg-amber-50/25'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`rounded p-1.5 ${data.gridConnection === 'off-grid' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Completely Off-Grid</h4>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-400">No grid connection whatsoever. Relies 100% on standalone solar arrays & heavy battery blocks.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Electric Panel Amps */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Service Panel Capacity (A)</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.panelCapacityAmps}
              onChange={(e) => onChange({ panelCapacityAmps: parseInt(e.target.value) || 200 })}
            >
              <option value="100">100 Amp panel (Older Homes)</option>
              <option value="125">125 Amp panel</option>
              <option value="150">150 Amp panel</option>
              <option value="200">200 Amp panel (Standard Residential)</option>
              <option value="400">400 Amp panel (Commercial / Luxury)</option>
            </select>
          </div>

          {/* Service Voltage */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Grid Nominal Service Voltage</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.serviceVoltage}
              onChange={(e) => onChange({ serviceVoltage: e.target.value as ServiceVoltage })}
            >
              <option value="120/240V">120/240V Split-Phase (Standard Domestic)</option>
              <option value="120/208V">120/208V Three-Phase (Light Commercial)</option>
              <option value="277/480V">277/480V Three-Phase (Industrial)</option>
            </select>
          </div>

          {/* Structural Condition */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Roof Structural Assessment</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.structuralCheck}
              onChange={(e) => onChange({ structuralCheck: e.target.value as StructuralCondition })}
            >
              <option value="good">Good Standard (Solid rafters, zero sagging)</option>
              <option value="reinforce">Needs Structural Reinforcement</option>
              <option value="unknown">Unknown Rafter Spacings (Needs attic crawl)</option>
            </select>
          </div>

          {/* Client Utility Meter Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Client Utility Meter Type</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.meterType || 'single'}
              onChange={(e) => onChange({ meterType: e.target.value as 'single' | 'power' })}
            >
              <option value="single">Single-Phase Meter</option>
              <option value="power">Three-Phase / Power Meter</option>
            </select>
          </div>

          {/* Main Utility Incoming Power Cable Size */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Utility Incoming Cable Size</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 16mm sq, 4/0 AWG"
              value={data.incomingCableSize || ''}
              onChange={(e) => onChange({ incomingCableSize: e.target.value })}
            />
          </div>

          {/* Main Breaker Size */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Main Breaker Size (Amps/Trip)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 63A, 100A, 200A"
              value={data.mainBreakerSize || ''}
              onChange={(e) => onChange({ mainBreakerSize: e.target.value })}
            />
          </div>

          {/* Voltage Stabilizer */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Is Voltage Stabilizer present?</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.voltageStabilizer ? 'yes' : 'no'}
              onChange={(e) => onChange({ voltageStabilizer: e.target.value === 'yes' })}
            >
              <option value="no">No Voltage Stabilizer</option>
              <option value="yes">Yes, Stabilizer Installed</option>
            </select>
          </div>

          {/* Incoming Voltage Measuring Record */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Incoming Voltage Measured Record (V)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 230V stable, fluctuating 180V - 240V"
              value={data.voltageRecord || ''}
              onChange={(e) => onChange({ voltageRecord: e.target.value })}
            />
          </div>

          {/* Existing Generator Setup */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Existing Generator Presence</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.hasGenerator ? 'yes' : 'no'}
              onChange={(e) => onChange({ hasGenerator: e.target.value === 'yes' })}
            >
              <option value="no">No Generator On-Site</option>
              <option value="yes">Yes, Backup Generator</option>
            </select>
          </div>

          {/* Generator Size Input (conditional visual helper) */}
          <div className={`space-y-1 transition-all ${data.hasGenerator ? 'opacity-100 scale-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Generator Capacity Size</label>
            <input
              type="text"
              disabled={!data.hasGenerator}
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 15 kVA Soundproof, 5 kW Portable"
              value={data.generatorSize || ''}
              onChange={(e) => onChange({ generatorSize: e.target.value })}
            />
          </div>

          {/* ATS setup */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">ATS (Automatic Transfer Switch) Installed</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.hasAts ? 'yes' : 'no'}
              onChange={(e) => onChange({ hasAts: e.target.value === 'yes' })}
            >
              <option value="no">No ATS present</option>
              <option value="yes">Yes, ATS present</option>
            </select>
          </div>

          {/* ATS size */}
          <div className={`space-y-1 transition-all ${data.hasAts ? 'opacity-100 scale-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">ATS Size / Rating</label>
            <input
              type="text"
              disabled={!data.hasAts}
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 100A, 200A automatic switch"
              value={data.atsSize || ''}
              onChange={(e) => onChange({ atsSize: e.target.value })}
            />
          </div>

          {/* Dedicated Cable Runs */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">AC Cable Route Length (Ft)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 45 ft from inverter to DB"
              value={data.acCableLengthFeet || ''}
              onChange={(e) => onChange({ acCableLengthFeet: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">DC Solar Cable Route Length (Ft)</label>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
              placeholder="e.g. 100 ft from panels to inverter"
              value={data.dcCableLengthFeet || ''}
              onChange={(e) => onChange({ dcCableLengthFeet: e.target.value })}
            />
          </div>

          {/* Location of Solar DB */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Location of Solar DB</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.solarDbLocation || 'near-main-db'}
              onChange={(e) => onChange({ solarDbLocation: e.target.value })}
            >
              <option value="near-main-db">Near Main DB Box</option>
              <option value="separate">Separate Floor / Compartment (needs extension)</option>
            </select>
          </div>

          {/* WiFi Availability */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">WiFi / Internet Availability Onsite</label>
            <select
              className="w-full border-b border-slate-200 py-1 text-xs outline-none focus:border-amber-400 bg-transparent text-slate-800"
              value={data.wifiAvailable ? 'yes' : 'no'}
              onChange={(e) => onChange({ wifiAvailable: e.target.value === 'yes' })}
            >
              <option value="yes">Internet / WiFi Available</option>
              <option value="no">No WiFi (cellular/dongle needed)</option>
            </select>
          </div>

          {/* Circuits breaker space toggle */}
          <div className="col-span-1 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 md:col-span-3 shadow-xs">
            <input
              type="checkbox"
              id="circuits-space"
              className="h-4 w-4 rounded border-slate-300 text-amber-500 accent-amber-500 focus:ring-amber-400 mt-0.5 cursor-pointer"
              checked={data.circuitsSpace}
              onChange={(e) => onChange({ circuitsSpace: e.target.checked })}
            />
            <label htmlFor="circuits-space" className="cursor-pointer select-none text-[10px] leading-snug text-slate-600">
              <span className="block font-bold text-slate-800">Breaker box has space for dedicated 2-Pole Solar Breaker</span>
              <span className="text-[9px] text-slate-400">If space is unavailable, standard rules mandate installing a sub-panel or completing a supply-side tap project ($1,200 - $2,500 estimate).</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
