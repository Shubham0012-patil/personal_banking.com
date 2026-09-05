import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  UserPlus,
  LogIn,
  AlertCircle,
  Landmark,
  User,
  KeyRound,
  Users,
  ShieldAlert,
  Key,
  Shield
} from 'lucide-react';
import { storage } from '../lib/storage';
import { getSupabase } from '../lib/supabase';
import { RegisteredAccount } from '../types';

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
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');

  // Registration form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regLoginPin, setRegLoginPin] = useState('');
  const [regTxnPin, setRegTxnPin] = useState('');

  // Sign In form fields
  const [loginPin, setLoginPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPins, setShowPins] = useState(false);

  // Status & multi-user account state
  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Load registered accounts on mount or mode change
  useEffect(() => {
    const accs = storage.getRegisteredAccounts();
    setRegisteredAccounts(accs);
    if (accs.length > 0 && !selectedAccountId && !email) {
      // Pre-select most recent account if available
      const mostRecent = [...accs].sort((a, b) => {
        const timeA = a.lastLoginAt || a.createdAt;
        const timeB = b.lastLoginAt || b.createdAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      })[0];
      if (mostRecent) {
        setSelectedAccountId(mostRecent.id);
        setEmail(mostRecent.identifier);
        if (mostRecent.hasLoginPin) {
          setLoginMethod('pin');
        }
      }
    }
  }, [isSignUpMode, isForgotMode]);

  if (!isOpen) return null;

  const handleSelectAccount = (account: RegisteredAccount) => {
    setSelectedAccountId(account.id);
    setEmail(account.identifier);
    setError('');
    setInfoMessage('');
    if (account.hasLoginPin) {
      setLoginMethod('pin');
    } else {
      setLoginMethod('password');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim()) {
      setError('Please provide your registered account email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await storage.requestPasswordReset(email.trim());
      setLoading(false);
      if (res.success) {
        setInfoMessage('✓ Password reset link has been dispatched to your email address.');
      } else {
        setError(res.error || 'Failed to dispatch password reset email. Ensure Supabase is configured.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Error sending password reset email');
    }
  };

  // REGISTRATION HANDLER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('Full Name is required.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('A valid Email Address is required.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    // Optional PIN validations
    const cleanLoginPin = regLoginPin.trim();
    const cleanTxnPin = regTxnPin.trim();

    if (cleanLoginPin && cleanLoginPin.length !== 4 && cleanLoginPin.length !== 6) {
      setError('Login PIN must be either 4 or 6 numeric digits.');
      return;
    }

    if (cleanTxnPin && cleanTxnPin.length !== 4 && cleanTxnPin.length !== 6) {
      setError('Transaction PIN must be either 4 or 6 numeric digits.');
      return;
    }

    // CRITICAL SECURITY RULE: Login PIN and Transaction PIN MUST NOT be identical
    if (cleanLoginPin && cleanTxnPin && cleanLoginPin === cleanTxnPin) {
      setError('Security Policy: Login PIN and Transaction PIN must not be identical. Please choose a different PIN for financial transactions.');
      return;
    }

    setLoading(true);

    try {
      // 1. If Supabase is connected, register with Supabase Auth
      const supabase = getSupabase();
      let supabaseUid: string | undefined;

      if (supabase) {
        try {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { full_name: cleanName }
            }
          });
          if (signUpError && !signUpError.message.includes('already registered')) {
            throw new Error(signUpError.message);
          }
          if (data?.user?.id) {
            supabaseUid = data.user.id;
          }
        } catch (sbErr: any) {
          // If Supabase fails due to network or duplicate, continue to local storage vault
          console.warn('Supabase sign-up attempt:', sbErr?.message);
        }
      }

      // 2. Register account in local storage with strict isolation and blank financial profile
      const regRes = await storage.registerAccount({
        name: cleanName,
        identifier: cleanEmail,
        accountType: 'Email',
        password,
        loginPin: cleanLoginPin || undefined,
        transactionPin: cleanTxnPin || undefined
      });

      if (!regRes.success || !regRes.account) {
        throw new Error(regRes.error || 'Failed to register account.');
      }

      // 3. Switch to the newly registered user and log them in
      storage.loginWithAccount(regRes.account);

      setLoading(false);
      onSuccess?.();
      onAuthenticated?.();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Registration failed. Please try again.');
    }
  };

  // SIGN IN HANDLER
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      const selectedAccount = registeredAccounts.find(
        a => a.identifier.toLowerCase() === cleanEmail || a.id === selectedAccountId
      );

      // Method A: Sign in with Login PIN
      if (loginMethod === 'pin') {
        const cleanPin = loginPin.trim();
        if (!cleanPin) {
          throw new Error('Please enter your 4 or 6 digit Login PIN.');
        }

        if (!selectedAccount) {
          throw new Error('No registered account found with this email. Please sign in with password or register.');
        }

        const isPinValid = await storage.verifyLoginPin(cleanPin, selectedAccount.id);
        if (!isPinValid) {
          throw new Error('Incorrect Login PIN. Please check your PIN or sign in with your password.');
        }

        storage.loginWithAccount(selectedAccount);
        setLoading(false);
        onSuccess?.();
        onAuthenticated?.();
        return;
      }

      // Method B: Sign in with Password
      if (!password) {
        throw new Error('Please enter your account password.');
      }

      const supabase = getSupabase();
      if (supabase) {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (signInErr) {
          // If Supabase rejected, also check local storage before giving up
          const localCheck = await storage.verifyAccountPassword(cleanEmail, password);
          if (localCheck.success && localCheck.account) {
            storage.loginWithAccount(localCheck.account);
            setLoading(false);
            onSuccess?.();
            onAuthenticated?.();
            return;
          }
          throw new Error(signInErr.message);
        }

        const user = data.user;
        const uid = user.id;
        const name = user.user_metadata?.full_name || cleanEmail.split('@')[0];

        // Find or register account locally
        let existing = registeredAccounts.find(a => a.id === uid || a.identifier.toLowerCase() === cleanEmail);
        if (!existing) {
          const newAcc = await storage.registerAccount({
            name,
            identifier: cleanEmail,
            accountType: 'Email',
            password
          });
          existing = newAcc.account;
        }

        if (existing) {
          storage.loginWithAccount(existing);
        } else {
          storage.setCurrentUser(uid, cleanEmail, name);
          storage.login();
        }

        setLoading(false);
        onSuccess?.();
        onAuthenticated?.();
        return;
      }

      // Local offline verification
      const verifyRes = await storage.verifyAccountPassword(cleanEmail, password);
      if (!verifyRes.success || !verifyRes.account) {
        // If no registered account found locally, but it's a first-time local session
        if (registeredAccounts.length === 0) {
          const autoReg = await storage.registerAccount({
            name: cleanEmail.split('@')[0],
            identifier: cleanEmail,
            accountType: 'Email',
            password
          });
          if (autoReg.account) {
            storage.loginWithAccount(autoReg.account);
            setLoading(false);
            onSuccess?.();
            onAuthenticated?.();
            return;
          }
        }
        throw new Error(verifyRes.error || 'Invalid credentials entered. Please verify or register.');
      }

      storage.loginWithAccount(verifyRes.account);
      setLoading(false);
      onSuccess?.();
      onAuthenticated?.();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Sign in failed. Please check your credentials.');
    }
  };

  const selectedAccount = registeredAccounts.find(
    a => a.identifier.toLowerCase() === email.trim().toLowerCase() || a.id === selectedAccountId
  );

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
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-xl shadow-emerald-500/10 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Landmark className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100 uppercase">
            NEXMONEY
          </h2>
          <p className="text-xs font-semibold text-emerald-400 tracking-wide mt-0.5">
            Personal Finance Management
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {isSignUpMode
              ? 'Create your private, isolated financial vault'
              : isForgotMode
              ? 'Reset your account password'
              : 'Sign in to access your personal financial dashboard'}
          </p>
        </div>

        {/* Multi-Account Switcher (Shown on Sign In if accounts exist) */}
        {!isSignUpMode && !isForgotMode && registeredAccounts.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Select Account
              </span>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-800/80 px-2 py-0.5 rounded-full">
                {registeredAccounts.length} {registeredAccounts.length === 1 ? 'vault' : 'vaults'} on device
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {registeredAccounts.map(acc => {
                const isSelected = acc.id === selectedAccountId || acc.identifier.toLowerCase() === email.toLowerCase();
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {acc.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate text-left">
                        <span className="font-semibold block text-slate-200 truncate leading-tight">
                          {acc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {acc.identifier}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {acc.hasLoginPin && (
                        <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded font-medium">
                          PIN
                        </span>
                      )}
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-1 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Security & Regulatory Notice */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 mb-5 text-[11px] text-slate-400 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-slate-300 font-semibold block">Multi-User Privacy Protection</span>
            <span className="text-[10px] leading-relaxed text-slate-400 block">
              Each user maintains a completely isolated financial vault. Personal Finance Management only — not a banking entity or payment gateway.
            </span>
          </div>
        </div>

        {/* Error & Info Alerts */}
        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px]">{infoMessage}</span>
          </div>
        )}

        {/* 1. FORGOT PASSWORD VIEW */}
        {isForgotMode ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
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
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Sending Reset Link...</span>
                </span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Password Reset Email</span>
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
        ) : isSignUpMode ? (
          /* 2. REGISTRATION VIEW (NEW USER ACCOUNT CREATION) */
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-name-input"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-email-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Password <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showConfirmPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-confirmpassword-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>

            {/* Optional Dual PIN Section */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-teal-400" />
                  Security PINs (Optional)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPins(!showPins)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                >
                  {showPins ? 'Hide PINs' : 'Show PINs'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Login PIN */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Login PIN <span className="text-slate-500">(4 or 6)</span>
                  </label>
                  <input
                    id="signup-loginpin-input"
                    type={showPins ? 'text' : 'password'}
                    maxLength={6}
                    value={regLoginPin}
                    onChange={e => setRegLoginPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Quick login"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 tracking-widest text-center"
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    For device sign in
                  </span>
                </div>

                {/* Transaction PIN */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Transaction PIN <span className="text-slate-500">(4 or 6)</span>
                  </label>
                  <input
                    id="signup-txnpin-input"
                    type={showPins ? 'text' : 'password'}
                    maxLength={6}
                    value={regTxnPin}
                    onChange={e => setRegTxnPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Transfers & PDF"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 tracking-widest text-center"
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Must not match Login PIN
                  </span>
                </div>
              </div>
            </div>

            <button
              id="signup-submit-button"
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Creating Isolated Vault...</span>
                </span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Private Account</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* 3. SIGN IN VIEW (PASSWORD OR LOGIN PIN) */
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Email Input */}
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
                  onChange={e => {
                    setEmail(e.target.value);
                    setSelectedAccountId(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>

            {/* Method Switcher: Password vs Login PIN */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
              <span className="text-xs font-semibold text-slate-300">
                {loginMethod === 'pin' ? 'Enter Login PIN' : 'Enter Password'}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`px-2 py-0.5 rounded-lg transition-colors font-medium ${
                    loginMethod === 'password'
                      ? 'bg-slate-800 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('pin')}
                  className={`px-2 py-0.5 rounded-lg transition-colors font-medium ${
                    loginMethod === 'pin'
                      ? 'bg-slate-800 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Login PIN
                </button>
              </div>
            </div>

            {loginMethod === 'pin' ? (
              <div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-pin-input"
                    type={showPassword ? 'text' : 'password'}
                    maxLength={6}
                    value={loginPin}
                    onChange={e => setLoginPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4 or 6 digit Login PIN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 tracking-widest text-center"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-200 absolute right-3.5 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Login PIN is configured per-device. If not set yet, switch to Password.
                </p>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-200 absolute right-3.5 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setError('');
                      setInfoMessage('');
                    }}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            )}

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Vault</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
                setPassword('');
                setConfirmPassword('');
                setRegLoginPin('');
                setRegTxnPin('');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {isSignUpMode ? (
                <span className="flex items-center justify-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Already have an account? Back to Sign In</span>
                </span>
              ) : (
                <span>Need a separate private vault? Create an Account</span>
              )}
            </button>
          </div>
        )}

        {/* Bottom Protocol Trust Indicators */}
        <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Row Level Security (RLS)
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            Zero-Knowledge Vault
          </span>
        </div>
      </div>
    </div>
  );
};
