import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Database,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Lock,
  FileCode,
  Copy,
  Users,
  KeyRound
} from 'lucide-react';
import { storage } from '../lib/storage';
import { PinModal } from './PinModal';
import { SUPABASE_CONFIG, SUPABASE_SQL_SCHEMA } from '../lib/supabase';

interface SettingsViewProps {
  onOpenPinSetup: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenPinSetup }) => {
  const profile = storage.getUserProfile();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Pin modal for sensitive resets
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const handleUpdateName = () => {
    if (!nameInput.trim()) {
      showError('Please enter a valid name');
      return;
    }
    storage.updateUserProfile({ name: nameInput.trim() });
    setIsEditingName(false);
    showSuccess('✓ Account name updated successfully');
  };

  const handlePasswordReset = async () => {
    try {
      const res = await storage.requestPasswordReset(profile.email);
      if (res.success) {
        showSuccess('✓ Password reset link has been dispatched to your email');
      } else {
        showError(res.error || 'Failed to dispatch reset email');
      }
    } catch (err: any) {
      showError(err?.message || 'Error triggering password reset');
    }
  };

  const handleExportJson = () => {
    const backup = storage.exportAllData();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shubham_banking_nexmoney_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess('✓ Complete financial backup downloaded successfully');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const res = storage.importData(content);
      if (res.success) {
        showSuccess('✓ Application data restored successfully from backup');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showError(res.error || 'Failed to import backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    setPendingAction(() => () => {
      storage.resetAllData();
      showSuccess('✓ All ledger records in this private vault have been wiped and reset');
      setTimeout(() => window.location.reload(), 1000);
    });
    setShowPinModal(true);
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const initials = (profile.name || 'User')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100">
          Security & Application Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your personal vault profile, application transaction PIN, and multi-user cloud security.
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* USER PROFILE CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-300 flex items-center justify-center font-bold text-base">
              {initials}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{profile.name}</h3>
              <p className="text-xs text-slate-400">{profile.email}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Multi-User Isolated Vault
          </span>
        </div>

        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-[10px]">Registered Name</span>
              <button
                type="button"
                onClick={() => setIsEditingName(!isEditingName)}
                className="text-[10px] text-amber-400 hover:underline"
              >
                {isEditingName ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {isEditingName ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 flex-1 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleUpdateName}
                  className="px-2.5 py-1 bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                >
                  Save
                </button>
              </div>
            ) : (
              <span className="font-semibold text-slate-200 block">{profile.name}</span>
            )}
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">Primary Account Email</span>
            <span className="font-semibold text-slate-200 mt-0.5 block truncate">{profile.email}</span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handlePasswordReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Login Password via Email</span>
          </button>
        </div>
      </div>

      {/* MULTI-USER FAMILY SYSTEM CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Family Multi-User Architecture & Data Privacy
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Each family member maintains their own login credentials and separate private ledger vault.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1.5">
          <p>
            <strong>Strict Data Isolation:</strong> Every record (Khata transactions, personal expenses, and loans) is tagged with a distinct <code className="text-amber-400 font-mono">user_id</code>.
          </p>
          <p>
            <strong>PostgreSQL Row Level Security:</strong> Database policies enforce <code className="text-emerald-400 font-mono">auth.uid() = user_id</code> so no user can query or modify another user's private financial entries.
          </p>
          <p>
            <strong>UTR Uniqueness:</strong> Enforced per-user account via <code className="text-indigo-400 font-mono">UNIQUE(user_id, utr_number)</code>.
          </p>
        </div>
      </div>

      {/* APPLICATION TRANSACTION PIN CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Application Transaction Confirmation PIN
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                4 or 6-digit salted SHA-256 PIN required to authorize saves, edits, and deletions.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPinSetup}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors"
          >
            Change PIN
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300/90 leading-relaxed">
          <strong>Mandatory Safety Guarantee:</strong> This application PIN is strictly for in-app transaction confirmation. We never ask for or store your actual UPI PIN, bank password, or ATM credentials.
        </div>
      </div>

      {/* CLOUD STORAGE & SUPABASE CONFIG */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Supabase Cloud Database & Storage
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target database: PostgreSQL with Row Level Security (RLS) policies.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
          >
            <FileCode className="w-4 h-4" />
            <span>{showSqlSchema ? 'Hide SQL' : 'View SQL Schema'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">Supabase Project URL</span>
            <span className="font-mono text-slate-200 mt-0.5 block truncate">
              {SUPABASE_CONFIG.url}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">Row-Level Security (RLS)</span>
            <span className="font-semibold text-emerald-400 mt-0.5 block">
              Enforced Per-User (auth.uid() = user_id)
            </span>
          </div>
        </div>

        {showSqlSchema && (
          <div className="space-y-2 pt-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                PostgreSQL Schema with Multi-User RLS
              </span>
              <button
                onClick={copySql}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        )}
      </div>

      {/* BACKUP & RESTORE */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Data Backup & Restore
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Export encrypted JSON backup or restore past financial records for this private vault.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Encrypted JSON Backup</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Restore from JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* DANGER ZONE: DATA RESET */}
      <div className="p-5 sm:p-6 rounded-3xl bg-rose-950/20 border border-rose-900/40 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Reset Application Ledger Data</span>
            </h4>
            <p className="text-xs text-rose-300/70 mt-0.5 max-w-lg">
              Permanently wipe all Khata accounts, personal expenses, and long-term loans in your private vault. Requires your Application PIN to confirm.
            </p>
          </div>
          <button
            onClick={handleResetData}
            className="px-3.5 py-1.5 text-xs font-semibold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-xl transition-colors"
          >
            Wipe & Reset
          </button>
        </div>
      </div>

      {/* SENSITIVE ACTION PIN MODAL */}
      <PinModal
        isOpen={showPinModal}
        title="Authorize Reset with Security PIN"
        onSuccess={() => {
          setShowPinModal(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        onCancel={() => {
          setShowPinModal(false);
          setPendingAction(null);
        }}
      />
    </div>
  );
};
