import React from 'react';
import {
  BookOpenCheck,
  Receipt,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Calendar,
  Users,
  Clock,
  ChevronRight,
  TrendingDown,
  Sparkles,
  CreditCard,
  Plus
} from 'lucide-react';
import { storage } from '../lib/storage';
import { ActiveTab } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenQuickAdd: (type: 'khata' | 'expense' | 'loan') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickAdd
}) => {
  const khataSummary = storage.getKhataSummary();
  const expenseSummary = storage.getExpenseSummary();
  const loanSummary = storage.getLongTermLoanSummary();
  const globalUtrCount = storage.getGlobalUtrRecords().length;

  const formatCurrency = (amount: number) => {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Fintech Workspace</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Welcome, {storage.getCurrentUserName() || 'User'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            Your personal financial suite maintains three strictly separated ledgers with zero cross-calculation, guaranteed global UTR duplicate protection, and transaction PIN security.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{globalUtrCount} Unique UTRs Registered</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Zero Cross-Module Calculations Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* THREE INDEPENDENT SECTION CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CARD 1: KHATA / SHORT-TERM TRANSACTIONS */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 p-5 sm:p-6 flex flex-col justify-between hover:border-blue-500/30 transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                    1. Khata Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400">Short-Term People Accounts</p>
                </div>
              </div>
              <button
                onClick={() => onOpenQuickAdd('khata')}
                title="Add Khata Transaction"
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-500/20 hover:text-blue-300 text-slate-400 flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 my-4">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    You Will Receive (Receivable)
                  </p>
                  <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                    {formatCurrency(khataSummary.totalReceivable)}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    You Have To Give (Payable)
                  </p>
                  <p className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                    {formatCurrency(khataSummary.totalPayable)}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                {khataSummary.peopleCount} Tracked People
              </span>
              <span>{khataSummary.totalTransactionsCount} Entries</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('khata')}
            className="mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Khata Ledgers</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* CARD 2: PERSONAL EXPENSES */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 p-5 sm:p-6 flex flex-col justify-between hover:border-rose-500/30 transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                    2. Personal Expenses
                  </h3>
                  <p className="text-[11px] text-slate-400">Independent Daily Spend</p>
                </div>
              </div>
              <button
                onClick={() => onOpenQuickAdd('expense')}
                title="Add Expense"
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 my-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    Today
                  </p>
                  <p className="text-base font-bold text-slate-100 font-mono mt-0.5">
                    {formatCurrency(expenseSummary.todayExpense)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    This Month
                  </p>
                  <p className="text-base font-bold text-rose-400 font-mono mt-0.5">
                    {formatCurrency(expenseSummary.monthlyExpense)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    This Year Total
                  </p>
                  <p className="text-lg font-bold text-slate-100 font-mono mt-0.5">
                    {formatCurrency(expenseSummary.yearlyExpense)}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
              <span>9 Categories Tracked</span>
              <span>{expenseSummary.totalCount} Expenses Logged</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('expenses')}
            className="mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Expense Analytics</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* CARD 3: LONG-TERM LOANS */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 p-5 sm:p-6 flex flex-col justify-between hover:border-amber-500/30 transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                    3. Long-Term Loans
                  </h3>
                  <p className="text-[11px] text-slate-400">High-Value Loan Contracts</p>
                </div>
              </div>
              <button
                onClick={() => onOpenQuickAdd('loan')}
                title="Add Loan"
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-400 flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 my-4">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    Loans Given (Outstanding)
                  </p>
                  <p className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                    {formatCurrency(loanSummary.netGivenRemaining)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Recovered: {formatCurrency(loanSummary.totalGivenReturned)} / {formatCurrency(loanSummary.totalGiven)}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    Loans Borrowed (Remaining)
                  </p>
                  <p className="text-lg font-bold text-slate-200 font-mono mt-0.5">
                    {formatCurrency(loanSummary.netBorrowedRemaining)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Repaid: {formatCurrency(loanSummary.totalBorrowedReturned)}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
              <span>{loanSummary.activeCount} Active Contracts</span>
              <span>{loanSummary.closedCount} Closed</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('loans')}
            className="mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Long-Term Loans</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GLOBAL UTR VALIDATION BANNER */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/90 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">
              Global Duplicate UTR Protection Engine
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Every payment reference is indexed in real-time. No transaction across Khata, Expenses, Loans, or Repayments can be saved with an identical UTR.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('reports')}
          className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 shrink-0"
        >
          View UTR Audit Log
        </button>
      </div>
    </div>
  );
};
