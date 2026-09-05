import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, AlertCircle, Lock, Delete } from 'lucide-react';
import { storage } from '../lib/storage';

interface PinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  title = 'Application Security PIN',
  description = 'Enter your transaction confirmation PIN to authorize this financial action.',
  onSuccess,
  onCancel
}) => {
  const profile = storage.getProfile();
  const pinLength = profile.pinLength || 4;
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length < pinLength) {
      const next = pin + digit;
      setPin(next);
      setError('');
      if (next.length === pinLength) {
        verify(next);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const verify = async (code: string) => {
    setIsVerifying(true);
    try {
      const isValid = await storage.verifyPin(code);
      if (isValid) {
        setIsVerifying(false);
        onSuccess();
      } else {
        setIsVerifying(false);
        setError('✕ Incorrect Security PIN');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');
      }
    } catch {
      setIsVerifying(false);
      setError('✕ Security verification error');
      setPin('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, pinLength);
    setPin(val);
    setError('');
    if (val.length === pinLength) {
      verify(val);
    }
  };

  return (
    <div
      id="pin-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div
        id="pin-modal-card"
        className={`w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 relative transition-transform ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        <button
          id="pin-modal-close-btn"
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>
        </div>

        {/* Masked PIN Indicator */}
        <div className="flex justify-center items-center gap-3 mb-4">
          {Array.from({ length: pinLength }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                i < pin.length
                  ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                  : 'bg-slate-800 border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Hidden input for keyboard on desktop */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={pinLength}
          value={pin}
          onChange={handleInputChange}
          className="opacity-0 absolute -z-10"
        />

        {error && (
          <div
            id="pin-error-alert"
            className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-lg mb-4"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              disabled={isVerifying}
              className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-lg font-semibold text-slate-200 transition-colors border border-slate-700/50"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isVerifying}
            className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-lg font-semibold text-slate-200 transition-colors border border-slate-700/50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isVerifying}
            className="h-12 rounded-xl text-slate-400 hover:text-slate-200 active:bg-slate-800 transition-colors flex items-center justify-center border border-slate-800"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <span className="text-[11px] text-slate-500">
            Default Security PIN is <strong className="text-slate-400 font-mono">1234</strong>{' '}
            (customizable in Settings)
          </span>
        </div>
      </div>
    </div>
  );
};
