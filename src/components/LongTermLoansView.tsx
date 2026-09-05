import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  Search,
  Filter,
  FileDown,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import {
  LongTermLoan,
  LoanRepayment,
  LoanType,
  LoanStatus,
  PaymentMethod,
  PAYMENT_METHODS
} from '../types';
import { storage } from '../lib/storage';
import { generateLoansPdf } from '../lib/pdfExport';
import { PinModal } from './PinModal';

interface LongTermLoansViewProps {
  onOpenPinSetup: () => void;
  searchFilter: string;
}

export const LongTermLoansView: React.FC<LongTermLoansViewProps> = ({ searchFilter }) => {
  const loans = storage.getLongTermLoans();
  const summary = storage.getLongTermLoanSummary();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Loan Modal state
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LongTermLoan | null>(null);
  const [loanForm, setLoanForm] = useState<{
    personName: string;
    loanType: LoanType;
    originalAmount: string;
    startDate: string;
    expectedReturnDate: string;
    paymentMethod: PaymentMethod;
    utrNumber: string;
    notes: string;
  }>({
    personName: '',
    loanType: 'Loan Given',
    originalAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    paymentMethod: 'Bank Transfer',
    utrNumber: '',
    notes: ''
  });

  // Repayment Modal state
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [targetLoanForRepayment, setTargetLoanForRepayment] = useState<LongTermLoan | null>(null);
  const [repaymentForm, setRepaymentForm] = useState<{
    amount: string;
    date: string;
    paymentMethod: PaymentMethod;
    utrNumber: string;
    notes: string;
  }>({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'PhonePe',
    utrNumber: '',
    notes: ''
  });

  // PIN security states
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pinPromptTitle, setPinPromptTitle] = useState('Authorize Loan Operation');

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

  const getStatusBadge = (status: LoanStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Active
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Partially Paid
          </span>
        );
      case 'Closed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Closed
          </span>
        );
      case 'Overdue':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Overdue
          </span>
        );
    }
  };

  // LOAN CREATE/EDIT
  const handleOpenAddLoan = () => {
    setEditingLoan(null);
    setLoanForm({
      personName: '',
      loanType: 'Loan Given',
      originalAmount: '',
      startDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: '',
      paymentMethod: 'Bank Transfer',
      utrNumber: '',
      notes: ''
    });
    setShowLoanModal(true);
  };

  const handleOpenEditLoan = (l: LongTermLoan) => {
    setEditingLoan(l);
    setLoanForm({
      personName: l.personName,
      loanType: l.loanType,
      originalAmount: String(l.originalAmount),
      startDate: l.startDate,
      expectedReturnDate: l.expectedReturnDate,
      paymentMethod: l.paymentMethod,
      utrNumber: l.utrNumber || '',
      notes: l.notes || ''
    });
    setShowLoanModal(true);
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amt = parseFloat(loanForm.originalAmount);
    if (isNaN(amt) || amt <= 0) {
      showError('Please enter a valid loan amount greater than 0');
      return;
    }

    if (!loanForm.expectedReturnDate) {
      showError('Please set an expected return date');
      return;
    }

    // Check duplicate UTR globally
    if (loanForm.utrNumber && !storage.isCashOrNoUtr(loanForm.utrNumber)) {
      const { isDuplicate, conflictRecord } = storage.checkDuplicateUtr(
        loanForm.utrNumber,
        editingLoan?.id
      );
      if (isDuplicate && conflictRecord) {
        showError(
          `⚠ Duplicate UTR Detected!\n\nThis payment UTR "${loanForm.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}) on ${conflictRecord.date}.\n\nTransaction cannot be saved.`
        );
        return;
      }
    }

    // Request PIN Confirmation
    setPinPromptTitle(
      editingLoan
        ? `Authorize Edit Loan (${formatCurrency(amt)})`
        : `Confirm Loan Entry of ${formatCurrency(amt)}`
    );

    setPendingAction(() => async () => {
      if (editingLoan) {
        const res = await storage.updateLongTermLoan(editingLoan.id, {
          personName: loanForm.personName.trim(),
          loanType: loanForm.loanType,
          originalAmount: amt,
          startDate: loanForm.startDate,
          expectedReturnDate: loanForm.expectedReturnDate,
          paymentMethod: loanForm.paymentMethod,
          utrNumber: loanForm.utrNumber.trim() || undefined,
          notes: loanForm.notes.trim() || undefined
        });
        if (res.success) {
          showSuccess('✓ Loan record updated successfully');
          setShowLoanModal(false);
        } else {
          showError(res.error || 'Failed to update loan');
        }
      } else {
        const res = await storage.addLongTermLoan({
          personName: loanForm.personName.trim(),
          loanType: loanForm.loanType,
          originalAmount: amt,
          startDate: loanForm.startDate,
          expectedReturnDate: loanForm.expectedReturnDate,
          paymentMethod: loanForm.paymentMethod,
          utrNumber: loanForm.utrNumber.trim() || undefined,
          notes: loanForm.notes.trim() || undefined
        });
        if (res.success) {
          showSuccess('✓ Loan Successfully Registered');
          setShowLoanModal(false);
        } else {
          showError(res.error || 'Failed to save loan');
        }
      }
    });

    setShowPinModal(true);
  };

  const handleDeleteLoan = (loan: LongTermLoan) => {
    setPinPromptTitle(`Confirm Delete Loan of ${loan.personName}`);
    setPendingAction(() => async () => {
      await storage.deleteLongTermLoan(loan.id);
      showSuccess(`✓ Deleted loan record for ${loan.personName}`);
    });
    setShowPinModal(true);
  };

  // REPAYMENT HANDLERS
  const handleOpenAddRepayment = (loan: LongTermLoan) => {
    setTargetLoanForRepayment(loan);
    const repaid = (loan.repayments || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const remaining = loan.originalAmount - repaid;

    setRepaymentForm({
      amount: String(remaining > 0 ? remaining : ''),
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'PhonePe',
      utrNumber: '',
      notes: ''
    });
    setShowRepaymentModal(true);
  };

  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLoanForRepayment) return;

    const amt = parseFloat(repaymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      showError('Please enter a valid repayment amount');
      return;
    }

    const repaidSoFar = (targetLoanForRepayment.repayments || []).reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );
    const remaining = targetLoanForRepayment.originalAmount - repaidSoFar;

    if (amt > remaining) {
      showError(
        `Repayment amount (${formatCurrency(amt)}) cannot exceed remaining balance (${formatCurrency(remaining)})`
      );
      return;
    }

    // Check duplicate UTR globally
    if (repaymentForm.utrNumber && !storage.isCashOrNoUtr(repaymentForm.utrNumber)) {
      const { isDuplicate, conflictRecord } = storage.checkDuplicateUtr(repaymentForm.utrNumber);
      if (isDuplicate && conflictRecord) {
        showError(
          `⚠ Duplicate UTR Detected!\n\nThis repayment UTR "${repaymentForm.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}) on ${conflictRecord.date}.\n\nTransaction cannot be saved.`
        );
        return;
      }
    }

    setPinPromptTitle(`Authorize Repayment of ${formatCurrency(amt)}`);
    setPendingAction(() => async () => {
      const res = await storage.addLoanRepayment(targetLoanForRepayment.id, {
        amount: amt,
        date: repaymentForm.date,
        paymentMethod: repaymentForm.paymentMethod,
        utrNumber: repaymentForm.utrNumber.trim() || undefined,
        notes: repaymentForm.notes.trim() || undefined
      });

      if (res.success) {
        if (amt === remaining) {
          showSuccess('✓ Loan Successfully Closed');
        } else {
          showSuccess('✓ Partial Repayment Successfully Recorded');
        }
        setShowRepaymentModal(false);
      } else {
        showError(res.error || 'Failed to record repayment');
      }
    });

    setShowPinModal(true);
  };

  const handleDeleteRepayment = (loanId: string, repId: string, amt: number) => {
    setPinPromptTitle(`Confirm Delete Repayment (${formatCurrency(amt)})`);
    setPendingAction(() => async () => {
      await storage.deleteLoanRepayment(loanId, repId);
      showSuccess('✓ Repayment entry removed and loan balance recalculated');
    });
    setShowPinModal(true);
  };

  // Filter loans
  const filteredLoans = loans.filter(l => {
    const q = (searchFilter || query).toLowerCase();
    const matchesQuery =
      l.personName.toLowerCase().includes(q) ||
      (l.notes && l.notes.toLowerCase().includes(q)) ||
      (l.utrNumber && l.utrNumber.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchesType = typeFilter === 'All' || l.loanType === typeFilter;

    return matchesQuery && matchesStatus && matchesType;
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

      {/* THREE LOAN METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Loans Given (Outstanding)</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-400 font-mono mt-1">
            {formatCurrency(summary.netGivenRemaining)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Original: {formatCurrency(summary.totalGiven)} | Recovered: {formatCurrency(summary.totalGivenReturned)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Loans Borrowed (Remaining)</span>
            <ArrowDownLeft className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-100 font-mono mt-1">
            {formatCurrency(summary.netBorrowedRemaining)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Original: {formatCurrency(summary.totalBorrowed)} | Repaid: {formatCurrency(summary.totalBorrowedReturned)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Portfolio Status</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-semibold text-emerald-400">
                {summary.activeCount} Active
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {summary.closedCount} Closed
              </span>
              {summary.overdueCount > 0 && (
                <span className="text-xs font-semibold text-rose-400">
                  {summary.overdueCount} Overdue
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {summary.totalLoansCount} contracts tracked
            </p>
          </div>
          <button
            onClick={() =>
              generateLoansPdf({
                loans,
                statusFilter
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>PDF Audit</span>
          </button>
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search loans, person, UTR..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="All">All Types</option>
            <option value="Loan Given">Loan Given</option>
            <option value="Loan Borrowed">Loan Borrowed</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Closed">Closed</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <button
          onClick={handleOpenAddLoan}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Long-Term Loan</span>
        </button>
      </div>

      {/* LOANS LIST */}
      <div className="space-y-4">
        {filteredLoans.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
            No long-term loans match the current filters.
          </div>
        ) : (
          filteredLoans.map(loan => {
            const totalRepaid = (loan.repayments || []).reduce(
              (sum, r) => sum + Number(r.amount || 0),
              0
            );
            const remaining = loan.originalAmount - totalRepaid;
            const progressPercent = Math.min(
              100,
              Math.round((totalRepaid / loan.originalAmount) * 100)
            );
            const isExpanded = expandedLoanId === loan.id;

            return (
              <div
                key={loan.id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 transition-all hover:border-slate-700"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-bold text-slate-100">
                        {loan.personName}
                      </h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          loan.loanType === 'Loan Given'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-blue-500/15 text-blue-300'
                        }`}
                      >
                        {loan.loanType}
                      </span>
                      {getStatusBadge(loan.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span>Start: {loan.startDate}</span>
                      <span>Return Due: {loan.expectedReturnDate}</span>
                      <span>Via: {loan.paymentMethod}</span>
                      {loan.utrNumber ? (
                        <span className="font-mono text-[11px] text-slate-300">
                          UTR: {loan.utrNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500">No UTR</span>
                      )}
                      {loan.closedDate && (
                        <span className="text-emerald-400 font-medium">
                          Closed on {loan.closedDate}
                        </span>
                      )}
                    </div>

                    {loan.notes && (
                      <p className="text-xs text-slate-400 pt-0.5">{loan.notes}</p>
                    )}
                  </div>

                  {/* Financials & Actions */}
                  <div className="flex items-center gap-5 justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-semibold text-slate-400">
                        Remaining Due
                      </p>
                      <p
                        className={`text-lg font-bold font-mono ${
                          remaining === 0 ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {formatCurrency(remaining)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Original: {formatCurrency(loan.originalAmount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {loan.status !== 'Closed' && (
                        <button
                          onClick={() => handleOpenAddRepayment(loan)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors"
                        >
                          Repayment
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditLoan(loan)}
                        title="Edit Loan Details"
                        className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteLoan(loan)}
                        title="Delete Loan"
                        className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          setExpandedLoanId(isExpanded ? null : loan.id)
                        }
                        title="Show Repayments History"
                        className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5 font-medium">
                    <span>
                      Total Repaid: {formatCurrency(totalRepaid)} ({progressPercent}%)
                    </span>
                    <span>
                      Remaining: {formatCurrency(remaining)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        remaining === 0 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* EXPANDED REPAYMENTS HISTORY */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Repayment Timeline ({loan.repayments?.length || 0})
                      </h5>
                      {loan.status !== 'Closed' && (
                        <button
                          onClick={() => handleOpenAddRepayment(loan)}
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Record Installment</span>
                        </button>
                      )}
                    </div>

                    {!loan.repayments || loan.repayments.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl">
                        No repayments recorded yet for this loan.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {loan.repayments.map((rep, idx) => (
                          <div
                            key={rep.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-slate-200">
                                  {rep.date} • {rep.paymentMethod}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {rep.utrNumber ? `UTR: ${rep.utrNumber}` : 'No UTR / Cash'}{' '}
                                  {rep.notes && `• ${rep.notes}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-emerald-400">
                                +{formatCurrency(rep.amount)}
                              </span>
                              <button
                                onClick={() =>
                                  handleDeleteRepayment(loan.id, rep.id, rep.amount)
                                }
                                title="Delete Repayment"
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT LOAN MODAL */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold mb-1">
              {editingLoan ? 'Edit Long-Term Loan' : 'Create Long-Term Loan Contract'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Completely separate from Khata and Expenses. Enforces global duplicate UTR check.
            </p>

            <form onSubmit={handleLoanSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={loanForm.personName}
                    onChange={e => setLoanForm({ ...loanForm, personName: e.target.value })}
                    placeholder="e.g. Sakshi, Vikram..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Loan Type *
                  </label>
                  <select
                    value={loanForm.loanType}
                    onChange={e =>
                      setLoanForm({ ...loanForm, loanType: e.target.value as LoanType })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  >
                    <option value="Loan Given">Loan Given (I lent money)</option>
                    <option value="Loan Borrowed">Loan Borrowed (I received loan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Original Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={loanForm.originalAmount}
                    onChange={e => setLoanForm({ ...loanForm, originalAmount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={loanForm.paymentMethod}
                    onChange={e =>
                      setLoanForm({
                        ...loanForm,
                        paymentMethod: e.target.value as PaymentMethod
                      })
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={loanForm.startDate}
                    onChange={e => setLoanForm({ ...loanForm, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Expected Return Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={loanForm.expectedReturnDate}
                    onChange={e =>
                      setLoanForm({ ...loanForm, expectedReturnDate: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  UTR Number (Globally Unique)
                </label>
                <input
                  type="text"
                  value={loanForm.utrNumber}
                  onChange={e => setLoanForm({ ...loanForm, utrNumber: e.target.value })}
                  placeholder="e.g. UTR-HDFC-99001122 (or leave empty for cash)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={loanForm.notes}
                  onChange={e => setLoanForm({ ...loanForm, notes: e.target.value })}
                  placeholder="e.g. Higher education, business advance..."
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
                    onClick={() => setShowLoanModal(false)}
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

      {/* RECORD REPAYMENT MODAL */}
      {showRepaymentModal && targetLoanForRepayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold mb-1">
              Record Loan Repayment
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Repayment against loan for <strong className="text-slate-200">{targetLoanForRepayment.personName}</strong>
            </p>

            <form onSubmit={handleRepaymentSubmit} className="space-y-3.5">
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
                    value={repaymentForm.amount}
                    onChange={e =>
                      setRepaymentForm({ ...repaymentForm, amount: e.target.value })
                    }
                    placeholder="e.g. 10000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={repaymentForm.date}
                    onChange={e =>
                      setRepaymentForm({ ...repaymentForm, date: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Method *
                  </label>
                  <select
                    value={repaymentForm.paymentMethod}
                    onChange={e =>
                      setRepaymentForm({
                        ...repaymentForm,
                        paymentMethod: e.target.value as PaymentMethod
                      })
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

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    UTR Number (Globally Unique)
                  </label>
                  <input
                    type="text"
                    value={repaymentForm.utrNumber}
                    onChange={e =>
                      setRepaymentForm({ ...repaymentForm, utrNumber: e.target.value })
                    }
                    placeholder="e.g. UTR-PP-1234..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={repaymentForm.notes}
                  onChange={e =>
                    setRepaymentForm({ ...repaymentForm, notes: e.target.value })
                  }
                  placeholder="e.g. Installment 1 of 3..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                <span className="text-[10px] text-slate-500">
                  Full repayment auto-closes loan
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRepaymentModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl"
                  >
                    Confirm with PIN
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
