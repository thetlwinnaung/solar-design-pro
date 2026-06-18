/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SolarSurvey, AiRecommendation } from '../types';
import { Sparkles, Brain, Loader2, Award, Zap, Shield, TrendingUp, AlertTriangle } from 'lucide-react';

interface AiAnalysisReportProps {
  survey: SolarSurvey;
  onAnalysisSuccess: (recommendation: AiRecommendation) => void;
}

const LOADING_PHASES = [
  'Decrypting geometric slant vectors...',
  'Evaluating shading bypass diodes clearance...',
  'Balancing monthly utility bill historical peaks...',
  'Modeling premium 400W cell cluster placement...',
  'Drafting executive financial payback ledger...'
];

export const AiAnalysisReport: React.FC<AiAnalysisReportProps> = ({ survey, onAnalysisSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const triggerAiSiteAnalysis = async () => {
    setLoading(true);
    setError(null);
    setLoadingPhaseIndex(0);

    // Rotate loading status text phases every 1.5 seconds to build immersion
    const interval = setInterval(() => {
      setLoadingPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 1500);

    try {
      const resp = await fetch('/api/analyze-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(survey),
      });

      if (!resp.ok) {
        throw new Error(`Server returned HTTP ${resp.status}`);
      }

      const data = await resp.json();
      clearInterval(interval);

      if (data.fallback) {
        // Fallback demo database trigger
        onAnalysisSuccess(data.recommendation);
        setError('Demo Mode: Running without a recorded Gemini API Key. Calculated local safety approximations instead.');
      } else {
        onAnalysisSuccess(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connecting to full-stack server failed. Please ensure the dev server restarted correctly.');
      clearInterval(interval);
    } finally {
      setLoading(false);
    }
  };

  const getSuitabilityColor = (suit: string) => {
    switch (suit?.toLowerCase()) {
      case 'excellent':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'good':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'fair':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-rose-700 bg-rose-50 border-rose-200';
    }
  };

  // Convert simple markdown elements (Headers, Bullets, Bold lines) to clean HTML safe layout
  const renderSimpleMarkdown = (markdownStr: string) => {
    if (!markdownStr) return null;

    const lines = markdownStr.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('####')) {
        return <h5 key={idx} className="font-display text-xs font-bold uppercase tracking-wider text-slate-700 mt-4 mb-1.5">{trimmed.replace(/####/g, '').trim()}</h5>;
      }
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} className="font-display text-sm font-bold text-slate-800 mt-5 first:mt-0 mb-3 border-b border-gray-100 pb-1 flex items-center gap-1.5">{trimmed.replace(/###/g, '').trim()}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={idx} className="font-display text-base font-black text-slate-900 mt-6 mb-3 border-b border-gray-200 pb-1.5">{trimmed.replace(/##/g, '').trim()}</h3>;
      }

      // Bullets
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const bulletText = trimmed.replace(/^[\*\-]\s*/, '');
        // Highlight bold in bullet lines
        const parts = bulletText.split('**');
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-gray-600 leading-relaxed mb-1.5">
            {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-gray-800">{part}</strong> : part)}
          </li>
        );
      }

      // Paragraph lines
      if (trimmed === '') return <div key={idx} className="h-2" />;

      // Highlight inline bold texts inside text blocks
      const textParts = trimmed.split('**');
      return (
        <p key={idx} className="text-xs text-gray-600 leading-relaxed mb-2">
          {textParts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-gray-800">{part}</strong> : part)}
        </p>
      );
    });
  };

  const report = survey.aiRecommendation;

  return (
    <div className="space-y-4 text-slate-900">
      <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-400 rounded-full"></span>
          AI SITE SUITABILITY REPORT
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">Gemini flash executive evaluation</span>
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-250 bg-yellow-50/70 p-3">
          <div className="flex gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-normal">
              {error}
            </div>
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="rounded-full bg-amber-50 p-3 text-amber-500 mb-2.5 animate-pulse">
            <Brain className="h-6 w-6" />
          </div>
          <h3 className="font-display text-xs font-bold uppercase tracking-tight text-slate-800">Compile Site Analysis Report</h3>
          <p className="mt-1 max-w-sm text-[10px] text-slate-500 leading-relaxed">
            Evaluates raw structural survey logs, shade matrices, micro inverter configurations, and visual drawings via Gemini for deep executive feedback.
          </p>
          <button
            type="button"
            onClick={triggerAiSiteAnalysis}
            className="mt-4 inline-flex items-center gap-1.5 rounded bg-slate-900 border border-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all select-none cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Run AI Engineering Audit
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center min-h-[220px]">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin mb-3" />
          <h4 className="font-display text-xs font-bold uppercase tracking-tight text-slate-800">Processing Site Survey...</h4>
          <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 px-3 py-1 rounded-full font-mono border border-amber-200/50 animate-pulse">
            {LOADING_PHASES[loadingPhaseIndex]}
          </p>
          <div className="mt-4 w-full max-w-xs bg-slate-100 rounded-full h-1 overflow-hidden">
            <div
              className="bg-slate-900 h-full transition-all duration-300"
              style={{ width: `${((loadingPhaseIndex + 1) / LOADING_PHASES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-4 animate-fade-in">
          {/* Executive Overview Cards */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded bg-amber-50 text-amber-600 p-2">
                  <Award className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Solar Engineering Report Card</h3>
                  <p className="text-[9px] text-slate-400">Audited {new Date(report.generatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className={`rounded border px-2.5 py-1 text-right ${getSuitabilityColor(report.suitability)}`}>
                <span className="text-[8px] uppercase font-bold block tracking-tighter opacity-75">Site Energy Potential</span>
                <span className="text-xs font-black uppercase tracking-wide">{report.suitability}</span>
              </div>
            </div>

            <div className="mt-2.5">
              <p className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-150 rounded p-2 z-10">
                👉 <span className="text-slate-900 font-extrabold">Executive Findings:</span> {report.suitabilityReason}
              </p>
            </div>

            {/* AI Generated Grid values */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded border border-slate-200 hover:bg-slate-50 p-2">
                <span className="text-[8px] text-slate-400 font-extrabold block uppercase tracking-tighter">RECOMMENDED SYSTEM</span>
                <span className="text-xs font-black font-mono text-slate-800">{report.recommendedSystemKw} kW</span>
              </div>
              <div className="rounded border border-slate-200 hover:bg-slate-50 p-2">
                <span className="text-[8px] text-slate-400 font-extrabold block uppercase tracking-tighter">PANELS REQUIRED</span>
                <span className="text-xs font-black font-mono text-slate-800">{report.panelCount} units</span>
              </div>
              <div className="rounded border border-slate-200 hover:bg-slate-50 p-2">
                <span className="text-[8px] text-slate-400 font-extrabold block uppercase tracking-tighter">ANNUAL GENERATION</span>
                <span className="text-xs font-black font-mono text-slate-800">{report.annualProductionKwh.toLocaleString()} kwh</span>
              </div>
              <div className="rounded border border-slate-200 hover:bg-slate-50 p-2">
                <span className="text-[8px] text-slate-400 font-extrabold block uppercase tracking-tighter">NET INVESTMENT</span>
                <span className="text-xs font-black text-amber-700 font-mono">${report.netCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* AI Comprehensive markdown Assessment */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-tighter text-amber-600 block mb-1.5 flex items-center gap-1">
              <Brain className="h-3.5 w-3.5" /> Comprehensive Technical Advisory Report
            </span>
            <div className="prose prose-sm max-w-none text-slate-700">
              {renderSimpleMarkdown(report.aiSummaryMarkdown)}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[9px] text-slate-400 gap-3">
              <span>Produced with real-time server evaluations via Google Gemini LLM frameworks.</span>
              <button
                type="button"
                onClick={triggerAiSiteAnalysis}
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[9px] text-slate-600 font-bold hover:bg-slate-50 outline-none cursor-pointer"
              >
                Re-Run Site Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
