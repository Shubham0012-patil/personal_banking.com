import React, { useState, useEffect } from 'react';
import { ActiveTab } from './types';
import { storage } from './lib/storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { KhataView } from './components/KhataView';
import { ExpensesView } from './components/ExpensesView';
import { LongTermLoansView } from './components/LongTermLoansView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';
import { PinSetupModal } from './components/PinSetupModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    storage.getAuthState().isAuthenticated
  );
  const [showAuthModal, setShowAuthModal] = useState<boolean>(!isAuthenticated);
  const [showPinSetupModal, setShowPinSetupModal] = useState<boolean>(false);
  const [dataRevision, setDataRevision] = useState<number>(0);

  // Quick Action Modal trigger
  const [quickAddType, setQuickAddType] = useState<'khata' | 'expense' | 'loan' | null>(null);

  const refreshData = () => {
    setDataRevision(prev => prev + 1);
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    refreshData();
  };

  const handleLogout = () => {
    storage.logout();
    setIsAuthenticated(false);
    setShowAuthModal(true);
  };

  const handleOpenQuickAdd = (type: 'khata' | 'expense' | 'loan') => {
    if (type === 'khata') {
      setActiveTab('khata');
    } else if (type === 'expense') {
      setActiveTab('expenses');
    } else {
      setActiveTab('loans');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onSearch={setSearchQuery}
        onOpenPinSetup={() => setShowPinSetupModal(true)}
        onOpenQuickAdd={handleOpenQuickAdd}
        onLogout={handleLogout}
        isAuthenticated={isAuthenticated}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar Desktop Navigation */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Content Area */}
        <main className="flex-1 pb-20 md:pb-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              key={dataRevision}
              onNavigate={setActiveTab}
              onOpenQuickAdd={handleOpenQuickAdd}
            />
          )}

          {activeTab === 'khata' && (
            <KhataView
              key={dataRevision}
              onOpenPinSetup={() => setShowPinSetupModal(true)}
              searchFilter={searchQuery}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              key={dataRevision}
              onOpenPinSetup={() => setShowPinSetupModal(true)}
              searchFilter={searchQuery}
            />
          )}

          {activeTab === 'loans' && (
            <LongTermLoansView
              key={dataRevision}
              onOpenPinSetup={() => setShowPinSetupModal(true)}
              searchFilter={searchQuery}
            />
          )}

          {activeTab === 'reports' && <ReportsView key={dataRevision} />}

          {activeTab === 'settings' && (
            <SettingsView
              key={dataRevision}
              onOpenPinSetup={() => setShowPinSetupModal(true)}
            />
          )}
        </main>
      </div>

      {/* Auth Modal for Shubham Godage */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Pin Setup / Change Modal */}
      {showPinSetupModal && (
        <PinSetupModal
          isOpen={showPinSetupModal}
          onClose={() => setShowPinSetupModal(false)}
          onSuccess={() => {
            setShowPinSetupModal(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
