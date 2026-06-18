/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { RoofMeasurements, RoofMaterial, DrawingElement } from '../types';
import { Compass, RotateCw, Trash2, Plus, Sparkles, AlertCircle } from 'lucide-react';

interface RoofMeasurementsStepProps {
  data: RoofMeasurements;
  sketch: any;
  onChange: (fields: Partial<RoofMeasurements>) => void;
  onSketchChange: (fields: any) => void;
}

const ROOF_MATERIALS = [
  { id: 'asphalt-shingle', label: 'Asphalt Shingle', desc: 'Standard residential rafters, simple flashing mounts' },
  { id: 'metal-seam', label: 'Standing Seam Metal', desc: 'Clamps directly to standing metal seams, zero punctures!' },
  { id: 'tile', label: 'Clay/Concrete Tile', desc: 'Fragile, requires specialty tile replacement hook feet' },
  { id: 'flat-tpo', label: 'Flat Roof (TPO/PVC)', desc: 'Requires sand-ballasted metal racking pans, zero leaks' },
  { id: 'slate', label: 'Slate Shingles', desc: 'Extremely dense & fragile. Requires professional slate slate-hooks' }
];

export const RoofMeasurementsStep: React.FC<RoofMeasurementsStepProps> = ({
  data,
  sketch,
  onChange,
  onSketchChange
}) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<SVGSVGElement | null>(null);

  // Initialize sketch with standard boundaries if empty
  useEffect(() => {
    if (!sketch.elements || sketch.elements.length === 0) {
      onSketchChange({
        elements: [
          {
            id: 'boundary-1',
            type: 'roof-boundary',
            points: [
              { x: 40, y: 40 },
              { x: 440, y: 40 },
              { x: 440, y: 280 },
              { x: 40, y: 280 }
            ],
            color: '#4b5563',
            label: 'Usable Roof Footprint'
          }
        ],
        panelLayout: sketch.panelLayout || { panelWidth: 35, panelHeight: 20, positions: [] },
        notes: sketch.notes || ''
      });
    }
  }, []);

  const handleAzimuthChange = (angle: number) => {
    onChange({ azimuthDegrees: angle });
  };

  const getAzimuthLabel = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return 'N (North - Unfavorable)';
    if (deg >= 22.5 && deg < 67.5) return 'NE (North-East - Poor)';
    if (deg >= 67.5 && deg < 112.5) return 'E (East - Good)';
    if (deg >= 112.5 && deg < 157.5) return 'SE (South-East - Very Good)';
    if (deg >= 157.5 && deg < 202.5) return 'S (South - Optimal Sweet Spot)';
    if (deg >= 202.5 && deg < 247.5) return 'SW (South-West - Very Good)';
    if (deg >= 247.5 && deg < 292.5) return 'W (West - Good)';
    return 'NW (North-West - Poor)';
  };

  // Add a predefined Obstruction to our canvas
  const addObstruction = (obstructionType: 'chimney' | 'skylight') => {
    const newId = `obs-${Date.now()}`;
    const size = obstructionType === 'chimney' ? 50 : 70;
    const startX = 150 + Math.random() * 100;
    const startY = 100 + Math.random() * 80;

    const newElement: DrawingElement = {
      id: newId,
      type: 'obstruction',
      points: [
        { x: startX, y: startY },
        { x: startX + size, y: startY },
        { x: startX + size, y: startY + size },
        { x: startX, y: startY + size }
      ],
      color: obstructionType === 'chimney' ? '#f87171' : '#f59e0b',
      label: obstructionType === 'chimney' ? 'Chimney Obstruction' : 'Skylight Obstruction'
    };

    onSketchChange({
      ...sketch,
      elements: [...(sketch.elements || []), newElement]
    });
    setSelectedElementId(newId);
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId || selectedElementId === 'boundary-1') return;

    onSketchChange({
      ...sketch,
      elements: (sketch.elements || []).filter((el: DrawingElement) => el.id !== selectedElementId)
    });
    setSelectedElementId(null);
  };

  // Automated panel allocation algorithm: Tesselates maximum panels, checking exclusions and boundaries
  const autoPopulatePanels = () => {
    const boundary = (sketch.elements || []).find((el: DrawingElement) => el.type === 'roof-boundary');
    if (!boundary) return;

    // Get boundary bounding box
    const minX = Math.min(...boundary.points.map((p: any) => p.x)) + 15;
    const maxX = Math.max(...boundary.points.map((p: any) => p.x)) - 15;
    const minY = Math.min(...boundary.points.map((p: any) => p.y)) + 15;
    const maxY = Math.max(...boundary.points.map((p: any) => p.y)) - 15;

    // Obstructions boxes
    const obstructions = (sketch.elements || []).filter((el: DrawingElement) => el.type === 'obstruction');

    const panelW = 35;
    const panelH = 22;
    const positions: any[] = [];

    // Loop through grid and place panels if they do not overlap obstructions
    for (let y = minY; y < maxY - panelH; y += panelH + 6) {
      for (let x = minX; x < maxX - panelW; x += panelW + 6) {
        let overlapsObstruction = false;

        // Check buffer distance around obstructions
        for (const obs of obstructions) {
          const obsMinX = Math.min(...obs.points.map((p: any) => p.x)) - 10;
          const obsMaxX = Math.max(...obs.points.map((p: any) => p.x)) + 10;
          const obsMinY = Math.min(...obs.points.map((p: any) => p.y)) - 10;
          const obsMaxY = Math.max(...obs.points.map((p: any) => p.y)) + 10;

          // Check intersection
          if (
            x < obsMaxX &&
            x + panelW > obsMinX &&
            y < obsMaxY &&
            y + panelH > obsMinY
          ) {
            overlapsObstruction = true;
            break;
          }
        }

        if (!overlapsObstruction) {
          positions.push({
            x,
            y,
            width: panelW,
            height: panelH,
            rotation: 0
          });
        }
      }
    }

    // Set layout
    onSketchChange({
      ...sketch,
      panelLayout: {
        panelWidth: panelW,
        panelHeight: panelH,
        positions
      }
    });

    // Update estimated solar install area based on placed panels (1 panel is 18 sq ft)
    const newArea = positions.length * 18;
    onChange({ installAreaSqFt: newArea });
  };

  const clearPanels = () => {
    onSketchChange({
      ...sketch,
      panelLayout: {
        panelWidth: 35,
        panelHeight: 22,
        positions: []
      }
    });
    onChange({ installAreaSqFt: 0 });
  };

  // SVG drag and drop coordinate handler
  const handleSvgMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (elementId === 'boundary-1') return; // Boundary is fixed
    const el = (sketch.elements || []).find((x: any) => x.id === elementId);
    if (!el) return;

    setSelectedElementId(elementId);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const minX = Math.min(...el.points.map((p: any) => p.x));
      const minY = Math.min(...el.points.map((p: any) => p.y));

      setDragOffset({
        x: clickX - minX,
        y: clickY - minY
      });
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (!selectedElementId || selectedElementId === 'boundary-1' || !dragOffset) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && sketch.elements) {
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      let targetMinX = cursorX - dragOffset.x;
      let targetMinY = cursorY - dragOffset.y;

      // Keep inside bounds (480x320)
      targetMinX = Math.max(10, Math.min(410, targetMinX));
      targetMinY = Math.max(10, Math.min(240, targetMinY));

      const updatedElements = sketch.elements.map((el: DrawingElement) => {
        if (el.id === selectedElementId) {
          const minX = Math.min(...el.points.map((p: any) => p.x));
          const minY = Math.min(...el.points.map((p: any) => p.y));
          const dx = targetMinX - minX;
          const dy = targetMinY - minY;

          return {
            ...el,
            points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return el;
      });

      onSketchChange({
        ...sketch,
        elements: updatedElements
      });
    }
  };

  const handleSvgMouseUp = () => {
    setDragOffset(null);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-400 rounded-full"></span>
          ROOF MEASUREMENTS & VISUAL SKETCH CREATOR
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">Slope angles & panel sheathing</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-slate-950">
        {/* Pitch, azimuth and material inputs */}
        <div className="space-y-3.5">
          {/* Material Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Roof Sheathing Material</label>
            <div className="grid grid-cols-1 gap-1.5">
              {ROOF_MATERIALS.map((mat) => (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => onChange({ material: mat.id as RoofMaterial })}
                  className={`flex items-start gap-2.5 rounded-lg border p-2 text-left cursor-pointer transition-colors outline-none ${
                    data.material === mat.id
                      ? 'border-amber-400 bg-amber-50/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`mt-0.5 rounded-full border-2 p-1 ${data.material === mat.id ? 'border-amber-400 bg-amber-400' : 'border-slate-300 bg-transparent'}`} />
                  <div>
                    <span className="text-xs font-bold text-slate-900 leading-none">{mat.label}</span>
                    <p className="text-[9px] leading-normal text-slate-400 mt-0.5">{mat.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Roof Slope Pitch */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Roof Slope (Pitch)</label>
              <span className="text-xs font-bold font-mono text-slate-700">{data.pitchDegrees}° (Pitch)</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              className="h-1.5 w-full cursor-pointer accent-amber-400"
              value={data.pitchDegrees}
              onChange={(e) => onChange({ pitchDegrees: parseInt(e.target.value) || 0 })}
            />
            <div className="flex justify-between text-[8px] font-bold text-slate-400">
              <span>0° (Flat Roof)</span>
              <span>25° (Standard)</span>
              <span>50° (Extreme A-Frame)</span>
            </div>
          </div>

          {/* Roof Azimuth Compass Dial */}
          <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block">Roof Azimuth/Orientation</label>
                <span className="text-xs font-bold text-amber-600 leading-snug">{getAzimuthLabel(data.azimuthDegrees)}</span>
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold border border-slate-200">{data.azimuthDegrees}°</span>
            </div>

            {/* Simulated circular dial */}
            <div className="flex items-center justify-center py-2">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-slate-850 bg-slate-900 shadow-inner">
                <span className="absolute top-1 text-[8px] font-bold text-slate-500">N</span>
                <span className="absolute right-1 text-[8px] font-bold text-slate-500">E</span>
                <span className="absolute bottom-1 text-[8px] font-bold text-slate-500">S</span>
                <span className="absolute left-1 text-[8px] font-bold text-slate-500">W</span>

                {/* Dial dial indicator line */}
                <div
                  className="absolute h-full w-full transition-transform duration-200 ease-out"
                  style={{ transform: `rotate(${data.azimuthDegrees}deg)` }}
                >
                  <div className="mx-auto h-1/2 w-0.5 bg-amber-400 shadow-sm relative">
                    <div className="absolute top-0 -left-1.5 h-3.5 w-3.5 rounded-full border border-amber-500 bg-amber-400 shadow-md" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'North', val: 0 },
                { label: 'East', val: 90 },
                { label: 'South', val: 180 },
                { label: 'West', val: 270 }
              ].map((pos) => (
                <button
                  key={pos.label}
                  type="button"
                  onClick={() => handleAzimuthChange(pos.val)}
                  className={`rounded py-0.5 text-[9px] font-bold border text-center transition-colors cursor-pointer outline-none ${
                    data.azimuthDegrees === pos.val
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pos.label} ({pos.val}°)
                </button>
              ))}
            </div>
          </div>

          {/* Section: Auxiliary Structural Properties */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block border-b border-slate-100 pb-1">BUILDING STRUCTURE & ROOF TYPE</span>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Roof Type Custom */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Roof Structure Type</label>
                <input
                  type="text"
                  className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
                  placeholder="e.g. Concrete Slab, Tin Deck"
                  value={data.roofType || ''}
                  onChange={(e) => onChange({ roofType: e.target.value })}
                />
              </div>

              {/* Building Height storeys */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Building Height (Storeys)</label>
                <select
                  className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
                  value={data.buildingHeightStoreys || '1'}
                  onChange={(e) => onChange({ buildingHeightStoreys: e.target.value })}
                >
                  <option value="1">1 Storey (Ranch/Bungalow)</option>
                  <option value="2">2 Storeys</option>
                  <option value="3">3 Storeys</option>
                  <option value="4">4 Storeys</option>
                  <option value="5">5+ Storeys</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Roof size measurements in Ft */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Roof Boundary Dimensions (Ft)</label>
                <input
                  type="text"
                  className="w-full border-b border-slate-200 py-1 text-xs focus:border-amber-400 bg-transparent text-slate-800 outline-none"
                  placeholder="e.g. 50 Ft width x 30 Ft length"
                  value={data.roofSizeMeasurementFt || ''}
                  onChange={(e) => onChange({ roofSizeMeasurementFt: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section: Specific Shading Issues */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block border-b border-slate-100 pb-1">SURROUNDING SHADING HAZARDS</span>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-tighter block">Shading Issue Details</label>
              <textarea
                className="h-16 w-full rounded border border-slate-200 bg-white p-2 text-xs focus:border-amber-400 text-slate-850 outline-none resize-none"
                placeholder="Describe local shading obstructions (trees, powerlines, overhead tanks, adjacent buildings)..."
                value={data.shadingIssueDetails || ''}
                onChange={(e) => onChange({ shadingIssueDetails: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Visual Drawing Sketch Tool Block */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-2 border-b border-slate-100 mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-tight text-slate-800 flex items-center gap-1">
                Visual Roof Layout & Panel Estimator
              </span>
              <p className="text-[9px] text-slate-400">Add obstructions and auto-layout cells to estimate panel capacity.</p>
            </div>
          </div>

          {/* Interactive Control buttons */}
          <div className="my-1.5 flex flex-wrap gap-1 items-center">
            <button
              type="button"
              onClick={() => addObstruction('chimney')}
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5 text-rose-500" /> Chimney
            </button>
            <button
              type="button"
              onClick={() => addObstruction('skylight')}
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5 text-amber-500" /> Skylight
            </button>
            <button
              type="button"
              onClick={deleteSelectedElement}
              disabled={!selectedElementId || selectedElementId === 'boundary-1'}
              className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 disabled:opacity-40 disabled:bg-slate-100 disabled:text-slate-400 transition-colors cursor-pointer"
            >
              <Trash2 className="h-2.5 w-2.5" /> Delete
            </button>
            <button
              type="button"
              onClick={autoPopulatePanels}
              className="ml-auto inline-flex items-center gap-1 rounded bg-slate-900 border border-slate-950 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Sparkles className="h-2.5 w-2.5 text-amber-400" /> Auto-Layout
            </button>
            <button
              type="button"
              onClick={clearPanels}
              className="inline-flex items-center gap-1 rounded border border-slate-250 px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* SVG Canvas Workspace */}
          <div className="relative flex flex-1 items-center justify-center rounded-lg border border-gray-100 bg-gray-50/70 p-1 min-h-[280px]">
            <svg
              ref={canvasRef}
              className="h-[280px] w-full max-w-[480px] cursor-default bg-white shadow-sm border border-gray-200 rounded-md"
              viewBox="0 0 480 320"
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={handleSvgMouseUp}
            >
              {/* Grid Background */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Render Boundary layer first */}
              {sketch.elements && sketch.elements.map((el: DrawingElement) => {
                if (el.type !== 'roof-boundary') return null;
                const minX = Math.min(...el.points.map((p) => p.x));
                const maxX = Math.max(...el.points.map((p) => p.x));
                const minY = Math.min(...el.points.map((p) => p.y));
                const maxY = Math.max(...el.points.map((p) => p.y));

                return (
                  <g key={el.id}>
                    <rect
                      x={minX}
                      y={minY}
                      width={maxX - minX}
                      height={maxY - minY}
                      fill="#f8fafc"
                      stroke={el.color}
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                    <text x={minX + 8} y={minY + 18} fill="#94a3b8" className="text-[10px] font-bold tracking-wide uppercase">
                      {el.label}
                    </text>
                  </g>
                );
              })}

              {/* Render Placed Solar Panels */}
              {sketch.panelLayout && sketch.panelLayout.positions && sketch.panelLayout.positions.map((panel: any, idx: number) => (
                <g key={`panel-${idx}`}>
                  <rect
                    x={panel.x}
                    y={panel.y}
                    width={panel.width}
                    height={panel.height}
                    rx="1.5"
                    fill="#1e3a8a"
                    stroke="#fbbf24"
                    strokeWidth="1"
                    className="opacity-90 shadow-sm"
                  />
                  {/* Grid gridlines inside panel block to simulate crystalline solar plates */}
                  <line x1={panel.x + panel.width / 2} y1={panel.y} x2={panel.x + panel.width / 2} y2={panel.y + panel.height} stroke="#fbbf24" strokeWidth="0.5" className="opacity-40" />
                  <line x1={panel.x} y1={panel.y + panel.height / 2} x2={panel.x + panel.width} y2={panel.y + panel.height / 2} stroke="#fbbf24" strokeWidth="0.5" className="opacity-40" />
                </g>
              ))}

              {/* Render Obstructions and handle drag gestures */}
              {sketch.elements && sketch.elements.map((el: DrawingElement) => {
                if (el.type === 'roof-boundary') return null;
                const minX = Math.min(...el.points.map((p) => p.x));
                const maxX = Math.max(...el.points.map((p) => p.x));
                const minY = Math.min(...el.points.map((p) => p.y));
                const maxY = Math.max(...el.points.map((p) => p.y));
                const isSelected = selectedElementId === el.id;

                return (
                  <g
                    key={el.id}
                    onMouseDown={(e) => handleSvgMouseDown(e, el.id)}
                    className="cursor-move group"
                  >
                    <rect
                      x={minX}
                      y={minY}
                      width={maxX - minX}
                      height={maxY - minY}
                      fill={el.color}
                      stroke={isSelected ? '#2563eb' : '#b45309'}
                      strokeWidth={isSelected ? '2' : '1'}
                      className="opacity-75 transition-opacity group-hover:opacity-90"
                    />
                    <text x={minX + 4} y={minY + 16} fill="#ffffff" className="text-[9px] font-bold select-none truncate">
                      {el.type === 'obstruction' && el.label?.includes('Chimney') ? 'Chimney' : 'Skylight'}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Legend guide flags overlay */}
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 text-[9px] font-bold text-gray-500 bg-white/90 p-1.5 rounded border border-gray-100">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-gray-500 border border-dashed border-gray-500" /> Roof</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-[#1e3a8a] border border-[#fbbf24]" /> Solar Cell (400W)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-[#f87171]" /> Obstruction</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-slate-200 bg-slate-50/50 p-2">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Panels Sized:</span>
              <span className="text-xs font-black text-slate-800 font-mono">{(sketch.panelLayout?.positions || []).length} Modules</span>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50/50 p-2">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Estimated PV Area:</span>
              <span className="text-xs font-black text-amber-700 font-mono">{data.installAreaSqFt} sq ft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
