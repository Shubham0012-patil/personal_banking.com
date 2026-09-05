import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  FileDown,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  PieChart,
  DollarSign,
  Utensils,
  Plane,
  ShoppingBag,
  Smartphone,
  GraduationCap,
  FileSpreadsheet,
  Film,
  HeartPulse,
  MoreHorizontal
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  PaymentMethod,
  PAYMENT_METHODS
} from '../types';
import { storage } from '../lib/storage';
import { generateExpensesPdf } from '../lib/pdfExport';
import { PinModal } from './PinModal';

interface ExpensesViewProps {
  onOpenPinSetup: () => void;
  searchFilter: string;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ searchFilter }) => {
  const expenses = storage.getExpenses();
  const summary = storage.getExpenseSummary();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [query, setQuery] = useState('');

  // Modals & form state
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<{
    amount: string;
    category: ExpenseCategory;
    date: string;
    paymentMethod: PaymentMethod;
    utrNumber: string;
    notes: string;
  }>({
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Google Pay',
    utrNumber: '',
    notes: ''
  });

  // PIN security states
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pinPromptTitle, setPinPromptTitle] = useState('Authorize Personal Expense');

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const formatCurrency = (amt: number) => {
    return '₹' + Math.round(amt).toLocaleString('en-IN');
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'Food':
        return <Utensils className="w-4 h-4" />;
      case 'Travel':
        return <Plane className="w-4 h-4" />;
      case 'Shopping':
        return <ShoppingBag className="w-4 h-4" />;
      case 'Recharge':
        return <Smartphone className="w-4 h-4" />;
      case 'Education':
        return <GraduationCap className="w-4 h-4" />;
      case 'Bills':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'Entertainment':
        return <Film className="w-4 h-4" />;
      case 'Medical':
        return <HeartPulse className="w-4 h-4" />;
      default:
        return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setForm({
      amount: '',
      category: 'Food',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Google Pay',
      utrNumber: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setForm({
      amount: String(exp.amount),
      category: exp.category,
      date: exp.date,
      paymentMethod: exp.paymentMethod,
      utrNumber: exp.utrNumber || '',
      notes: exp.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      showError('Please enter a valid expense amount greater than 0');
      return;
    }

    // Check duplicate UTR globally
    if (form.utrNumber && !storage.isCashOrNoUtr(form.utrNumber)) {
      const { isDuplicate, conflictRecord } = storage.checkDuplicateUtr(
        form.utrNumber,
        editingExpense?.id
      );
      if (isDuplicate && conflictRecord) {
        showError(
          `⚠ Duplicate UTR Number!\n\nThis payment UTR "${form.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}) on ${conflictRecord.date}.\n\nTransaction cannot be saved.`
        );
        return;
      }
    }

    // PIN Confirmation
    setPinPromptTitle(
      editingExpense
        ? `Authorize Edit Expense (${formatCurrency(amt)})`
        : `Confirm Expense of ${formatCurrency(amt)}`
    );

    setPendingAction(() => async () => {
      if (editingExpense) {
        const res = await storage.updateExpense(editingExpense.id, {
          amount: amt,
          category: form.category,
          date: form.date,
          paymentMethod: form.paymentMethod,
          utrNumber: form.utrNumber.trim() || undefined,
          notes: form.notes.trim() || undefined
        });
        if (res.success) {
          showSuccess('✓ Transaction Successfully Saved');
          setShowModal(false);
        } else {
          showError(res.error || 'Failed to update expense');
        }
      } else {
        const res = await storage.addExpense({
          amount: amt,
          category: form.category,
          date: form.date,
          paymentMethod: form.paymentMethod,
          utrNumber: form.utrNumber.trim() || undefined,
          notes: form.notes.trim() || undefined
        });
        if (res.success) {
          showSuccess('✓ Transaction Successfully Saved');
          setShowModal(false);
        } else {
          showError(res.error || 'Failed to add expense');
        }
      }
    });

    setShowPinModal(true);
  };

  const handleDelete = (exp: Expense) => {
    setPinPromptTitle(`Confirm Delete Expense of ${formatCurrency(exp.amount)}`);
    setPendingAction(() => async () => {
      await storage.deleteExpense(exp.id);
      showSuccess('✓ Expense deleted successfully');
    });
    setShowPinModal(true);
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    const q = (searchFilter || query).toLowerCase();
    const matchesQuery =
      exp.category.toLowerCase().includes(q) ||
      (exp.notes && exp.notes.toLowerCase().includes(q)) ||
      (exp.utrNumber && exp.utrNumber.toLowerCase().includes(q)) ||
      exp.paymentMethod.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategory === 'All' || exp.category === selectedCategory;

    const matchesDate = !dateFilter || exp.date === dateFilter;

    return matchesQuery && matchesCategory && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="whitespace-pre-line flex items-start gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* DASHBOARD: TODAY / MONTHLY / YEARLY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Today's Expense</p>
          <p className="text-xl font-bold text-slate-100 font-mono mt-1">
            {formatCurrency(summary.todayExpense)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Current day spend</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Monthly Expense</p>
          <p className="text-xl font-bold text-rose-400 font-mono mt-1">
            {formatCurrency(summary.monthlyExpense)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Calendar month total</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Yearly Expense</p>
            <p className="text-xl font-bold text-slate-100 font-mono mt-1">
              {formatCurrency(summary.yearlyExpense)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {summary.totalCount} total logged expenses
            </p>
          </div>
          <button
            onClick={() =>
              generateExpensesPdf({
                expenses,
                categoryFilter: selectedCategory
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
          >
            <FileDown className="w-4 h-4 text-rose-400" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* CATEGORY-WISE EXPENSE SUMMARY TILES */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Category Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {EXPENSE_CATEGORIES.map(cat => {
            const total = summary.categoryTotals[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'All' : cat)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-rose-500/10 border-rose-500/40 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{getCategoryIcon(cat)}</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {expenses.filter(e => e.category === cat).length} items
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-200 mt-2">{cat}</p>
                <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                  {formatCurrency(total)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
          />

          {(selectedCategory !== 'All' || dateFilter || query) && (
            <button
              onClick={() => {
                setSelectedCategory('All');
                setDateFilter('');
                setQuery('');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline px-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* EXPENSES DATA TABLE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/40">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Method & UTR</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching personal expenses found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{exp.date}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-200">
                        {getCategoryIcon(exp.category)}
                        <span>{exp.category}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">{exp.paymentMethod}</div>
                      {exp.utrNumber ? (
                        <div className="text-[10px] font-mono text-slate-400">
                          UTR: {exp.utrNumber}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500">No UTR / Cash</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {exp.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        title="Edit"
                        className="p-1.5 text-slate-400 hover:text-slate-200 mr-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exp)}
                        title="Delete"
                        className="p-1.5 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold mb-1">
              {editingExpense ? 'Edit Personal Expense' : 'Log Personal Expense'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Recorded in your independent expense ledger with unique UTR validation.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={e =>
                      setForm({ ...form, category: e.target.value as ExpenseCategory })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={e =>
                      setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  UTR Number (Globally Unique)
                </label>
                <input
                  type="text"
                  value={form.utrNumber}
                  onChange={e => setForm({ ...form, utrNumber: e.target.value })}
                  placeholder="e.g. UTR-GP-99887766 (or leave empty for cash)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes / Description
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Dinner with friends, fuel refill..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                <span className="text-[10px] text-slate-500">
                  Step 1: Check UTR → Step 2: Application PIN
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl"
                  >
                    Authorize with PIN
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION PIN MODAL */}
      <PinModal
        isOpen={showPinModal}
        title={pinPromptTitle}
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
