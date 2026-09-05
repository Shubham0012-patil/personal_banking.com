import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  FileDown,
  Trash2,
  Edit2,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import {
  KhataPerson,
  KhataTransaction,
  KhataTransactionType,
  PaymentMethod,
  KHATA_TRANSACTION_TYPES,
  PAYMENT_METHODS
} from '../types';
import { storage } from '../lib/storage';
import { generateKhataPdf } from '../lib/pdfExport';
import { PinModal } from './PinModal';

interface KhataViewProps {
  onOpenPinSetup: () => void;
  searchFilter: string;
}

export const KhataView: React.FC<KhataViewProps> = ({ searchFilter }) => {
  const people = storage.getKhataPeople();
  const allTransactions = storage.getKhataTransactions();
  const summary = storage.getKhataSummary();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personSearch, setPersonSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Modals state
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<KhataPerson | null>(null);
  const [personForm, setPersonForm] = useState({ name: '', phone: '', notes: '' });

  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<KhataTransaction | null>(null);
  const [txForm, setTxForm] = useState<{
    personId: string;
    type: KhataTransactionType;
    amount: string;
    date: string;
    paymentMethod: PaymentMethod;
    utrNumber: string;
    notes: string;
  }>({
    personId: '',
    type: 'Money Given',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'PhonePe',
    utrNumber: '',
    notes: ''
  });

  // PIN security flow state
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinPromptTitle, setPinPromptTitle] = useState('Authorize Khata Transaction');

  // Notification banners
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

  // PERSON HANDLERS
  const handleOpenAddPerson = () => {
    setEditingPerson(null);
    setPersonForm({ name: '', phone: '', notes: '' });
    setShowPersonModal(true);
  };

  const handleOpenEditPerson = (p: KhataPerson) => {
    setEditingPerson(p);
    setPersonForm({ name: p.name, phone: p.phone || '', notes: p.notes || '' });
    setShowPersonModal(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personForm.name.trim()) return;

    if (editingPerson) {
      await storage.updateKhataPerson(editingPerson.id, personForm);
      showSuccess(`✓ Updated ${personForm.name}'s account`);
    } else {
      const created = await storage.addKhataPerson(personForm);
      showSuccess(`✓ Added ${personForm.name} to Khata ledger`);
      setSelectedPersonId(created.id);
    }
    setShowPersonModal(false);
  };

  const handleDeletePerson = (p: KhataPerson) => {
    setPinPromptTitle(`Confirm Delete ${p.name}'s Ledger`);
    setPendingAction(() => async () => {
      await storage.deleteKhataPerson(p.id);
      if (selectedPersonId === p.id) {
        setSelectedPersonId(null);
      }
      showSuccess(`✓ Deleted ${p.name}'s ledger and associated records`);
    });
    setShowPinModal(true);
  };

  // TRANSACTION HANDLERS
  const handleOpenAddTx = (defaultPersonId?: string) => {
    setEditingTx(null);
    setTxForm({
      personId: defaultPersonId || selectedPersonId || (people[0]?.id ?? ''),
      type: 'Money Given',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'PhonePe',
      utrNumber: '',
      notes: ''
    });
    setShowTxModal(true);
  };

  const handleOpenEditTx = (tx: KhataTransaction) => {
    setEditingTx(tx);
    setTxForm({
      personId: tx.personId,
      type: tx.type,
      amount: String(tx.amount),
      date: tx.date,
      paymentMethod: tx.paymentMethod,
      utrNumber: tx.utrNumber || '',
      notes: tx.notes || ''
    });
    setShowTxModal(true);
  };

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetPerson = people.find(p => p.id === txForm.personId);
    if (!targetPerson) {
      showError('Please select a valid person');
      return;
    }

    const amt = parseFloat(txForm.amount);
    if (isNaN(amt) || amt <= 0) {
      showError('Please enter a valid amount greater than 0');
      return;
    }

    // Pre-check duplicate UTR before asking for PIN
    if (txForm.utrNumber && !storage.isCashOrNoUtr(txForm.utrNumber)) {
      const { isDuplicate, conflictRecord } = storage.checkDuplicateUtr(
        txForm.utrNumber,
        editingTx?.id
      );
      if (isDuplicate && conflictRecord) {
        showError(
          `⚠ Duplicate UTR Detected!\nThis payment UTR "${txForm.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}) on ${conflictRecord.date}.\nTransaction cannot be saved.`
        );
        return;
      }
    }

    // Step: Request PIN confirmation
    setPinPromptTitle(
      editingTx
        ? `Authorize Edit (${formatCurrency(amt)})`
        : `Confirm Transaction of ${formatCurrency(amt)}`
    );

    setPendingAction(() => async () => {
      if (editingTx) {
        const res = await storage.updateKhataTransaction(editingTx.id, {
          personId: targetPerson.id,
          personName: targetPerson.name,
          type: txForm.type,
          amount: amt,
          date: txForm.date,
          paymentMethod: txForm.paymentMethod,
          utrNumber: txForm.utrNumber.trim() || undefined,
          notes: txForm.notes.trim() || undefined
        });

        if (res.success) {
          showSuccess('✓ Transaction Successfully Saved');
          setShowTxModal(false);
        } else {
          showError(res.error || 'Failed to update transaction');
        }
      } else {
        const res = await storage.addKhataTransaction({
          personId: targetPerson.id,
          personName: targetPerson.name,
          type: txForm.type,
          amount: amt,
          date: txForm.date,
          paymentMethod: txForm.paymentMethod,
          utrNumber: txForm.utrNumber.trim() || undefined,
          notes: txForm.notes.trim() || undefined
        });

        if (res.success) {
          showSuccess('✓ Transaction Successfully Saved');
          setShowTxModal(false);
        } else {
          showError(res.error || 'Failed to save transaction');
        }
      }
    });

    setShowPinModal(true);
  };

  const handleDeleteTx = (tx: KhataTransaction) => {
    setPinPromptTitle(`Confirm Delete Entry of ${formatCurrency(tx.amount)}`);
    setPendingAction(() => async () => {
      await storage.deleteKhataTransaction(tx.id);
      showSuccess('✓ Transaction deleted successfully');
    });
    setShowPinModal(true);
  };

  // Filter people list
  const filteredPeople = people.filter(p => {
    const q = (searchFilter || personSearch).toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q));
  });

  const activePerson = people.find(p => p.id === selectedPersonId);
  const activeLedger = activePerson ? storage.getPersonLedger(activePerson.id) : null;

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

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Receivable</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {formatCurrency(summary.totalReceivable)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Money to receive from others</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Payable</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-bold text-rose-400 font-mono mt-1">
            {formatCurrency(summary.totalPayable)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Money to return to others</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Active People Ledgers</p>
            <p className="text-xl font-bold text-slate-100 font-mono mt-1">
              {summary.peopleCount}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {summary.totalTransactionsCount} recorded transactions
            </p>
          </div>
          <button
            onClick={() => generateKhataPdf({ people, transactions: allTransactions })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>Full PDF</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN / MASTER-DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: PERSON LIST (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              People Directory ({filteredPeople.length})
            </h3>
            <button
              onClick={handleOpenAddPerson}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Person</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search person or phone..."
              value={personSearch}
              onChange={e => setPersonSearch(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredPeople.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                No person accounts found. Add a person to get started.
              </div>
            ) : (
              filteredPeople.map(p => {
                const ledger = storage.getPersonLedger(p.id);
                const isSelected = selectedPersonId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/40 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{p.name}</h4>
                        {p.phone && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{p.phone}</span>
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          ledger.balanceStatus === 'Receivable'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : ledger.balanceStatus === 'Payable'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {ledger.balanceStatus === 'Settled'
                          ? 'Settled'
                          : `${ledger.balanceStatus}: ${formatCurrency(ledger.remainingAmount)}`}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Given: {formatCurrency(ledger.totalGiven)}</span>
                      <span>Received: {formatCurrency(ledger.totalReceived)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE PERSON LEDGER DETAILS (8 cols) */}
        <div className="lg:col-span-8">
          {activePerson && activeLedger ? (
            <div className="space-y-5 bg-slate-900/80 border border-slate-800/90 rounded-3xl p-5 sm:p-6">
              {/* Person Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-100">
                      {activePerson.name}
                    </h2>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        activeLedger.balanceStatus === 'Receivable'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : activeLedger.balanceStatus === 'Payable'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Status: {activeLedger.balanceStatus}
                    </span>
                  </div>
                  {activePerson.notes && (
                    <p className="text-xs text-slate-400 mt-1">{activePerson.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddTx(activePerson.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Entry</span>
                  </button>

                  <button
                    onClick={() =>
                      generateKhataPdf({
                        people,
                        transactions: allTransactions,
                        personId: activePerson.id
                      })
                    }
                    title="Export Person PDF Ledger"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEditPerson(activePerson)}
                    title="Edit Person Details"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeletePerson(activePerson)}
                    title="Delete Person & Ledger"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Four Ledger KPI Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Total Given</p>
                  <p className="text-base font-bold text-slate-100 font-mono mt-0.5">
                    {formatCurrency(activeLedger.totalGiven)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Received Back</p>
                  <p className="text-base font-bold text-slate-100 font-mono mt-0.5">
                    {formatCurrency(activeLedger.totalReceived)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Remaining Due</p>
                  <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {formatCurrency(activeLedger.remainingAmount)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Current Balance</p>
                  <p
                    className={`text-base font-bold font-mono mt-0.5 ${
                      activeLedger.balanceStatus === 'Receivable'
                        ? 'text-emerald-400'
                        : activeLedger.balanceStatus === 'Payable'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatCurrency(activeLedger.remainingAmount)}
                  </p>
                </div>
              </div>

              {/* Transaction History Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Transaction History ({activeLedger.transactions.length})
                  </h4>
                </div>

                {activeLedger.transactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                    No transactions recorded with {activePerson.name} yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                          <th className="pb-2.5 font-semibold">Date</th>
                          <th className="pb-2.5 font-semibold">Type</th>
                          <th className="pb-2.5 font-semibold">Method & UTR</th>
                          <th className="pb-2.5 font-semibold">Notes</th>
                          <th className="pb-2.5 font-semibold text-right">Amount</th>
                          <th className="pb-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {activeLedger.transactions.map(tx => {
                          const isPositive =
                            tx.type === 'Money Given' || tx.type === 'Short-Term Loan Given';
                          return (
                            <tr key={tx.id} className="hover:bg-slate-950/40 transition-colors">
                              <td className="py-3 text-slate-300 whitespace-nowrap">
                                {tx.date}
                              </td>
                              <td className="py-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    isPositive
                                      ? 'bg-blue-500/15 text-blue-300'
                                      : 'bg-emerald-500/15 text-emerald-300'
                                  }`}
                                >
                                  {tx.type}
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="text-slate-200">{tx.paymentMethod}</div>
                                {tx.utrNumber ? (
                                  <div className="text-[10px] font-mono text-slate-400">
                                    UTR: {tx.utrNumber}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-500">No UTR / Cash</div>
                                )}
                              </td>
                              <td className="py-3 text-slate-400 max-w-xs truncate">
                                {tx.notes || '-'}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                                {formatCurrency(tx.amount)}
                              </td>
                              <td className="py-3 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenEditTx(tx)}
                                  title="Edit"
                                  className="p-1 text-slate-400 hover:text-slate-200 mr-1"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTx(tx)}
                                  title="Delete"
                                  className="p-1 text-slate-400 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-3xl text-slate-500">
              <Users className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-300">Select or Add a Person</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Choose any contact on the left to review their ledger balance, full transaction history, and export PDF statements.
              </p>
              <button
                onClick={handleOpenAddPerson}
                className="mt-4 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl"
              >
                Create New Person Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PERSON CREATE/EDIT MODAL */}
      {showPersonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold mb-1">
              {editingPerson ? 'Edit Person Account' : 'Add Person to Khata'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Individual account for managing short-term financial exchanges.
            </p>

            <form onSubmit={handleSavePerson} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={personForm.name}
                  onChange={e => setPersonForm({ ...personForm, name: e.target.value })}
                  placeholder="e.g. Sakshi, Rahul..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={personForm.phone}
                  onChange={e => setPersonForm({ ...personForm, phone: e.target.value })}
                  placeholder="e.g. +91 98234 56780"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={personForm.notes}
                  onChange={e => setPersonForm({ ...personForm, notes: e.target.value })}
                  placeholder="e.g. Friend, colleague, roommate..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPersonModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl"
                >
                  Save Person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION CREATE/EDIT MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold mb-1">
              {editingTx ? 'Edit Khata Transaction' : 'Record Financial Transaction'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Fields will be validated and protected by duplicate UTR check and Security PIN.
            </p>

            <form onSubmit={handleTxSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Person Name *
                  </label>
                  <select
                    required
                    value={txForm.personId}
                    onChange={e => setTxForm({ ...txForm, personId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  >
                    <option value="" disabled>
                      Select Person
                    </option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Transaction Type *
                  </label>
                  <select
                    value={txForm.type}
                    onChange={e =>
                      setTxForm({ ...txForm, type: e.target.value as KhataTransactionType })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  >
                    {KHATA_TRANSACTION_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    value={txForm.amount}
                    onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="e.g. 10000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={txForm.date}
                    onChange={e => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={txForm.paymentMethod}
                    onChange={e =>
                      setTxForm({ ...txForm, paymentMethod: e.target.value as PaymentMethod })
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
                    value={txForm.utrNumber}
                    onChange={e => setTxForm({ ...txForm, utrNumber: e.target.value })}
                    placeholder="e.g. UTR-123456789 (or leave empty for cash)"
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
                  value={txForm.notes}
                  onChange={e => setTxForm({ ...txForm, notes: e.target.value })}
                  placeholder="e.g. Lunch split, emergency advance..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                <span className="text-[10px] text-slate-500">
                  Step 1: Validate fields & UTR → Step 2: Application PIN
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTxModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl"
                  >
                    Proceed with PIN
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION CONFIRMATION PIN MODAL */}
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
