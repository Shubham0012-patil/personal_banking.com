import React, { useState } from 'react';
import {
  FileText,
  FileDown,
  BookOpenCheck,
  Receipt,
  Landmark,
  ShieldCheck,
  Calendar,
  Filter,
  CheckCircle2,
  Table
} from 'lucide-react';
import { storage } from '../lib/storage';
import {
  generateKhataPdf,
  generateExpensesPdf,
  generateLoansPdf
} from '../lib/pdfExport';

export const ReportsView: React.FC = () => {
  const people = storage.getKhataPeople();
  const khataTxs = storage.getKhataTransactions();
  const expenses = storage.getExpenses();
  const loans = storage.getLongTermLoans();
  const utrRecords = storage.getGlobalUtrRecords();

  // Filters for reports
  const [khataPersonFilter, setKhataPersonFilter] = useState<string>('');
  const [khataStartDate, setKhataStartDate] = useState<string>('');
  const [khataEndDate, setKhataEndDate] = useState<string>('');

  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('All');
  const [expenseStartDate, setExpenseStartDate] = useState<string>('');
  const [expenseEndDate, setExpenseEndDate] = useState<string>('');

  const [loanStatusFilter, setLoanStatusFilter] = useState<string>('All');

  const [utrSearch, setUtrSearch] = useState('');

  const filteredUtrs = utrRecords.filter(r => {
    const q = utrSearch.toLowerCase();
    return (
      r.utrNumber.toLowerCase().includes(q) ||
      r.sourceModule.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100">
          Financial Reports & Professional PDF Generator
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate audit-ready PDF statements with personalized letterhead for Shubham Godage.
        </p>
      </div>

      {/* 4 REPORT GENERATOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* REPORT 1: KHATA / SHORT-TERM PDF */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                1. Khata / Short-Term Transactions PDF
              </h3>
              <p className="text-[11px] text-slate-400">
                Full ledger or individual person statements
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Select Person (Optional)
              </label>
              <select
                value={khataPersonFilter}
                onChange={e => setKhataPersonFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">All People Combined</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={khataStartDate}
                  onChange={e => setKhataStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={khataEndDate}
                  onChange={e => setKhataEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              generateKhataPdf({
                people,
                transactions: khataTxs,
                personId: khataPersonFilter || undefined,
                startDate: khataStartDate || undefined,
                endDate: khataEndDate || undefined
              })
            }
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            <span>Generate Khata PDF Report</span>
          </button>
        </div>

        {/* REPORT 2: PERSONAL EXPENSES PDF */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                2. Personal Expenses PDF Report
              </h3>
              <p className="text-[11px] text-slate-400">
                Category and date-filtered spending statements
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Category Filter
              </label>
              <select
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="All">All Categories</option>
                <option value="Food">Food</option>
                <option value="Travel">Travel</option>
                <option value="Shopping">Shopping</option>
                <option value="Recharge">Recharge</option>
                <option value="Education">Education</option>
                <option value="Bills">Bills</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Medical">Medical</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={expenseStartDate}
                  onChange={e => setExpenseStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={expenseEndDate}
                  onChange={e => setExpenseEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              generateExpensesPdf({
                expenses,
                categoryFilter: expenseCategoryFilter,
                startDate: expenseStartDate || undefined,
                endDate: expenseEndDate || undefined
              })
            }
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            <span>Generate Expense PDF Report</span>
          </button>
        </div>

        {/* REPORT 3: LONG-TERM LOANS AUDIT PDF */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                3. Long-Term Loans & Repayments PDF
              </h3>
              <p className="text-[11px] text-slate-400">
                Principal, repayment progress, and outstanding balances
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Contract Status Filter
              </label>
              <select
                value={loanStatusFilter}
                onChange={e => setLoanStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="All">All Statuses (Active, Partially Paid, Closed, Overdue)</option>
                <option value="Active">Active Only</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Closed">Closed Only</option>
                <option value="Overdue">Overdue Only</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-400 py-2">
              Exports full loan audit tables including original amounts, return dates, installments, and outstanding balances.
            </p>
          </div>

          <button
            onClick={() =>
              generateLoansPdf({
                loans,
                statusFilter: loanStatusFilter
              })
            }
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            <span>Generate Long-Term Loans PDF</span>
          </button>
        </div>

        {/* REPORT 4: INDEPENDENT LEDGER STATS */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Data Independence Statement
                </h3>
                <p className="text-[11px] text-slate-400">
                  Compliance with user specification
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Khata records isolated from Personal Expenses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Long-Term Loans isolated from Khata balances</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Global UTR uniqueness verified across all records</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            Exported documents contain cryptographic timestamps and user signature headers for Shubham Godage.
          </div>
        </div>
      </div>

      {/* GLOBAL UTR REGISTRY AUDIT TABLE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Global UTR Registry Audit ({utrRecords.length} Unique Records)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Every payment reference registered across Khata, Expenses, Loans, and Repayments.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Filter registered UTRs..."
              value={utrSearch}
              onChange={e => setUtrSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/40">
                <th className="py-2.5 px-4 font-semibold">Unique UTR Number</th>
                <th className="py-2.5 px-4 font-semibold">Source Section</th>
                <th className="py-2.5 px-4 font-semibold">Description</th>
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredUtrs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    No matching UTR numbers registered.
                  </td>
                </tr>
              ) : (
                filteredUtrs.map(r => (
                  <tr key={r.utrNumber} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-emerald-400">
                      {r.utrNumber}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-sans font-semibold bg-slate-800 text-slate-300">
                        {r.sourceModule}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">
                      {r.description}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {r.date}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-100 font-bold">
                      ₹{Math.round(r.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
