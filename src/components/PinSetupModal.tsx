import React, { useState, useEffect } from 'react';
import { KeyRound, X, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { storage } from '../lib/storage';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isFirstTime?: boolean;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isFirstTime = false
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasExistingPin = storage.hasPin();
  const requireCurrentPin = !isFirstTime && hasExistingPin;

  useEffect(() => {
    if (isOpen) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError('');
      setSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. If modifying an existing PIN, verify current PIN
    if (requireCurrentPin) {
      if (!currentPin) {
        setError('Please enter your current Application PIN.');
        return;
      }
      const isValidCurrent = await storage.verifyAppPin(currentPin);
      if (!isValidCurrent) {
        setError('Current Application PIN is incorrect.');
        return;
      }
    }

    // 2. Validate new PIN
    if (newPin.length !== pinLength) {
      setError(`New PIN must be exactly ${pinLength} digits.`);
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN and confirmation PIN do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save using Supabase set_app_pin RPC and local hash sync
      const res = await storage.setAppPin(newPin);
      if (!res.success) {
        throw new Error(res.error || 'Failed to save application PIN');
      }

      setSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose?.();
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to update PIN');
    }
  };

  return (
    <div
      id="pin-setup-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div
        id="pin-setup-card"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-100 relative animate-in fade-in zoom-in-95"
      >
        {!isFirstTime && (
          <button
            id="pin-setup-close-btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {isFirstTime || !hasExistingPin
                ? 'Create Application Transaction PIN'
                : 'Change Application PIN'}
            </h3>
            <p className="text-xs text-slate-400">
              {isFirstTime || !hasExistingPin
                ? 'Set up a 4 or 6-digit numeric PIN to authorize financial transactions'
                : 'Update your transaction confirmation PIN'}
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-100">Transaction PIN Configured</h4>
            <p className="text-xs text-slate-400 mt-1">
              Your PIN is securely hashed and ready to authorize actions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select PIN Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinLength(4);
                    setNewPin('');
                    setConfirmPin('');
                  }}
                  className={`py-2 px-3 text-xs rounded-xl border font-semibold transition-colors ${
                    pinLength === 4
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  4-Digit Numeric PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinLength(6);
                    setNewPin('');
                    setConfirmPin('');
                  }}
                  className={`py-2 px-3 text-xs rounded-xl border font-semibold transition-colors ${
                    pinLength === 6
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  6-Digit Numeric PIN
                </button>
              </div>
            </div>

            {requireCurrentPin && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Application PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter current PIN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New {pinLength}-Digit PIN
              </label>
              <input
                type="password"
                maxLength={pinLength}
                inputMode="numeric"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder={`Enter ${pinLength} digits`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 tracking-widest font-mono"
                required
                autoFocus={!requireCurrentPin}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm New {pinLength}-Digit PIN
              </label>
              <input
                type="password"
                maxLength={pinLength}
                inputMode="numeric"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter to confirm"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 tracking-widest font-mono"
                required
              />
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                This PIN is hashed on save and strictly required for adding, editing, or deleting transactions and loans.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              {!isFirstTime && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving PIN...' : 'Save Application PIN'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
