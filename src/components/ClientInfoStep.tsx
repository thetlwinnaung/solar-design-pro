/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ClientInfo } from '../types';
import { Compass, MapPin, Globe } from 'lucide-react';

interface ClientInfoStepProps {
  data: ClientInfo;
  onChange: (fields: Partial<ClientInfo>) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Yangon, MM', lat: 16.8256, lng: 96.1345, address: 'Pyay Road, Kamayut Township, Yangon, Myanmar' },
  { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.0740, address: 'Phoenix, Arizona, USA' },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, address: 'Los Angeles, California, USA' },
  { name: 'Miami, FL', lat: 25.7617, lng: -80.1918, address: 'Miami, Florida, USA' }
];

export const ClientInfoStep: React.FC<ClientInfoStepProps> = ({ data, onChange }) => {
  const handlePresetSelect = (preset: typeof PRESET_LOCATIONS[0]) => {
    onChange({
      address: preset.address,
      latitude: preset.lat,
      longitude: preset.lng
    });
  };

  const handleSimulateGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onChange({
            latitude: Math.round(position.coords.latitude * 10000) / 10000,
            longitude: Math.round(position.coords.longitude * 10000) / 10000,
            address: data.address || 'Geolocated Site Coordinates'
          });
        },
        () => {
          // Fallback simulation inside container
          const randomLat = Math.round((33.4 + Math.random() * 0.1) * 10000) / 10000;
          const randomLng = Math.round((-112.0 - Math.random() * 0.1) * 10000) / 10000;
          onChange({
            latitude: randomLat,
            longitude: randomLng,
            address: data.address || 'Simulated Survey Site Location'
          });
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-400 rounded-full"></span>
          CLIENT & SITE INFORMATION
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">Capture details & location</span>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 text-slate-950">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Project Identifier</label>
          <input
            type="text"
            className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent outline-none transition-colors"
            placeholder="e.g., Jenkins Household Retrofit"
            value={data.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Client Human Name</label>
          <input
            type="text"
            className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent outline-none transition-colors"
            placeholder="e.g., Sarah Jenkins"
            value={data.clientName}
            onChange={(e) => onChange({ clientName: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Contact Email</label>
          <input
            type="email"
            className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent outline-none transition-colors"
            placeholder="e.g., sarah@gmail.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Contact Phone Number</label>
          <input
            type="tel"
            className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent outline-none transition-colors"
            placeholder="e.g., +1 (602) 555-7890"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>

        <div className="col-span-1 space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Installation Site Physical Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center text-gray-400">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              className="w-full border-b border-slate-200 py-1 pl-5 text-xs focus:border-amber-400 bg-transparent outline-none transition-colors"
              placeholder="Full installation site address"
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
            />
          </div>
        </div>

        <div className="col-span-1 rounded-lg border border-slate-200 bg-white p-3.5 md:col-span-2">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight text-slate-700">
                <Globe className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Site Positioning Coordinates
              </span>
              <p className="mt-0.5 text-[9px] text-slate-400">Calculates solar angle elevation and regional insolation factors.</p>
            </div>
            <button
              type="button"
              onClick={handleSimulateGeolocate}
              className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded shadow-sm cursor-pointer transition-colors"
            >
              <Compass className="h-3 w-3 text-amber-400" /> Simulated GPS Pins
            </button>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Latitude (DD)</span>
              <input
                type="number"
                step="0.0001"
                className="w-full border-b border-slate-200 py-0.5 text-xs outline-none focus:border-amber-400 bg-transparent"
                value={data.latitude || ''}
                onChange={(e) => onChange({ latitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Longitude (DD)</span>
              <input
                type="number"
                step="0.0001"
                className="w-full border-b border-slate-200 py-0.5 text-xs outline-none focus:border-amber-400 bg-transparent"
                value={data.longitude || ''}
                onChange={(e) => onChange({ longitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="mt-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Quick-Load Climate Presets:</span>
            <div className="flex flex-wrap gap-1">
              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="rounded bg-slate-100 hover:bg-amber-100 hover:text-amber-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer outline-none"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Site Obstacle Notes / Customer Demands</label>
          <textarea
            className="h-16 w-full rounded-lg border border-slate-250 bg-white px-3 py-1.5 text-xs outline-none transition-colors focus:border-amber-400 resize-none"
            placeholder="Mention local covenants, aesthetic restrictions, homeowner guidelines, or trees slated to be removed..."
            value={data.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};
