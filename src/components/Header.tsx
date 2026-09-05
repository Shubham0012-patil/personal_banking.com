import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Cloud,
  CloudOff,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  User,
  LogOut,
  Sparkles,
  Search
} from 'lucide-react';
import { storage } from '../lib/storage';
import { getSupabase } from '../lib/supabase';
import { ActiveTab } from '../types';

interface HeaderProps {
  currentTab?: ActiveTab;
  activeTab?: ActiveTab;
  onNavigate?: (tab: ActiveTab) => void;
  onSelectTab?: (tab: ActiveTab) => void;
  onOpenPinSetup?: () => void;
  onOpenQuickAdd?: (type: 'khata' | 'expense' | 'loan') => void;
  onLockSession?: () => void;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onSearch?: (q: string) => void;
  isAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  activeTab,
  onNavigate,
  onSelectTab,
  onOpenPinSetup,
  onOpenQuickAdd,
  onLockSession,
  onLogout,
  theme,
  onToggleTheme,
  searchQuery = '',
  onSearchChange,
  onSearch
}) => {
  const active = currentTab || activeTab || 'dashboard';
  const handleNav = (tab: ActiveTab) => {
    (onNavigate || onSelectTab)?.(tab);
  };
  const handleLock = () => {
    (onLockSession || onLogout)?.();
  };
  const handleSearch = (q: string) => {
    (onSearchChange || onSearch)?.(q);
  };

  const profile = storage.getProfile();
  const supabase = getSupabase();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const getTabTitle = () => {
    switch (active) {
      case 'dashboard':
        return 'Overview Dashboard';
      case 'khata':
        return 'Khata / Short-Term Ledger';
      case 'expenses':
        return 'Personal Expenses';
      case 'loans':
        return 'Long-Term Loans';
      case 'reports':
        return 'Financial Reports & PDF';
      case 'settings':
        return 'System Settings & Cloud';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Section Title & Global Search */}
        <div className="flex items-center gap-4 flex-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                {getTabTitle()}
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Personal Only
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full hidden lg:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across records, UTR, people..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* PIN Security Badge */}
          <button
            onClick={() => onOpenPinSetup?.()}
            title="Application PIN Protection Enabled - Click to configure"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 transition-all shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-mono">PIN Active</span>
          </button>

          {/* Supabase Status Indicator */}
          <button
            onClick={() => handleNav('settings')}
            title={
              supabase
                ? 'Supabase Cloud Connected'
                : 'Local Secure Storage active (Click to link Supabase Cloud)'
            }
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              supabase
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {supabase ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{supabase ? 'Cloud Synced' : 'Offline Vault'}</span>
          </button>

          {/* Quick Add Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-all shadow-md shadow-emerald-500/10 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">New Entry</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showQuickMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowQuickMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 text-slate-200 animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Quick Record
                  </div>
                  <button
                    onClick={() => {
                      setShowQuickMenu(false);
                      onOpenQuickAdd('khata');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Khata Transaction
                  </button>
                  <button
                    onClick={() => {
                      setShowQuickMenu(false);
                      onOpenQuickAdd('expense');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    Personal Expense
                  </button>
                  <button
                    onClick={() => {
                      setShowQuickMenu(false);
                      onOpenQuickAdd('loan');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Long-Term Loan
                  </button>
                </div>
              </>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                {(profile.name || 'User')
                  .split(' ')
                  .map(w => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'U'}
              </div>
              <div className="text-left hidden xl:block">
                <p className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[130px]">
                  {profile.name}
                </p>
                <p className="text-[10px] text-amber-400 leading-tight">Private Vault</p>
              </div>
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-slate-200 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm">
                      {(profile.name || 'User')
                        .split(' ')
                        .map(w => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'U'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-100 truncate">
                        {profile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  <div className="py-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenPinSetup?.();
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Configure Security PIN
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleNav('settings');
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      <Cloud className="w-3.5 h-3.5 text-slate-400" />
                      Supabase Cloud Setup
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLock();
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Lock Dashboard Session
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
