import React, { useState, useEffect } from 'react';
import { ActiveTab } from './types';
import { storage } from './lib/storage';
import { getSupabase } from './lib/supabase';
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
  const [isFirstTimePin, setIsFirstTimePin] = useState<boolean>(false);
  const [dataRevision, setDataRevision] = useState<number>(0);

  const refreshData = () => {
    setDataRevision(prev => prev + 1);
  };

  useEffect(() => {
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  // Check Supabase session on initial mount
  useEffect(() => {
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          const user = data.session.user;
          const uid = user.id;
          const name = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Account User');
          storage.setCurrentUser(uid, user.email || '', name);
          setIsAuthenticated(true);
          setShowAuthModal(false);
          refreshData();
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          const user = session.user;
          const uid = user.id;
          const name = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Account User');
          storage.setCurrentUser(uid, user.email || '', name);
          setIsAuthenticated(true);
          setShowAuthModal(false);
          refreshData();
        }
      });

      return () => {
        listener?.subscription?.unsubscribe();
      };
    }
  }, []);

  // On first use, if authenticated but no transaction PIN configured, prompt setup
  useEffect(() => {
    if (isAuthenticated) {
      storage.checkHasAppPin().then(hasPin => {
        if (!hasPin) {
          setIsFirstTimePin(true);
          setShowPinSetupModal(true);
        }
      });
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = async () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    refreshData();
    const hasPin = await storage.checkHasAppPin();
    if (!hasPin) {
      setIsFirstTimePin(true);
      setShowPinSetupModal(true);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out:', err);
      }
    }
    storage.logout();
    setIsAuthenticated(false);
    setShowAuthModal(true);
  };

  const handleOpenPinSetup = (firstTime = false) => {
    setIsFirstTimePin(firstTime);
    setShowPinSetupModal(true);
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
        currentTab={activeTab}
        onSearch={setSearchQuery}
        onSearchChange={setSearchQuery}
        onNavigate={setActiveTab}
        onSelectTab={setActiveTab}
        onOpenPinSetup={() => handleOpenPinSetup(false)}
        onOpenQuickAdd={handleOpenQuickAdd}
        onLogout={handleLogout}
        onLockSession={handleLogout}
        isAuthenticated={isAuthenticated}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar Desktop Navigation */}
        <Sidebar
          activeTab={activeTab}
          currentTab={activeTab}
          onSelectTab={setActiveTab}
          onNavigate={setActiveTab}
        />

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
              onOpenPinSetup={() => handleOpenPinSetup(false)}
              searchFilter={searchQuery}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              key={dataRevision}
              onOpenPinSetup={() => handleOpenPinSetup(false)}
              searchFilter={searchQuery}
            />
          )}

          {activeTab === 'loans' && (
            <LongTermLoansView
              key={dataRevision}
              onOpenPinSetup={() => handleOpenPinSetup(false)}
              searchFilter={searchQuery}
            />
          )}

          {activeTab === 'reports' && <ReportsView key={dataRevision} />}

          {activeTab === 'settings' && (
            <SettingsView
              key={dataRevision}
              onOpenPinSetup={() => handleOpenPinSetup(false)}
            />
          )}
        </main>
      </div>

      {/* Auth Modal for Supabase Authentication */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onSuccess={handleAuthSuccess}
          onAuthenticated={handleAuthSuccess}
        />
      )}

      {/* Pin Setup / Change Modal */}
      {showPinSetupModal && (
        <PinSetupModal
          isOpen={showPinSetupModal}
          isFirstTime={isFirstTimePin}
          onClose={() => {
            setShowPinSetupModal(false);
            setIsFirstTimePin(false);
          }}
          onSuccess={() => {
            setShowPinSetupModal(false);
            setIsFirstTimePin(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
