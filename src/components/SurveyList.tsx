/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { SolarSurvey, PhotoAsset } from '../types';
import { FileUp, FileDown, Plus, Users, Image as ImageIcon, Trash2, ShieldAlert, Camera, MapPin } from 'lucide-react';

interface SurveyListProps {
  surveys: SolarSurvey[];
  activeSurveyId: string | null;
  onSelectSurvey: (id: string) => void;
  onAddNewSurvey: () => void;
  onDeleteSurvey: (id: string) => void;
  onImportSurveys: (imported: SolarSurvey[]) => void;
  onAddPhoto: (photo: PhotoAsset) => void;
  onDeletePhoto: (photoId: string) => void;
}

export const SurveyList: React.FC<SurveyListProps> = ({
  surveys,
  activeSurveyId,
  onSelectSurvey,
  onAddNewSurvey,
  onDeleteSurvey,
  onImportSurveys,
  onAddPhoto,
  onDeletePhoto,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [photoCategory, setPhotoCategory] = useState<'roof' | 'electrical' | 'bill' | 'site'>('roof');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const activeSurvey = surveys.find((s) => s.id === activeSurveyId);

  // Export all survey records as a JSON local download file
  const handleExportDatabase = () => {
    const dataStr = JSON.stringify(surveys, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solar_surveys_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import uploaded JSON database of survey sheets
  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportSurveys(parsed);
        } else {
          alert('Invalid JSON structure: Expected an array of Solar Surveys.');
        }
      } catch (err) {
        alert('Failed to parse uploaded JSON file.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = ''; // Reset input
  };

  // Parse uploaded photo asset file (converts to Base64)
  const processPhotoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Only image attachments are accepted.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newPhoto: PhotoAsset = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: file.name,
        category: photoCategory,
        dataUrl,
        uploadedAt: new Date().toISOString()
      };
      onAddPhoto(newPhoto);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPhotoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPhotoFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4 text-slate-900">
      {/* File Action Toolbar */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={handleExportDatabase}
          className="inline-flex items-center justify-center gap-1.5 rounded border border-slate-200 bg-white py-1 px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer select-none outline-none"
        >
          <FileDown className="h-3 w-3" /> Export DB
        </button>

        <button
          type="button"
          onClick={() => jsonInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-1.5 rounded border border-slate-200 bg-white py-1 px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer select-none outline-none"
        >
          <FileUp className="h-3 w-3" /> Import DB
        </button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          id="import-db-input"
          className="hidden"
          onChange={handleJsonImport}
        />
      </div>

      {/* Survey Sheet Leads list */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-slate-500" /> ACTIVE LEADS ({surveys.length})
          </span>
          <button
            type="button"
            onClick={onAddNewSurvey}
            className="rounded-full bg-slate-900 p-1 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
            title="Create New Site Survey"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="max-h-[160px] overflow-y-auto space-y-1.5 border border-slate-200 rounded p-1.5 bg-slate-50/50">
          {surveys.map((survey) => {
            const active = survey.id === activeSurveyId;
            return (
              <div
                key={survey.id}
                className={`group flex items-center justify-between rounded p-1.5 transition-all text-left border ${
                  active
                    ? 'bg-white border-amber-400 shadow-xs'
                    : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSurvey(survey.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <span className="block text-[11px] font-bold text-slate-800 truncate leading-tight">
                    {survey.clientInfo?.projectName || 'Untitled Survey Project'}
                  </span>
                  <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5 truncate leading-none">
                    <MapPin className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                    {survey.clientInfo?.address || 'N/A Address'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteSurvey(survey.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all rounded hover:bg-slate-50 outline-none"
                  title="Remove Lead record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo attachments block */}
      {activeSurvey && (
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter block flex items-center gap-1">
            <Camera className="h-3.5 w-3.5 text-slate-500" /> ATTACH WORKSPACE PHOTOS
          </span>

          <div className="space-y-1">
            <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter block">Photo Category Mapping</label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'roof', label: 'Rooftop/Sate' },
                { id: 'electrical', label: 'Breaker box' },
                { id: 'bill', label: 'Utility Bill' },
                { id: 'site', label: 'Obstructions' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPhotoCategory(opt.id as any)}
                  className={`rounded py-0.5 text-[9px] font-bold text-center border transition-all cursor-pointer outline-none ${
                    photoCategory === opt.id
                      ? 'border-amber-400 bg-amber-50 text-amber-700 font-extrabold'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Drag & Drop Box */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded p-3 text-center cursor-pointer transition-all select-none ${
              dragActive ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <div className="flex flex-col items-center justify-center">
              <ImageIcon className="h-5 w-5 text-slate-400 mb-0.5" />
              <div className="text-[10px] font-bold text-slate-700">Drag site photo or click</div>
              <p className="text-[8px] text-slate-450 mt-0.5 leading-none">Captures attachments for AI visual analysis</p>
            </div>
          </div>

          {/* Attached Files rendering grid */}
          {activeSurvey.photos && activeSurvey.photos.length > 0 && (
            <div className="space-y-1">
              <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-tighter">UPLOADED PHOTOS ({activeSurvey.photos.length})</span>
              <div className="grid grid-cols-2 gap-1 max-h-[120px] overflow-y-auto border border-slate-150 rounded p-1 bg-slate-50/30">
                {activeSurvey.photos.map((photo) => (
                  <div key={photo.id} className="relative rounded overflow-hidden border border-slate-200 bg-white p-1 flex flex-col group">
                    <img
                      src={photo.dataUrl}
                      alt={photo.title}
                      className="h-12 w-full object-cover rounded-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div className="mt-1 flex items-center justify-between text-[8px] leading-tight">
                      <span className="font-bold text-slate-650 capitalize truncate w-[75%]">{photo.category}</span>
                      <button
                        type="button"
                        onClick={() => onDeletePhoto(photo.id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 rounded outline-none"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
