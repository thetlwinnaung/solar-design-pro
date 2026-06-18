/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { AuthScreen } from './components/AuthScreen';
import { SolarSurvey, ClientInfo, SiteSurveyData, RoofMeasurements, EnergyConsumption, PhotoAsset, AiRecommendation } from './types';
import { SAMPLE_SURVEYS, calculateSolarMetrics } from './utils';
import { ClientInfoStep } from './components/ClientInfoStep';
import { SiteSurveyStep } from './components/SiteSurveyStep';
import { RoofMeasurementsStep } from './components/RoofMeasurementsStep';
import { EnergyConsumptionStep } from './components/EnergyConsumptionStep';
import { SolarCalculators } from './components/SolarCalculators';
import { AiAnalysisReport } from './components/AiAnalysisReport';
import { SurveyList } from './components/SurveyList';
import { 
  Sun, ClipboardCopy, FileCheck, Brain, Calculator, ArrowLeft, ArrowRight, Sparkles, FolderUp, Loader2, LogOut, 
  Cloud, CloudOff, Database, AlertCircle, CheckCircle2, HelpCircle, X, Info
} from 'lucide-react';


const STEP_LABELS = ['Client Details', 'Electrical Grid', 'Roof Sketcher', 'Monthly consumption Usage'];

const SQL_SCRIPT = `-- Create family site surveys repository
create table if not exists public.solar_surveys (
    id text primary key,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null,
    project_name text,
    client_name text,
    user_id uuid references auth.users(id) on delete set null,
    user_email text,
    data jsonb not null
);

-- Enable RLS for granular permission controls
alter table public.solar_surveys enable row level security;

-- Policies allowing collaborative read/write for all family members
create policy "Allow collaborative read for authenticated users" 
on public.solar_surveys 
for select 
to authenticated 
using (true);

create policy "Allow collaborative insert for authenticated users" 
on public.solar_surveys 
for insert 
to authenticated 
with check (true);

create policy "Allow collaborative update for authenticated users" 
on public.solar_surveys 
for update 
to authenticated 
using (true);

create policy "Allow collaborative delete for authenticated users" 
on public.solar_surveys 
for delete 
to authenticated 
using (true);`;

export default function App() {
  const [surveys, setSurveys] = useState<SolarSurvey[]>([]);
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'calculator' | 'ai'>('form');
  const [formStep, setFormStep] = useState(0);

  // Authentication & Supabase Synchronization States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [dbError, setDbError] = useState<string | null>(null);
  const [showSqlInstructions, setShowSqlInstructions] = useState(false);

  // Check current session and handle auth shifts
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync / Fetch surveys in Cloud when currentUser is authenticated
  useEffect(() => {
    if (!currentUser) {
      setSyncStatus('local');
      setDbError(null);
      return;
    }

    const fetchCloudSurveys = async () => {
      setSyncStatus('syncing');
      setDbError(null);
      try {
        const { data, error } = await supabase
          .from('solar_surveys')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const parsedSurveys = data.map((row: any) => ({
            ...row.data,
            id: row.id,
            createdAt: row.created_at || row.data.createdAt,
            updatedAt: row.updated_at || row.data.updatedAt,
          }));
          setSurveys(parsedSurveys);
          setActiveSurveyId(parsedSurveys[0].id);
        } else {
          // Push existing local data to cloud as initial sync
          const localRaw = localStorage.getItem('solar_surveys_db');
          let localData = SAMPLE_SURVEYS;
          if (localRaw) {
            try {
              localData = JSON.parse(localRaw);
            } catch (e) {}
          }
          setSyncStatus('syncing');
          for (const s of localData) {
            await supabase.from('solar_surveys').upsert({
              id: s.id,
              project_name: s.clientInfo?.projectName || 'Untitled',
              client_name: s.clientInfo?.clientName || '',
              user_id: currentUser.id,
              user_email: currentUser.email,
              data: s,
              updated_at: new Date().toISOString()
            });
          }
          // Query again to verify
          const { data: refreshed } = await supabase
            .from('solar_surveys')
            .select('*')
            .order('updated_at', { ascending: false });
          if (refreshed && refreshed.length > 0) {
            const parsedSurveys = refreshed.map((row: any) => ({
              ...row.data,
              id: row.id,
            }));
            setSurveys(parsedSurveys);
            setActiveSurveyId(parsedSurveys[0].id);
          }
        }
        setSyncStatus('synced');
      } catch (err: any) {
        console.error('Failed to sync to Supabase database:', err);
        setSyncStatus('error');
        const errMsg = err.message || '';
        if (errMsg.toLowerCase().includes('jwt') || errMsg.toLowerCase().includes('expired') || errMsg.toLowerCase().includes('token')) {
          setDbError('Your cloud session has expired. Please sign out and log in again to restore synchronization.');
          // Auto clean expired state
          setTimeout(() => {
            localStorage.removeItem('solar_surveys_session');
            setCurrentUser(null);
          }, 3000);
        } else if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
          setDbError('Table "solar_surveys" does not exist. Please run the setup scripts in the Supabase SQL Editor.');
        } else {
          setDbError(errMsg || 'Database sync error. Please verify your Supabase columns.');
        }
        
        // Graceful fallback to LocalStorage on error
        const raw = localStorage.getItem('solar_surveys_db');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSurveys(parsed);
              setActiveSurveyId(parsed[0].id);
              return;
            }
          } catch (e) {}
        }
        setSurveys(SAMPLE_SURVEYS);
        setActiveSurveyId(SAMPLE_SURVEYS[0].id);
      }
    };

    fetchCloudSurveys();
  }, [currentUser]);

  // Load local backups when user is offline/anonymous
  useEffect(() => {
    if (!currentUser) {
      const raw = localStorage.getItem('solar_surveys_db');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSurveys(parsed);
            setActiveSurveyId(parsed[0].id);
            return;
          }
        } catch (err) {
          console.error('Failed to parse surveys localstorage:', err);
        }
      }
      setSurveys(SAMPLE_SURVEYS);
      setActiveSurveyId(SAMPLE_SURVEYS[0].id);
      localStorage.setItem('solar_surveys_db', JSON.stringify(SAMPLE_SURVEYS));
    }
  }, [currentUser]);

  // Save current sheets database to local storage whenever surveys modify
  const saveSurveysToLocalStorage = async (newSurveys: SolarSurvey[]) => {
    setSurveys(newSurveys);
    localStorage.setItem('solar_surveys_db', JSON.stringify(newSurveys));

    if (currentUser) {
      setSyncStatus('syncing');
      try {
        for (const s of newSurveys) {
          const { error } = await supabase.from('solar_surveys').upsert({
            id: s.id,
            project_name: s.clientInfo?.projectName || 'Untitled',
            client_name: s.clientInfo?.clientName || '',
            user_id: currentUser.id,
            user_email: currentUser.email,
            data: s,
            updated_at: new Date().toISOString()
          });
          if (error) throw error;
        }
        setSyncStatus('synced');
        setDbError(null);
      } catch (err: any) {
        console.error('Error syncing survey changes:', err);
        setSyncStatus('error');
        const errMsg = err.message || '';
        if (errMsg.toLowerCase().includes('jwt') || errMsg.toLowerCase().includes('expired') || errMsg.toLowerCase().includes('token')) {
          setDbError('Your session has expired. Please sign out and sign in again.');
          setTimeout(() => {
            localStorage.removeItem('solar_surveys_session');
            setCurrentUser(null);
          }, 3000);
        } else if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
          setDbError('Table "solar_surveys" does not exist. Please run the setup scripts in the Supabase SQL Editor.');
        } else {
          setDbError(errMsg || 'Failed to sync modifications.');
        }
      }
    }
  };

  const activeSurvey = surveys.find((s) => s.id === activeSurveyId) || null;

  // Form modification callback helpers
  const handleClientInfoChange = (fields: Partial<ClientInfo>) => {
    if (!activeSurvey) return;
    const updated = surveys.map((s) => {
      if (s.id === activeSurvey.id) {
        return { ...s, clientInfo: { ...s.clientInfo, ...fields }, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSurveysToLocalStorage(updated);
  };

  const handleSiteSurveyChange = (fields: Partial<SiteSurveyData>) => {
    if (!activeSurvey) return;
    const updated = surveys.map((s) => {
      if (s.id === activeSurvey.id) {
        return { ...s, siteSurvey: { ...s.siteSurvey, ...fields }, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSurveysToLocalStorage(updated);
  };

  const handleRoofMeasurementsChange = (fields: Partial<RoofMeasurements>) => {
    if (!activeSurvey) return;
    const updated = surveys.map((s) => {
      if (s.id === activeSurvey.id) {
        return { ...s, roofMeasurements: { ...s.roofMeasurements, ...fields }, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSurveysToLocalStorage(updated);
  };

  const handleRoofSketchChange = (sketchFields: any) => {
    if (!activeSurvey) return;
    const updated = surveys.map((s) => {
      if (s.id === activeSurvey.id) {
        return { ...s, roofSketch: sketchFields, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSurveysToLocalStorage(updated);
  };

  const handleEnergyConsumptionChange = (fields: Partial<EnergyConsumption>) => {
    if (!activeSurvey) return;
    const updated = surveys.map((s) => {
      if (s.id === activeSurvey.id) {
        return { ...s, energyConsumption: { ...s.energyConsumption, ...fields }, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSurveysToLocalStorage(updated);
  };

  const handleAddPhoto = (photo: PhotoAsset) => {
    if (!activeSurvey) return;
    const updated = surveys.map((s) => {
      if (s.id === activeSurvey.id) {
        return { ...s, photos: [...(s.photos || []), photo], updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSurveysToLocalStorage(updated);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!activeSurvey) return;
    const updated = surveys.map((s) => {
      if (s.id === activeSurvey.id) {
        return { ...s, photos: (s.photos || []).filter((p) => p.id !== photoId), updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSurveysToLocalStorage(updated);
  };

  const handleAiRecommendationSuccess = (recom: AiRecommendation) => {
    if (!activeSurvey) return;
    const updated = surveys.map((s) => {
      if (s.id === activeSurvey.id) {
        return { ...s, aiRecommendation: recom, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSurveysToLocalStorage(updated);
  };

  const handleAddNewSurvey = () => {
    const newId = `survey-${Date.now()}`;
    const newSurvey: SolarSurvey = {
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientInfo: {
        projectName: `Lead Project #${surveys.length + 1}`,
        clientName: '',
        email: '',
        phone: '',
        address: '',
        latitude: 33.4484, // Phoenix default
        longitude: -112.0740,
        notes: ''
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
        voltageRecord: '',
        incomingCableSize: '',
        mainBreakerSize: '',
        hasGenerator: false,
        generatorSize: '',
        hasAts: false,
        atsSize: '',
        acCableLengthFeet: '',
        dcCableLengthFeet: '',
        solarDbLocation: 'near-main-db',
        wifiAvailable: true
      },
      roofMeasurements: {
        material: 'asphalt-shingle',
        pitchDegrees: 20,
        azimuthDegrees: 180,
        roofAgeYears: 5,
        installAreaSqFt: 600,
        obstructions: [],
        roofType: 'Concrete Slab',
        shadingIssueDetails: '',
        buildingHeightStoreys: '1',
        roofSizeMeasurementFt: ''
      },
      energyConsumption: {
        avgMonthlyBill: 450000,
        avgMonthlyKwh: 900,
        utilityProvider: 'Standard Public Utility',
        monthlyKwhUsage: [750, 700, 780, 850, 950, 1100, 1200, 1150, 1000, 850, 800, 750],
        backupTimeRequirementHours: '',
        outageSchedule: '',
        avgLoadKw: '',
        minLoadKw: '',
        maxLoadKw: '',
        avgUsageKwhPerDay: '',
        hourlyLoadProfile: '',
        monthlyElectricityBill: ''
      },
      roofSketch: {
        elements: [],
        panelLayout: { panelWidth: 35, panelHeight: 22, positions: [] },
        notes: ''
      },
      photos: []
    };

    const nextList = [newSurvey, ...surveys];
    saveSurveysToLocalStorage(nextList);
    setActiveSurveyId(newId);
    setFormStep(0);
    setActiveTab('form');
  };

  const handleDeleteSurvey = async (id: string) => {
    if (surveys.length <= 1) {
      alert('Cannot delete the last remaining lead survey. Please create another lead first.');
      return;
    }
    const filtered = surveys.filter((s) => s.id !== id);
    setSurveys(filtered);
    localStorage.setItem('solar_surveys_db', JSON.stringify(filtered));
    if (activeSurveyId === id) {
      setActiveSurveyId(filtered[0].id);
    }

    if (currentUser) {
      setSyncStatus('syncing');
      try {
        const { error } = await supabase.from('solar_surveys').delete().eq('id', id);
        if (error) throw error;
        setSyncStatus('synced');
      } catch (err: any) {
        console.error('Failed to delete survey from Supabase:', err);
        setSyncStatus('error');
      }
    }
  };

  const handleImportSurveys = (imported: SolarSurvey[]) => {
    if (!Array.isArray(imported)) return;
    const combined = [...imported, ...surveys];
    // De-duplicate sheets by ID
    const uniqueMap = new Map();
    combined.forEach((c) => uniqueMap.set(c.id, c));
    const finalSurveys = Array.from(uniqueMap.values());
    saveSurveysToLocalStorage(finalSurveys);
    setActiveSurveyId(finalSurveys[0].id);
    setActiveTab('form');
    setFormStep(0);
  };

  // Switch form pagination steps
  const nextFormStep = () => setFormStep((prev) => Math.min(STEP_LABELS.length - 1, prev + 1));
  const prevFormStep = () => setFormStep((prev) => Math.max(0, prev - 1));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-amber-505 animate-spin" />
        <span className="mt-2 text-xs font-bold text-slate-500 font-mono">Loading Collaborative Portal...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={setCurrentUser} />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <div id="solar_survey_main_viewport" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      {/* Visual Navigation Brand Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="mx-auto max-w-7xl px-3 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & title */}
          <div className="flex items-center gap-2">
            <div className="rounded bg-amber-400 p-1.5 shadow-sm">
              <Sun className="h-4.5 w-4.5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-tight uppercase text-white leading-none">Solar Surveyor Pro</h1>
              <span className="text-[9px] text-slate-400 mt-0.5 block">Family Cooperative site assessment & energy analysis portal</span>
            </div>
          </div>

          {/* Sync status, Setup guidance, and Logged in user */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            {/* Sync Badge */}
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded select-none">
                <CheckCircle2 className="h-3 w-3" /> Cloud Synced
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded animate-pulse select-none">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving changes...
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-950/40 border border-rose-500/20 px-2 py-0.5 rounded select-none">
                <CloudOff className="h-3 w-3" /> Offline / Setup Required
              </span>
            )}

            {/* Supabase SQL Instructions toggle button */}
            <button
              type="button"
              onClick={() => setShowSqlInstructions(!showSqlInstructions)}
              className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 px-2 py-1 rounded transition-colors cursor-pointer outline-none"
            >
              <Database className="h-3 w-3 text-amber-400" />
              Database SQL setup
            </button>

            {/* Currently logged-in profile and signout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">Logged in</span>
                <span className="text-[10px] font-mono text-amber-300 font-extrabold max-w-[140px] truncate block leading-none">{currentUser.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-slate-800 hover:bg-slate-750 hover:text-red-400 p-1.5 text-slate-300 transition-colors cursor-pointer outline-none"
                title="Sign out of family collaborative workspace"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Database Setup Error Alert Banner */}
      {dbError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-3">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
              <span className="font-medium text-[11px]">
                <strong className="font-extrabold uppercase tracking-tight mr-1">Cloud Sync Pending:</strong>
                {dbError}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSqlInstructions(true)}
              className="shrink-0 bg-amber-500 text-slate-900 font-extrabold text-[9px] uppercase px-2.5 py-1 rounded hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Show SQL Instructions
            </button>
          </div>
        </div>
      )}

      {/* Supabase SQL Database Schema instruction guide */}
      <AnimatePresence>
        {showSqlInstructions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900 border-b border-slate-950 text-slate-350 overflow-hidden"
          >
            <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-amber-400" />
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Supabase Collaborative Database Setup Instructions</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSqlInstructions(false)}
                  className="rounded hover:bg-slate-800 p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Step Instructions */}
                <div className="space-y-3 font-sans">
                  <h4 className="font-extrabold text-amber-400 tracking-wide uppercase text-[10px]">What you need to do on Supabase</h4>
                  <ol className="list-decimal pl-4.5 space-y-2 leading-relaxed text-[11px]">
                    <li>
                      Go to your Supabase Dashboard at{' '}
                      <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline text-amber-350 hover:text-amber-250">
                        supabase.com
                      </a>.
                    </li>
                    <li>
                      Select your project **hbzpcwmtpdhuhlhoaiji**. Under **Authentication &gt; Providers &gt; Email**, set **'Confirm Email'** to **OFF** (disabled). This allows immediate sign-in for your family users.
                    </li>
                    <li>
                      In the left panel, click on **SQL Editor &gt; New Query**.
                    </li>
                    <li>
                      Copy and paste the exact SQL script shown on the right, then hit **RUN**. This hooks up the tables with cooperative column structures and builds appropriate Row Level Security (RLS) policies for your family accounts!
                    </li>
                  </ol>

                  <div className="bg-slate-950 border border-slate-800 rounded p-3 text-[10px] space-y-1">
                    <span className="font-extrabold uppercase text-slate-400 block tracking-tight">Active Connection Credentials</span>
                    <div className="font-mono text-slate-450 space-y-0.5">
                      <p>URL: <span className="text-emerald-400">https://hbzpcwmtpdhuhlhoaiji.supabase.co</span></p>
                      <p>Key: <span className="text-emerald-450 truncate block">sb_publishable_2sLhH...</span></p>
                    </div>
                  </div>
                </div>

                {/* Editable/Copyable SQL Commands block */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1">
                    <span>SQL Query Setup Scripts</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(SQL_SCRIPT);
                        alert('SQL setup scripts copied to clipboard!');
                      }}
                      className="text-amber-400 hover:text-amber-300 underline uppercase cursor-pointer"
                    >
                      Copy Script
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded text-[9.5px] text-emerald-400 font-mono leading-normal max-h-[190px] overflow-y-auto whitespace-pre">
{SQL_SCRIPT}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Main Workspace Frame */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-3 py-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Left Hand: Lead Dashboard & Photo Database */}
        <div className="md:col-span-1 space-y-3">
          <div className="rounded border border-slate-200 bg-white p-3 shadow-xs">
            <h2 className="text-[10px] font-extrabold uppercase tracking-tight text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ClipboardCopy className="h-3.5 w-3.5 text-slate-500" /> Site Lead Registry
            </h2>
            <SurveyList
              surveys={surveys}
              activeSurveyId={activeSurveyId}
              onSelectSurvey={(id) => {
                setActiveSurveyId(id);
                setFormStep(0);
              }}
              onAddNewSurvey={handleAddNewSurvey}
              onDeleteSurvey={handleDeleteSurvey}
              onImportSurveys={handleImportSurveys}
              onAddPhoto={handleAddPhoto}
              onDeletePhoto={handleDeletePhoto}
            />
          </div>
        </div>

        {/* Right Hand: Core Interactive workspace */}
        <div className="md:col-span-3 flex flex-col space-y-3">
          {activeSurvey ? (
            <div className="flex-1 flex flex-col space-y-3">
              {/* Dynamic Workspace Tabs */}
              <div className="flex border border-slate-200 bg-white rounded p-0.5 shadow-xs gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-tight rounded transition-all outline-none cursor-pointer ${
                    activeTab === 'form'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <FileCheck className="h-3.5 w-3.5" /> Survey Sheet
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('calculator')}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-tight rounded transition-all outline-none cursor-pointer ${
                    activeTab === 'calculator'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Calculator className="h-3.5 w-3.5" /> Estimators
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-tight rounded transition-all outline-none cursor-pointer ${
                    activeTab === 'ai'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Brain className="h-3.5 w-3.5" /> AI Engine Report
                </button>
              </div>

              {/* Dynamic Content render with fluid presence animation */}
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  {activeTab === 'form' && (
                    <motion.div
                      key="form-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="rounded border border-slate-200 bg-white p-4 shadow-xs"
                    >
                      {/* Sub step paginator indicators */}
                      <div className="relative mb-5 px-1.5">
                        <div className="absolute top-1/2 left-0 h-0.5 bg-slate-100 w-full -translate-y-1/2" />
                        <div
                          className="absolute top-1/2 left-0 h-0.5 bg-amber-400 -translate-y-1/2 transition-all duration-300"
                          style={{ width: `${(formStep / (STEP_LABELS.length - 1)) * 100}%` }}
                        />
                        <div className="relative flex justify-between">
                          {STEP_LABELS.map((lbl, idx) => {
                            const completed = idx < formStep;
                            const active = idx === formStep;
                            return (
                              <button
                                key={lbl}
                                type="button"
                                onClick={() => setFormStep(idx)}
                                className="flex flex-col items-center group outline-none cursor-pointer"
                              >
                                <div
                                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all duration-300 z-10 ${
                                    active
                                      ? 'bg-slate-900 border-slate-950 text-white scale-105'
                                      : completed
                                      ? 'bg-amber-400 border-amber-500 text-slate-900'
                                      : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-350'
                                  }`}
                                >
                                  {idx + 1}
                                </div>
                                <span className={`hidden sm:inline-block text-[8px] uppercase tracking-tighter font-extrabold mt-1 transition-colors duration-300 ${active ? 'text-slate-800' : 'text-slate-400'}`}>
                                  {lbl}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Paginated Form Steps */}
                      <div className="min-h-[280px]">
                        {formStep === 0 && (
                          <ClientInfoStep data={activeSurvey.clientInfo} onChange={handleClientInfoChange} />
                        )}
                        {formStep === 1 && (
                          <SiteSurveyStep data={activeSurvey.siteSurvey} onChange={handleSiteSurveyChange} />
                        )}
                        {formStep === 2 && (
                          <RoofMeasurementsStep
                            data={activeSurvey.roofMeasurements}
                            sketch={activeSurvey.roofSketch}
                            onChange={handleRoofMeasurementsChange}
                            onSketchChange={handleRoofSketchChange}
                          />
                        )}
                        {formStep === 3 && (
                          <EnergyConsumptionStep data={activeSurvey.energyConsumption} onChange={handleEnergyConsumptionChange} />
                        )}
                      </div>

                      {/* Navigation footers */}
                      <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={prevFormStep}
                          disabled={formStep === 0}
                          className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded border border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer outline-none"
                        >
                          <ArrowLeft className="h-3 w-3" /> Back
                        </button>

                        <div className="text-[9px] text-slate-400 font-mono">
                          Page {formStep + 1} of {STEP_LABELS.length}
                        </div>

                        {formStep === STEP_LABELS.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab('calculator')}
                            className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded bg-slate-900 border border-slate-950 text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                          >
                            Calculate Projections <ArrowRight className="h-3 w-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={nextFormStep}
                            className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded bg-slate-905 border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                          >
                            Next <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'calculator' && (
                    <motion.div
                      key="calc-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="rounded border border-slate-200 bg-white p-4 shadow-xs"
                    >
                      <SolarCalculators survey={activeSurvey} />
                    </motion.div>
                  )}

                  {activeTab === 'ai' && (
                    <motion.div
                      key="ai-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                    >
                      <AiAnalysisReport survey={activeSurvey} onAnalysisSuccess={handleAiRecommendationSuccess} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-[300px]">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
              <span className="mt-2 text-[10px] font-bold text-slate-500">Syncing Lead Parameters...</span>
            </div>
          )}
        </div>
      </main>

      {/* Humble professional credit footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[9px] text-slate-400 mt-auto">
        <span>© {new Date().getFullYear()} Solar Site Surveyor Utility. All thermodynamic calculations are local safety approximations.</span>
      </footer>
    </div>
  );
}
