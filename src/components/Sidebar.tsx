import React from 'react';
import {
  LayoutDashboard,
  BookOpenCheck,
  Receipt,
  Landmark,
  FileText,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  currentTab?: ActiveTab;
  activeTab?: ActiveTab;
  onNavigate?: (tab: ActiveTab) => void;
  onSelectTab?: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onNavigate,
  onSelectTab
}) => {
  const active = currentTab || activeTab || 'dashboard';
  const handleNav = (tab: ActiveTab) => {
    (onNavigate || onSelectTab)?.(tab);
  };
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: undefined
    },
    {
      id: 'khata' as ActiveTab,
      label: 'Khata Ledger',
      icon: BookOpenCheck,
      badge: 'Short-Term'
    },
    {
      id: 'expenses' as ActiveTab,
      label: 'Personal Expenses',
      icon: Receipt,
      badge: undefined
    },
    {
      id: 'loans' as ActiveTab,
      label: 'Long-Term Loans',
      icon: Landmark,
      badge: 'High Value'
    },
    {
      id: 'reports' as ActiveTab,
      label: 'PDF Reports',
      icon: FileText,
      badge: 'Export'
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings & Cloud',
      icon: Settings,
      badge: undefined
    }
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800/80 p-4 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-amber-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Landmark className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xs font-black tracking-tight text-slate-100 uppercase leading-snug">
                Shubham Banking
              </h2>
              <p className="text-[10px] font-black text-amber-400 tracking-wider">
                NEXMONEY
              </p>
              <p className="text-[9px] font-medium text-slate-400 -mt-0.5">
                Personal Finance Management
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-emerald-400'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Security Assurance Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] font-bold tracking-tight">Security Protocols</span>
          </div>
          <div className="space-y-1.5 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Global Unique UTR Guard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Confirmation PIN Verification</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Strict 3-Module Data Isolation</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 py-1 px-2 flex justify-around items-center">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] mt-1 font-medium tracking-tight">
                {item.id === 'expenses'
                  ? 'Expenses'
                  : item.id === 'loans'
                  ? 'Loans'
                  : item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
