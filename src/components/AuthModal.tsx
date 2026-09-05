import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  UserPlus,
  LogIn,
  AlertCircle,
  Landmark,
  User,
  KeyRound,
  Users
} from 'lucide-react';
import { storage } from '../lib/storage';
import { getSupabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen?: boolean;
  onSuccess?: () => void;
  onAuthenticated?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  onSuccess,
  onAuthenticated
}) => {
  const [fullName, setFullName] = useState('Shubham Godage');
  const [email, setEmail] = useState('forexwithshubham0012@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  if (!isOpen) return null;

  const selectFamilyPreset = (name: string, mail: string) => {
    setFullName(name);
    setEmail(mail);
    setError('');
    setInfoMessage('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim()) {
      setError('Please provide your registered account email');
      return;
    }

    setLoading(true);
    try {
      const res = await storage.requestPasswordReset(email.trim());
      setLoading(false);
      if (res.success) {
        setInfoMessage('✓ Password reset link has been dispatched to your email address.');
      } else {
        setError(res.error || 'Failed to dispatch password reset email');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Error sending password reset email');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!password) {
      setError('Please enter your account password');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabase();

      if (isSignUpMode) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }

        if (supabase) {
          // Register account through Supabase Auth
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim()
              }
            }
          });

          if (signUpError) {
            throw new Error(signUpError.message);
          }

          const user = data.user;
          const uid = user?.id || `user_${email.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
          storage.setCurrentUser(uid, email.trim(), fullName.trim());

          if (data.session) {
            storage.login();
            setLoading(false);
            onSuccess?.();
            onAuthenticated?.();
            return;
          } else {
            setLoading(false);
            setInfoMessage('✓ Account registered! You can now sign in with your credentials.');
            setIsSignUpMode(false);
            return;
          }
        } else {
          // Local fallback mode
          const uid = email.toLowerCase().includes('shubham')
            ? 'shubham_godage_primary'
            : `user_${email.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
          storage.setCurrentUser(uid, email.trim(), fullName.trim());
          storage.login();
          setLoading(false);
          onSuccess?.();
          onAuthenticated?.();
          return;
        }
      } else {
        // Sign In Mode
        if (supabase) {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });

          if (signInError) {
            throw new Error(signInError.message);
          }

          const user = data.user;
          const uid = user?.id || (email.toLowerCase().includes('shubham') ? 'shubham_godage_primary' : `user_${email.trim().replace(/[^a-zA-Z0-9]/g, '_')}`);
          const name = user?.user_metadata?.full_name || fullName.trim() || (email.toLowerCase().includes('shubham') ? 'Shubham Godage' : email.split('@')[0]);
          storage.setCurrentUser(uid, email.trim(), name);
          storage.login();
          setLoading(false);
          onSuccess?.();
          onAuthenticated?.();
        } else {
          // Offline / local fallback
          const uid = email.toLowerCase().includes('shubham')
            ? 'shubham_godage_primary'
            : `user_${email.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
          const name = fullName.trim() || (email.toLowerCase().includes('shubham') ? 'Shubham Godage' : email.split('@')[0]);
          storage.setCurrentUser(uid, email.trim(), name);
          storage.login();
          setLoading(false);
          onSuccess?.();
          onAuthenticated?.();
        }
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
    }
  };

  return (
    <div
      id="auth-screen-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl overflow-y-auto"
    >
      <div
        id="auth-card"
        className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 animate-in fade-in zoom-in-95 duration-200 my-8"
      >
        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-amber-500/10 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Landmark className="w-7 h-7 text-amber-400" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-100 uppercase leading-snug">
            Shubham Banking NexMoney
          </h2>
          <p className="text-xs font-semibold text-amber-400 tracking-wide mt-0.5">
            Personal Finance Management
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {isSignUpMode
              ? 'Register your private vault account'
              : isForgotMode
              ? 'Reset your account password'
              : 'Sign in to access your confidential financial vault'}
          </p>
        </div>

        {/* Multi-User Family Presets / Account Switcher */}
        {!isForgotMode && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Select Account / Vault
              </span>
              <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Strict Isolation
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => selectFamilyPreset('Shubham Godage', 'forexwithshubham0012@gmail.com')}
                className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                  email === 'forexwithshubham0012@gmail.com'
                    ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="font-bold block text-slate-200 truncate">Shubham Godage</span>
                <span className="text-[10px] text-amber-400/90 block">Primary Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (email === 'forexwithshubham0012@gmail.com') {
                    setFullName('');
                    setEmail('');
                  }
                  setIsSignUpMode(true);
                }}
                className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                  email !== 'forexwithshubham0012@gmail.com'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="font-bold block text-slate-200 truncate">+ Family Member</span>
                <span className="text-[10px] text-emerald-400/90 block">Private Separate Vault</span>
              </button>
            </div>
          </div>
        )}

        {/* Security Rule Notice */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 mb-4 text-[11px] text-slate-400 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Every user has their own completely isolated data. Row Level Security enforces that no user can ever see another person's financial records.
          </span>
        </div>

        {isForgotMode ? (
          /* Forgot Password Form */
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-[11px]">{error}</span>
              </div>
            )}

            {infoMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px]">{infoMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Sending Reset Email...</span>
                </span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setError('');
                  setInfoMessage('');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* Sign In & Sign Up Form */
          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">Authentication Error:</span>
                  <span className="text-[11px] text-rose-300/90">{error}</span>
                  {error.toLowerCase().includes('invalid login credentials') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUpMode(true);
                        setError('');
                      }}
                      className="mt-1.5 text-[11px] text-emerald-400 underline block font-medium"
                    >
                      Need to create this user account? Click here to Register.
                    </button>
                  )}
                </div>
              </div>
            )}

            {infoMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px]">{infoMessage}</span>
              </div>
            )}

            {/* Full Name field for sign up */}
            {isSignUpMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Holder Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-name-input"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Shubham Godage or Family Member Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>

            {/* Password field with show/hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isSignUpMode ? 'Create Login Password' : 'Login Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isSignUpMode ? 'Set a strong account password' : 'Enter account password'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 tracking-wide"
                  required
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-500">
                  Completely separate from Application Transaction PIN.
                </span>
                {!isSignUpMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setError('');
                      setInfoMessage('');
                    }}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </span>
              ) : isSignUpMode ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Private Vault</span>
                </>
              ) : (
                <>
                  <span>Sign In to Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Toggle between Sign In and Sign Up */}
        {!isForgotMode && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUpMode(!isSignUpMode);
                setError('');
                setInfoMessage('');
              }}
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
            >
              {isSignUpMode ? (
                <span className="flex items-center justify-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Already have an account? Back to Sign In</span>
                </span>
              ) : (
                <span>New family member or need an account? Register here</span>
              )}
            </button>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Row Level Security (RLS)
          </span>
          <span>Per-User Encryption</span>
        </div>
      </div>
    </div>
  );
};
