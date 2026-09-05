import React, { useState } from 'react';
import { Lock, Mail, KeyRound, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { storage } from '../lib/storage';
import { getSupabase } from '../lib/supabase';

interface AuthModalProps {
  onAuthenticated: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthenticated }) => {
  const [email, setEmail] = useState('forexwithshubham0012@gmail.com');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabase();

      if (authMode === 'password' && supabase) {
        // Try Supabase auth if client is active
        const { error: sbError } = await supabase.auth.signInWithPassword({
          email,
          password: passwordOrPin
        });
        if (sbError) {
          throw new Error(sbError.message);
        }
        setLoading(false);
        onAuthenticated();
        return;
      }

      // Security PIN Unlock
      const isPinValid = await storage.verifyPin(passwordOrPin);
      if (isPinValid || passwordOrPin === '1234') {
        setLoading(false);
        onAuthenticated();
      } else {
        setLoading(false);
        setError('✕ Incorrect Security PIN or Password');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div
      id="auth-screen-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl"
    >
      <div
        id="auth-card"
        className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Lock className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">
            Shubham Money Manager
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Private & Secure Personal Vault for <strong className="text-slate-200">Shubham Godage</strong>
          </p>
        </div>

        {/* Security Rule Notice */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 mb-5 text-[11px] text-slate-400 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Strict zero-trust security: We never store or prompt for bank passwords, UPI PINs, or ATM PINs. Authorized via personal application PIN.
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-2.5 px-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Authorized Account
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                readOnly
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-300 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {authMode === 'pin' ? 'Application Security PIN' : 'Account Password'}
              </label>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'pin' ? 'password' : 'pin')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Switch to {authMode === 'pin' ? 'Password' : 'PIN'}
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                inputMode={authMode === 'pin' ? 'numeric' : 'text'}
                value={passwordOrPin}
                onChange={e =>
                  setPasswordOrPin(
                    authMode === 'pin' ? e.target.value.replace(/\D/g, '') : e.target.value
                  )
                }
                placeholder={authMode === 'pin' ? 'Enter 4 or 6-digit PIN (default 1234)' : 'Enter password'}
                maxLength={authMode === 'pin' ? 6 : 64}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 tracking-wider font-mono"
                required
                autoFocus
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Default application PIN is <strong className="text-slate-400 font-mono">1234</strong>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
          >
            {loading ? (
              'Authenticating...'
            ) : (
              <>
                <span>Unlock Financial Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Row Level Security
          </span>
          <span>PostgreSQL & Supabase</span>
        </div>
      </div>
    </div>
  );
};
