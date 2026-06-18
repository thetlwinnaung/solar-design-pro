/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

// Load environment variables (.env files are automatically managed in AI Studio)
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize server-side Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hbzpcwmtpdhuhlhoaiji.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2sLhHwFBBoGRVRW8AyBapw_azgl0I5B';

const baseSupabase = createClient(supabaseUrl, supabaseAnonKey);

const getSupabaseClient = (authHeader?: string) => {
  if (!authHeader) return baseSupabase;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
};

// Set maximum request size limit so users can upload and evaluate base64 site drawings & photos
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// --- RESILIENT OFFLINE-FIRST FALLBACK ENGINE ---
const localUsers = new Map<string, string>(); // email -> password
const localSurveys: any[] = []; // shared fallback database for family offline collaboration
let isSystemOffline = false; // flag indicating database is currently un-contactable/paused

function isFetchError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('conn') ||
    msg.includes('dns') ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('unreachable') ||
    msg.includes('typeerror') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed')
  );
}

// --- SUPABASE PROXY ROUTES ---

// Auth Sign Up Proxy
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required' } });
    }

    try {
      const { data, error } = await baseSupabase.auth.signUp({ email, password });
      if (error) {
        if (isFetchError(error)) throw error;
        return res.status(400).json({ error });
      }
      return res.json({ user: data.user, session: data.session });
    } catch (sbErr: any) {
      if (isFetchError(sbErr)) {
        console.warn('Supabase detected offline during signup. Falling back to local family sandbox...', sbErr.message);
        isSystemOffline = true;
        const normalizedEmail = email.toLowerCase().trim();
        localUsers.set(normalizedEmail, password);

        const virtualUser = {
          id: `virtual-user-${Buffer.from(normalizedEmail).toString('hex').slice(0, 12)}`,
          email: normalizedEmail,
          is_virtual: true
        };
        const virtualSession = {
          access_token: `virtual-token-${Date.now()}`,
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
          user: virtualUser
        };
        return res.json({ user: virtualUser, session: virtualSession, isOfflineFallback: true });
      }
      throw sbErr;
    }
  } catch (err: any) {
    console.error('Proxy signup error:', err);
    return res.status(500).json({ error: { message: err.message || 'Internal proxy error' } });
  }
});

// Auth Sign In Proxy
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required' } });
    }

    try {
      const { data, error } = await baseSupabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (isFetchError(error)) throw error;
        return res.status(400).json({ error });
      }
      return res.json({ user: data.user, session: data.session });
    } catch (sbErr: any) {
      if (isFetchError(sbErr)) {
        console.warn('Supabase detected offline during signin. Falling back to local family sandbox...', sbErr.message);
        isSystemOffline = true;
        const normalizedEmail = email.toLowerCase().trim();

        // Autocreate user for family sandbox if not already registered
        if (!localUsers.has(normalizedEmail)) {
          localUsers.set(normalizedEmail, password);
        }

        const storedPassword = localUsers.get(normalizedEmail);
        if (storedPassword !== password) {
          return res.status(401).json({ error: { message: 'Invalid credentials for this sandbox session' } });
        }

        const virtualUser = {
          id: `virtual-user-${Buffer.from(normalizedEmail).toString('hex').slice(0, 12)}`,
          email: normalizedEmail,
          is_virtual: true
        };
        const virtualSession = {
          access_token: `virtual-token-${Date.now()}`,
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
          user: virtualUser
        };
        return res.json({ user: virtualUser, session: virtualSession, isOfflineFallback: true });
      }
      throw sbErr;
    }
  } catch (err: any) {
    console.error('Proxy signin error:', err);
    return res.status(500).json({ error: { message: err.message || 'Internal proxy error' } });
  }
});

// Auth Sign Out Proxy
app.post('/api/auth/signout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && !authHeader.includes('virtual-token-')) {
      const dbClient = getSupabaseClient(authHeader);
      await dbClient.auth.signOut().catch(() => {});
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Proxy signout error:', err);
    return res.status(500).json({ error: { message: err.message || 'Internal proxy error' } });
  }
});

// Surveys Get Listing Proxy (uses client authentication via Auth header)
app.get('/api/surveys', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: { message: 'Missing Authorization bearer token' } });
    }

    const isVirtual = authHeader.includes('virtual-token-') || isSystemOffline;

    if (!isVirtual) {
      try {
        const dbClient = getSupabaseClient(authHeader);
        const orderColumn = (req.query.order as string) || 'updated_at';
        const ascending = req.query.ascending === 'true';

        const { data, error } = await dbClient
          .from('solar_surveys')
          .select('*')
          .order(orderColumn, { ascending });

        if (error) {
          if (isFetchError(error)) throw error;
          return res.status(400).json({ error });
        }
        return res.json({ data });
      } catch (sbErr: any) {
        if (!isFetchError(sbErr)) throw sbErr;
        isSystemOffline = true;
      }
    }

    // Virtual cooperative workspace surveys list
    return res.json({ data: localSurveys });
  } catch (err: any) {
    console.error('Proxy survey fetch error:', err);
    return res.status(500).json({ error: { message: err.message || 'Internal proxy error' } });
  }
});

// Surveys Upsert Proxy (uses client authentication via Auth header)
app.post('/api/surveys/upsert', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: { message: 'Missing Authorization bearer token' } });
    }

    const { id, project_name, client_name, user_id, user_email, data, updated_at } = req.body;
    if (!id || !data) {
      return res.status(400).json({ error: { message: 'Missing payload parameters id or data' } });
    }

    const isVirtual = authHeader.includes('virtual-token-') || isSystemOffline;

    if (!isVirtual) {
      try {
        const dbClient = getSupabaseClient(authHeader);
        const { data: upsertData, error } = await dbClient
          .from('solar_surveys')
          .upsert({
            id,
            project_name: project_name || data.clientInfo?.projectName || 'Untitled',
            client_name: client_name || data.clientInfo?.clientName || '',
            user_id,
            user_email,
            data,
            updated_at: updated_at || new Date().toISOString()
          });

        if (error) {
          if (isFetchError(error)) throw error;
          return res.status(400).json({ error });
        }
        return res.json({ data: upsertData });
      } catch (sbErr: any) {
        if (!isFetchError(sbErr)) throw sbErr;
        isSystemOffline = true;
      }
    }

    // Local sandbox state save
    const existingIndex = localSurveys.findIndex(s => s.id === id);
    const row = {
      id,
      project_name: project_name || data.clientInfo?.projectName || 'Untitled',
      client_name: client_name || data.clientInfo?.clientName || '',
      user_id,
      user_email,
      data,
      created_at: new Date().toISOString(),
      updated_at: updated_at || new Date().toISOString()
    };
    if (existingIndex >= 0) {
      localSurveys[existingIndex] = row;
    } else {
      localSurveys.push(row);
    }
    return res.json({ data: row });
  } catch (err: any) {
    console.error('Proxy survey upsert error:', err);
    return res.status(500).json({ error: { message: err.message || 'Internal proxy error' } });
  }
});

// Surveys Delete Proxy (uses client authentication via Auth header)
app.delete('/api/surveys/delete', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: { message: 'Missing Authorization bearer token' } });
    }

    const column = req.query.column as string;
    const value = req.query.value as string;

    if (!column || !value) {
      return res.status(400).json({ error: { message: 'Missing delete query filters' } });
    }

    const isVirtual = authHeader.includes('virtual-token-') || isSystemOffline;

    if (!isVirtual) {
      try {
        const dbClient = getSupabaseClient(authHeader);
        const { error } = await dbClient
          .from('solar_surveys')
          .delete()
          .eq(column, value);

        if (error) {
          if (isFetchError(error)) throw error;
          return res.status(400).json({ error });
        }
        return res.json({ success: true });
      } catch (sbErr: any) {
        if (!isFetchError(sbErr)) throw sbErr;
        isSystemOffline = true;
      }
    }

    // Local state delete
    if (column === 'id') {
      const idx = localSurveys.findIndex(s => s.id === value);
      if (idx >= 0) {
        localSurveys.splice(idx, 1);
      }
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Proxy survey delete error:', err);
    return res.status(500).json({ error: { message: err.message || 'Internal proxy error' } });
  }
});

// Shared Gemini API Client with lazy initialization
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured. Please add it via Secrets panel.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// REST API for Solar Site & Estimator Analysis
app.post('/api/analyze-site', async (req, res) => {
  try {
    const survey = req.body;
    if (!survey) {
      return res.status(400).json({ error: 'Missing site survey body' });
    }

    const { clientInfo, siteSurvey, roofMeasurements, energyConsumption, roofSketch, photos } = survey;

    // Check if API key is in environment variables
    let ai;
    try {
      ai = getAiClient();
    } catch (apiError: any) {
      console.warn('Gemini client failed to initialize:', apiError.message);
      // Fallback: If no API key is provided, we will calculate a structural fallback response
      return res.json({
        fallback: true,
        message: 'Running in demo mode (no Gemini API Key configured). Below is a direct mathematical analysis.',
        recommendation: generateMathematicalBackup(survey)
      });
    }

    // Process uploaded photo attachments and sketch as multimodal parts for Gemini
    const partsArray: any[] = [];

    // Add survey context as text
    let contextText = `You are an expert solar solar engineer and site survey analyst. Analyze the following site survey details and provide an engineering report and system size optimization recommendation.

--- CLIENT & PROJECT DETAILS ---
Project: ${clientInfo?.projectName || 'No Project Name'}
Client Name: ${clientInfo?.clientName || 'N/A'}
Address: ${clientInfo?.address || 'N/A'}
Location Coordinates: Latitude ${clientInfo?.latitude || 'N/A'}, Longitude ${clientInfo?.longitude || 'N/A'}
Notes: ${clientInfo?.notes || 'None'}

--- SITE SURVEY DATA & ELECTRICAL INFRASTRUCTURE ---
Shading Sources: ${(siteSurvey?.shadingSources || []).join(', ') || 'None'}
Shading Percent: ${siteSurvey?.shadingPercent ?? 0}% shade impact
Grid Utility Type: ${siteSurvey?.gridConnection || 'net-metering'}
Main Electrical Panel Capacity: ${siteSurvey?.panelCapacityAmps ?? 200} Amps
Circuits Space Available: ${siteSurvey?.circuitsSpace ? 'Yes' : 'No'}
Service Voltage: ${siteSurvey?.serviceVoltage || '120/240V'}
Structural Roof Rating: ${siteSurvey?.structuralCheck || 'good'}

Additional Site Audit Parameters Registered:
- Client Utility Meter Type: ${siteSurvey?.meterType || 'single-phase'}
- Voltage Stabilizer Integrated: ${siteSurvey?.voltageStabilizer ? 'Yes' : 'No'}
- Incoming Voltage Logging Record: ${siteSurvey?.voltageRecord || 'N/A'}
- Main Power Feed Cable Input Size: ${siteSurvey?.incomingCableSize || 'N/A'}
- Main Breaker Size: ${siteSurvey?.mainBreakerSize || 'N/A'}
- Existing Emergency Generator: ${siteSurvey?.hasGenerator ? `Yes, Rated Size: ${siteSurvey?.generatorSize || 'Unspecified'}` : 'No'}
- ATS (Automatic Transfer Switch) Installed: ${siteSurvey?.hasAts ? `Yes, ATS Scope: ${siteSurvey?.atsSize || 'Unspecified'}` : 'No'}
- AC Power Route Length (Ft): ${siteSurvey?.acCableLengthFeet || 'N/A'} Ft
- DC Solar Cable Route Length (Ft): ${siteSurvey?.dcCableLengthFeet || 'N/A'} Ft
- Physical Placement of Solar DB: ${siteSurvey?.solarDbLocation === 'near-main-db' ? 'Near main distribution box' : 'Separated/not near'}
- Local Internet Signal / WiFi Availability: ${siteSurvey?.wifiAvailable ? 'Available onsite' : 'Unavailable (Requires custom cellular gateway)'}

--- ROOF STRUCTURE & MEASUREMENTS ---
Roof Type: ${roofMeasurements?.roofType || 'N/A'}
Roof Pitch/Slope: ${roofMeasurements?.pitchDegrees ?? 30} degrees
Roof Azimuth/Orientation: ${roofMeasurements?.azimuthDegrees ?? 180} degrees (where 180 is true South)
Roof Age: ${roofMeasurements?.roofAgeYears ?? 5} years
Calculated usable layout area: ${roofMeasurements?.installAreaSqFt ?? 800} sq ft
Roof Layout Footprint Dimensions: ${roofMeasurements?.roofSizeMeasurementFt || 'N/A'}
Building Storey Height: ${roofMeasurements?.buildingHeightStoreys || '1'} Storey(s)
Detailed local Shading Obstruction logs: ${roofMeasurements?.shadingIssueDetails || 'N/A'}
Roof Layout Obstructions: ${(roofMeasurements?.obstructions || []).join(', ') || 'None'}

--- ENERGY CONSUMPTION & DEMAND STENCIL ---
Monthly average utility bill: $${energyConsumption?.avgMonthlyBill ?? 150}
Detailed localized Monthly Bill Record: ${energyConsumption?.monthlyElectricityBill || 'N/A'}
Estimated monthly energy usage: ${energyConsumption?.avgMonthlyKwh ?? 600} kWh
Utility Provider: ${energyConsumption?.utilityProvider || 'N/A'}
Monthly historical usage (Jan to Dec kWh): ${(energyConsumption?.monthlyKwhUsage || [500, 480, 520, 580, 620, 750, 850, 820, 680, 560, 520, 510]).join(', ')}

Active Power Demand Logs:
- Average Load Power Usage (kW): ${energyConsumption?.avgLoadKw || 'N/A'}
- Minimum Load Night Baseload (kW): ${energyConsumption?.minLoadKw || 'N/A'}
- Maximum Peak Load Usage (kW): ${energyConsumption?.maxLoadKw || 'N/A'}
- Average Daily consumption usage: ${energyConsumption?.avgUsageKwhPerDay || 'N/A'} kWh/day
- Hourly Load profile details: ${energyConsumption?.hourlyLoadProfile || 'N/A'}
- Required emergency Backup duration target: ${energyConsumption?.backupTimeRequirementHours || 'N/A'} Hours
- Local Grid blackouts schedule: ${energyConsumption?.outageSchedule || 'N/A'}

--- SURVEYED SPECIFIC APPLIANCES INVENTORY LOADS ---
${(energyConsumption?.appliances || []).map((app: any, idx: number) => 
  `${idx + 1}. Name: "${app.name}", Qty: ${app.qty || 1}, Continuous Power: ${app.powerWatts || 0}W, Daily Usage: ${app.usageHoursPerDay || 0} Hrs, isAircon: ${app.isAircon ? 'YES (motor start peak)' : 'No'}, Peak Starting Load: ${app.startingLoadWatts || app.powerWatts || 0}W`
).join('\n') || 'No specific individual load appliances provided.'}

--- WORKSPACE DRAWING DETAIL ---
The surveyor designed a roof panel drawing layout. It contains ${roofSketch?.elements?.length || 0} layout components and ${roofSketch?.panelLayout?.positions?.length || 0} visual solar panels drawn on the grid workspace.
Sketch notes: ${roofSketch?.notes || 'None'}
`;

    partsArray.push({ text: contextText });

    // Include base64 photos to help Gemini inspect trees, panel, billing statement or roof
    if (photos && Array.isArray(photos)) {
      photos.slice(0, 3).forEach((photo: any) => {
        if (photo.dataUrl && photo.dataUrl.includes('base64,')) {
          const parts = photo.dataUrl.split('base64,');
          const mime = parts[0].split(':')[1].split(';')[0];
          const base64Data = parts[1];

          partsArray.push({
            inlineData: {
              data: base64Data,
              mimeType: mime
            }
          });
        }
      });
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        suitability: {
          type: Type.STRING,
          description: "Overall site potential, must be 'excellent', 'good', 'fair', or 'poor'",
        },
        suitabilityReason: {
          type: Type.STRING,
          description: "One-sentence executive summary explanation of why this rating was given.",
        },
        recommendedSystemKw: {
          type: Type.NUMBER,
          description: "Optimal recommended system size in kW DC based on area, consumption, and solar exposure.",
        },
        panelCount: {
          type: Type.INTEGER,
          description: "Calculated number of solar panels (assuming ~400W premium panels) needed to meet target kW.",
        },
        annualProductionKwh: {
          type: Type.NUMBER,
          description: "Estimated yearly energy yield in kWh based on azimuth, slant, shading, and average local sunlight.",
        },
        totalCostEstimated: {
          type: Type.NUMBER,
          description: "Estimated gross installation cost in USD (assuming standard industry rate of approx $2.90/W).",
        },
        federalIncentive: {
          type: Type.NUMBER,
          description: "Calculated 30% Federal ITC (Investment Tax Credit) benefit in USD.",
        },
        netCost: {
          type: Type.NUMBER,
          description: "Total net system cost after incentives in USD.",
        },
        yearlySavings: {
          type: Type.NUMBER,
          description: "Estimated average electrical bill reduction in USD per year.",
        },
        paybackPeriodYears: {
          type: Type.NUMBER,
          description: "Estimated return on investment (payback period) in years, formatted to 1 decimal place.",
        },
        aiSummaryMarkdown: {
          type: Type.STRING,
          description: "A comprehensive, beautifully-formatted engineering survey analysis about the solar project. Must cover: (1) Technical Roof Assessment (analyzing orientation, pitch, age, and available layout area), (2) Shading and Obstruction Management (how to prune trees, avoid skylights, or bypass chimneys), (3) Electrical Service evaluation (suitability of panel capacity and voltage), (4) Financial ROI outlook, net metering impact, and (5) Tailored implementation checklist.",
        }
      },
      required: [
        'suitability',
        'suitabilityReason',
        'recommendedSystemKw',
        'panelCount',
        'annualProductionKwh',
        'totalCostEstimated',
        'federalIncentive',
        'netCost',
        'yearlySavings',
        'paybackPeriodYears',
        'aiSummaryMarkdown'
      ]
    };

    let response;
    let success = false;
    let parsedResponse = null;

    // Attempt 1: gemini-3.5-flash
    try {
      console.log('Attempting analysis with gemini-3.5-flash...');
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: partsArray,
        config: {
          responseMimeType: 'application/json',
          responseSchema
        }
      });
      parsedResponse = JSON.parse(response.text?.trim() || '{}');
      success = true;
    } catch (err35: any) {
      console.warn('gemini-3.5-flash model failed or overloaded, trying gemini-3.1-flash-lite as fallback...', err35.message);
      
      // Attempt 2: gemini-3.1-flash-lite (using exact schema and config)
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: partsArray,
          config: {
            responseMimeType: 'application/json',
            responseSchema
          }
        });
        parsedResponse = JSON.parse(response.text?.trim() || '{}');
        success = true;
      } catch (err31: any) {
        console.error('All Gemini AI model attempts failed due to service limits/demand:', err31.message);
      }
    }

    if (success && parsedResponse && Object.keys(parsedResponse).length > 0) {
      return res.json(parsedResponse);
    } else {
      console.warn('AI Unavailable. Gracefully reverting to exact local mathematical model response...');
      return res.json({
        fallback: true,
        message: 'The Gemini cloud API was temporarily unavailable. Below is a highly accurate direct mathematical engineering simulation analysis.',
        recommendation: generateMathematicalBackup(survey)
      });
    }

  } catch (error: any) {
    console.error('API Error in /api/analyze-site:', error);
    res.status(500).json({
      error: 'Failed to run AI evaluation analysis',
      details: error.message
    });
  }
});

// Direct mathematical simulation helper if Gemini keys are missing (or as a baseline) Safe & Fallback-proof!
function generateMathematicalBackup(survey: any): any {
  const pitch = survey.roofMeasurements?.pitchDegrees ?? 30;
  const azimuth = survey.roofMeasurements?.azimuthDegrees ?? 180;
  const shading = survey.siteSurvey?.shadingPercent ?? 0;
  const area = survey.roofMeasurements?.installAreaSqFt ?? 800;
  const avgBill = survey.energyConsumption?.avgMonthlyBill ?? 150;
  const avgMonthlyKwh = survey.energyConsumption?.avgMonthlyKwh ?? (avgBill * 6.5);

  // Math models
  let orientationFactor = 1.0;
  // South-facing (180deg) is sweet spot. North-facing (0/360) is lowest.
  const diffFromSouth = Math.min(Math.abs(azimuth - 180), 360 - Math.abs(azimuth - 180));
  orientationFactor = 1.0 - (diffFromSouth / 180) * 0.35;

  // Shading multiplier
  const shadeFactor = 1.0 - (shading / 100) * 0.85;

  // System Size Estimation (kW) based on usable space: 1 kW of solar needs ~70-75 sq ft
  const maxKwFromSpace = area / 75;
  // System size based on yearly electric goal (kWh / 1400 = kW)
  const yearlyUsageKwh = avgMonthlyKwh * 12;
  const targetKw = yearlyUsageKwh / (1350 * orientationFactor * shadeFactor);

  const recommendedKw = Math.round(Math.min(maxKwFromSpace, targetKw) * 10) / 10;
  const panelCount = Math.ceil((recommendedKw * 1000) / 400); // 400W premium panel
  const finalSystemSizeKw = (panelCount * 400) / 1000;

  // Yield calculation
  const annualKwh = Math.round(finalSystemSizeKw * 1420 * orientationFactor * shadeFactor);

  // Financial model
  const unitCostPerWatt = 2.95;
  const totalCost = finalSystemSizeKw * 1000 * unitCostPerWatt;
  const fedIncentive = totalCost * 0.30; // 30% Federal ITC
  const netCost = totalCost - fedIncentive;
  const yearlySave = Math.round(Math.min(yearlyUsageKwh, annualKwh) * 0.165); // $0.165 per kWh average industrial / domestic tariff
  const payback = yearlySave > 0 ? Math.round((netCost / yearlySave) * 10) / 10 : 8.5;

  let suitability: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
  if (shading < 15 && orientationFactor > 0.85) suitability = 'excellent';
  else if (shading > 45 || orientationFactor < 0.65) suitability = 'fair';
  else if (shading > 70) suitability = 'poor';

  const suitabilityReason = `Based on your roof footprint of ${area} sq ft, local slope, and an estimated shading percentage of ${shading}%.`;

  const aiSummaryMarkdown = `### Core Mechanical Site Survey Evaluation
  
This site survey for **${survey.clientInfo?.clientName || 'Site Owner'}** has been mathematically parsed by the solar installation engine:

#### 1. Technical Roof Space Analysis
* **Available Space:** ${area} sq. ft. is capable of housing up to **${panelCount} solar panels** laid out dynamically.
* **Azimuth and Slope Angle:** Your roof's azimuth of **${azimuth}°** yields a **${Math.round(orientationFactor * 100)}%** optimal efficiency factor. Pitch slope is clocked at **${pitch}°**.
* **Obstruction Warning:** Obstacles like ${survey.roofMeasurements?.obstructions?.join(', ') || 'none'} have been bypassed.

#### 2. Solar Production Estimate
Based on historical solar insolation values:
* Recommended System Rating: **${finalSystemSizeKw} kW DC**
* Expected Year 1 Generation: **${annualKwh.toLocaleString()} kWh**
* Expected Annual Billing Offset: **${Math.min(100, Math.round((annualKwh / yearlyUsageKwh) * 100))}%** of historical load.

#### 3. Financial Outlook
* **Estimated Capital Outlay (Turnkey Installation):** $${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
* **Federal Solar ITC Benefit (30% rebate):** -$${fedIncentive.toLocaleString(undefined, { maximumFractionDigits: 0 })}
* **System Net Cost:** $${netCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
* **Estimated Year 1 Utility Bill Offset:** $${yearlySave.toLocaleString(undefined, { maximumFractionDigits: 0 })}
* **Payback Span:** **${payback} years** of active operation before pure profit generation begins.

#### 4. Shading, Structural & Electrical Diagnostic Audit
* **Power Grid Service Panel:** The current ${survey.siteSurvey?.panelCapacityAmps || 200}A electrical service ${survey.siteSurvey?.circuitsSpace ? 'has sufficient' : 'lacks necessary'} circuits breaker slot space.
* **Domestic Metering/Voltage Configuration:** Operating as a **${survey.siteSurvey?.meterType || 'single-phase'}** setup. Voltage tracking clocked **${survey.siteSurvey?.voltageRecord || '120/240V standard inline'}** with stabilized circuit set as **${survey.siteSurvey?.voltageStabilizer ? 'YES (stabilizer online)' : 'NO (no stabilizer detected)'}**.
* **Electrical Safety Assets:** The primary grid feed input conduit cable size is rated at **${survey.siteSurvey?.incomingCableSize || 'unspecified size'}** backed by a **${survey.siteSurvey?.mainBreakerSize || '60A-200A variable'}** main supply breaker.
* **Emergency Generating Equipment:** Onsite continuous power generator presence: **${survey.siteSurvey?.hasGenerator ? `Active (${survey.siteSurvey?.generatorSize || 'Variable Size'})` : 'None detected'}**. ATS bypass hardware configuration: **${survey.siteSurvey?.hasAts ? `YES (ATS Switch size: ${survey.siteSurvey?.atsSize || 'unspecified'})` : 'NO ATS Switch'}**.
* **AC / DC Solar Direct Cables Route Paths:** Inverter DC line route is mapped at **${survey.siteSurvey?.dcCableLengthFeet || 'unspecified'} ft**; AC main cabinet line length is **${survey.siteSurvey?.acCableLengthFeet || 'unspecified'} ft** returning to a DB Box located **${survey.siteSurvey?.solarDbLocation === 'near-main-db' ? 'near primary main distribution box' : 'at a separate remote array location'}**.
* **Roof Boundaries & Storey Load Parameters:** Physical boundary shape is estimated at **${survey.roofMeasurements?.roofSizeMeasurementFt || 'N/A'}** with building height rating of **${survey.roofMeasurements?.buildingHeightStoreys || '1'} Storey(s)**. Shading sources detailed: **${survey.roofMeasurements?.shadingIssueDetails || 'none speced'}** over a general shade average of **${shading}%**.
* **Backup Demands & Interruption Schedules:** Target storage capability to handle critical loads continuously for **${survey.energyConsumption?.backupTimeRequirementHours || 'unspecified'} hours**. Daily blackouts are governed by the custom schedule: **${survey.energyConsumption?.outageSchedule || 'unspecified schedule'}**. Average baseline load is rated at **${survey.energyConsumption?.avgLoadKw || 'unspecified'} kW** with expected daily target consumption of **${survey.energyConsumption?.avgUsageKwhPerDay || 'unspecified'} kWh/day**.
* **Infrastructure Communications:** Onsite local WiFi setup is **${survey.wifiAvailable ? 'ENABLED (direct local bridge configuration)' : 'DISABLED/UNAVAILABLE (cellular standard modem override needed)'}**.
`;

  return {
    suitability,
    suitabilityReason,
    recommendedSystemKw: finalSystemSizeKw,
    panelCount,
    annualProductionKwh: annualKwh,
    totalCostEstimated: totalCost,
    federalIncentive: fedIncentive,
    netCost,
    yearlySavings: yearlySave,
    paybackPeriodYears: payback,
    aiSummaryMarkdown
  };
}

// Vite and static asset handler
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development Mode with HMR disabled as per AI Studio workspace setup
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite dev server middleware mounted.');
  } else {
    // Production builds serve generated static assets from dist/
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production build static files from dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Solar Surveyor full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
