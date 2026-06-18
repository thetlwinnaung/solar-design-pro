/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Sun, LogIn, UserPlus, ShieldAlert, KeyRound, Mail, Loader2, Users } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Validate inputs
    if (!email || !password) {
      setError('Please provide both email and password.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpErr) throw signUpErr;

        if (data.user) {
          // Check if auto-confirmed
          if (data.session) {
            onAuthSuccess(data.user);
          } else {
            setSuccessMsg('Registration successful! Since you are setting up family accounts, you can log in directly if e-mail confirmation is disabled key on Supabase.');
            setIsSignUp(false);
          }
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInErr) throw signInErr;

        if (data.user) {
          onAuthSuccess(data.user);
        }
      }
    } catch (err: any) {
      console.error('Supabase Authentication Error:', err);
      setError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        {/* Header Header branding */}
        <div className="bg-slate-900 px-6 py-8 text-center text-white relative">
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[9px] font-mono px-2 py-0.5 rounded border border-amber-500/30">
            <Users className="h-3 w-3" /> Family Portal
          </div>
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center mb-3">
            <Sun className="h-6 w-6 text-slate-900" />
          </div>
          <h2 className="text-lg font-black tracking-tight uppercase">Solar Surveyor Pro</h2>
          <p className="text-[11px] text-slate-300 mt-1">Family Collaborative Site Assessment Engine</p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex gap-2"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error:</span> {error}
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex gap-2"
            >
              <Users className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Notice:</span> {successMsg}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. dad@family.com"
                  className="w-full pl-9 pr-3 py-2 rounded border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all text-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all text-slate-900"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs select-none transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Please wait...
                </>
              ) : isSignUp ? (
                <>
                  <UserPlus className="h-4 w-4" /> Create Family Member Account
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Sign In to Workspace
                </>
              )}
            </button>
          </form>

          {/* Toggle Form Action */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-amber-600 hover:text-amber-700 font-bold focus:outline-none transition-colors"
            >
              {isSignUp ? 'Already have a family account? Sign In' : 'Need to add other family members? Sign Up here'}
            </button>
          </div>

          {/* Quick Info block describing the Setup requirements */}
          <div className="bg-slate-50 rounded border border-slate-150 p-3.5 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-tight text-slate-500 block">Supabase Setup Instructions</span>
            <p className="text-[9px] text-slate-500 leading-normal">
              To verify and allow multiple family members to collaborate:
            </p>
            <ol className="text-[9px] text-slate-500 list-decimal pl-4 space-y-1">
              <li>In your Supabase Dashboard, disable **'Confirm Email'** under **Authentication &gt; Providers &gt; Email** so accounts can sign in immediately.</li>
              <li>Under **SQL Editor**, run the database table creation scripts provided inside the app to let family members synchronize records.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
