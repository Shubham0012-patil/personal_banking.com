import {
  KhataPerson,
  KhataTransaction,
  Expense,
  LongTermLoan,
  LoanRepayment,
  GlobalUtrRecord,
  UserProfile,
  ExpenseCategory,
  KhataTransactionType
} from '../types';
import { getSupabase } from './supabase';

const STORAGE_KEYS = {
  USER_PROFILE: 'smm_user_profile',
  KHATA_PEOPLE: 'smm_khata_people',
  KHATA_TRANSACTIONS: 'smm_khata_transactions',
  EXPENSES: 'smm_expenses',
  LONG_TERM_LOANS: 'smm_long_term_loans',
  GLOBAL_UTR: 'smm_global_utr'
};

// Simple async SHA-256 for PIN hashing
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`smm_salt_${pin}_shubham_fintech_2026`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Initial default seed data based on user specification
const DEFAULT_PROFILE: UserProfile = {
  name: 'Shubham Godage',
  email: 'forexwithshubham0012@gmail.com',
  pinHash: '', // Initialized in initStorage
  pinLength: 4,
  isPinSet: true
};

const DEFAULT_KHATA_PEOPLE: KhataPerson[] = [
  {
    id: 'person-sakshi-001',
    name: 'Sakshi',
    phone: '+91 98234 56780',
    notes: 'Colleague & personal friend',
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-09-04T12:00:00.000Z'
  },
  {
    id: 'person-rahul-002',
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    notes: 'Short term project expenses',
    createdAt: '2026-08-20T14:30:00.000Z',
    updatedAt: '2026-09-02T16:00:00.000Z'
  },
  {
    id: 'person-amit-003',
    name: 'Amit Patil',
    phone: '+91 97654 32109',
    notes: 'Local merchant & friend',
    createdAt: '2026-08-25T11:20:00.000Z',
    updatedAt: '2026-09-01T09:15:00.000Z'
  }
];

const DEFAULT_KHATA_TRANSACTIONS: KhataTransaction[] = [
  {
    id: 'kht-001',
    personId: 'person-sakshi-001',
    personName: 'Sakshi',
    type: 'Money Given',
    amount: 10000,
    date: '2026-08-16',
    paymentMethod: 'PhonePe',
    utrNumber: 'UTR-PP-98761234',
    notes: 'Emergency help for laptop purchase',
    createdAt: '2026-08-16T10:05:00.000Z'
  },
  {
    id: 'kht-002',
    personId: 'person-sakshi-001',
    personName: 'Sakshi',
    type: 'Money Received',
    amount: 7000,
    date: '2026-09-01',
    paymentMethod: 'Google Pay',
    utrNumber: 'UTR-GP-55443322',
    notes: 'Partial return via UPI',
    createdAt: '2026-09-01T15:30:00.000Z'
  },
  {
    id: 'kht-003',
    personId: 'person-rahul-002',
    personName: 'Rahul Sharma',
    type: 'Short-Term Loan Given',
    amount: 5000,
    date: '2026-08-22',
    paymentMethod: 'Paytm',
    utrNumber: 'UTR-PYTM-11223344',
    notes: 'Travel allowance advance',
    createdAt: '2026-08-22T08:00:00.000Z'
  },
  {
    id: 'kht-004',
    personId: 'person-amit-003',
    personName: 'Amit Patil',
    type: 'Short-Term Loan Borrowed',
    amount: 3000,
    date: '2026-08-28',
    paymentMethod: 'Cash',
    notes: 'Cash borrowed for urgent office supply',
    createdAt: '2026-08-28T18:45:00.000Z'
  }
];

const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp-001',
    amount: 500,
    category: 'Food',
    date: '2026-09-04',
    paymentMethod: 'Google Pay',
    utrNumber: 'UTR-GP-99887766',
    notes: 'Dinner at Bistro with team',
    createdAt: '2026-09-04T20:30:00.000Z'
  },
  {
    id: 'exp-002',
    amount: 1200,
    category: 'Travel',
    date: '2026-09-03',
    paymentMethod: 'PhonePe',
    utrNumber: 'UTR-PP-44332211',
    notes: 'Fuel refill for weekly commute',
    createdAt: '2026-09-03T09:15:00.000Z'
  },
  {
    id: 'exp-003',
    amount: 799,
    category: 'Recharge',
    date: '2026-09-01',
    paymentMethod: 'Paytm',
    utrNumber: 'UTR-PYTM-90908080',
    notes: 'Mobile postpaid monthly bill',
    createdAt: '2026-09-01T11:00:00.000Z'
  },
  {
    id: 'exp-004',
    amount: 4500,
    category: 'Shopping',
    date: '2026-08-25',
    paymentMethod: 'Bank Transfer',
    utrNumber: 'UTR-HDFC-66778899',
    notes: 'Ergonomic desk accessories',
    createdAt: '2026-08-25T16:20:00.000Z'
  },
  {
    id: 'exp-005',
    amount: 2150,
    category: 'Bills',
    date: '2026-08-20',
    paymentMethod: 'Bank Transfer',
    utrNumber: 'UTR-SBI-33221100',
    notes: 'High-speed broadband quarterly bill',
    createdAt: '2026-08-20T10:00:00.000Z'
  }
];

const DEFAULT_LONG_TERM_LOANS: LongTermLoan[] = [
  {
    id: 'loan-001',
    personName: 'Sakshi',
    loanType: 'Loan Given',
    originalAmount: 50000,
    startDate: '2026-07-01',
    expectedReturnDate: '2026-12-31',
    paymentMethod: 'Bank Transfer',
    utrNumber: 'UTR-HDFC-99001122',
    notes: 'Long term educational support loan',
    status: 'Partially Paid',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-08-10T11:00:00.000Z',
    repayments: [
      {
        id: 'rep-001',
        loanId: 'loan-001',
        amount: 10000,
        date: '2026-08-01',
        paymentMethod: 'PhonePe',
        utrNumber: 'UTR-PP-77665544',
        notes: 'First installment repayment',
        createdAt: '2026-08-01T12:00:00.000Z'
      },
      {
        id: 'rep-002',
        loanId: 'loan-001',
        amount: 5000,
        date: '2026-08-20',
        paymentMethod: 'Google Pay',
        utrNumber: 'UTR-GP-12344321',
        notes: 'Second installment repayment',
        createdAt: '2026-08-20T15:00:00.000Z'
      },
      {
        id: 'rep-003',
        loanId: 'loan-001',
        amount: 10000,
        date: '2026-09-02',
        paymentMethod: 'Bank Transfer',
        utrNumber: 'UTR-ICICI-88776655',
        notes: 'Third installment repayment',
        createdAt: '2026-09-02T11:30:00.000Z'
      }
    ]
  },
  {
    id: 'loan-002',
    personName: 'Vikram Joshi',
    loanType: 'Loan Borrowed',
    originalAmount: 100000,
    startDate: '2026-06-15',
    expectedReturnDate: '2026-11-30',
    paymentMethod: 'Bank Transfer',
    utrNumber: 'UTR-AXIS-55667788',
    notes: 'Short business expansion capital borrowed',
    status: 'Active',
    createdAt: '2026-06-15T14:00:00.000Z',
    updatedAt: '2026-06-15T14:00:00.000Z',
    repayments: []
  }
];

class StorageService {
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  public async init() {
    if (this.initialized) return;

    // Initialize user profile with default PIN "1234" if not present
    const existingProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!existingProfile) {
      const defaultPinHash = await hashPin('1234');
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        pinHash: defaultPinHash
      };
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    }

    // Initialize default data if empty
    if (!localStorage.getItem(STORAGE_KEYS.KHATA_PEOPLE)) {
      localStorage.setItem(STORAGE_KEYS.KHATA_PEOPLE, JSON.stringify(DEFAULT_KHATA_PEOPLE));
    }
    if (!localStorage.getItem(STORAGE_KEYS.KHATA_TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.KHATA_TRANSACTIONS, JSON.stringify(DEFAULT_KHATA_TRANSACTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LONG_TERM_LOANS)) {
      localStorage.setItem(STORAGE_KEYS.LONG_TERM_LOANS, JSON.stringify(DEFAULT_LONG_TERM_LOANS));
    }

    this.rebuildGlobalUtrRegistry();
    this.initialized = true;
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error('Listener notification error:', e);
      }
    });
  }

  // PROFILE & PIN METHODS
  public getProfile(): UserProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return DEFAULT_PROFILE;
  }

  public getUserProfile(): UserProfile {
    return this.getProfile();
  }

  public getAuthState(): { isAuthenticated: boolean; user: UserProfile } {
    const isAuth = localStorage.getItem('smm_auth_status') === 'authenticated';
    return {
      isAuthenticated: isAuth,
      user: this.getProfile()
    };
  }

  public login(): void {
    localStorage.setItem('smm_auth_status', 'authenticated');
    this.notify();
  }

  public logout(): void {
    localStorage.removeItem('smm_auth_status');
    this.notify();
  }

  public async verifyPin(enteredPin: string): Promise<boolean> {
    const profile = this.getProfile();
    if (!profile.pinHash) {
      // If no hash yet, check if entered is default '1234'
      return enteredPin === '1234';
    }
    const enteredHash = await hashPin(enteredPin);
    return enteredHash === profile.pinHash;
  }

  public async setPin(newPin: string): Promise<boolean> {
    if (newPin.length !== 4 && newPin.length !== 6) {
      throw new Error('PIN must be either 4 or 6 digits');
    }
    const newHash = await hashPin(newPin);
    const currentProfile = this.getProfile();
    const updated: UserProfile = {
      ...currentProfile,
      pinHash: newHash,
      pinLength: newPin.length as 4 | 6,
      isPinSet: true
    };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    this.notify();
    return true;
  }

  // GLOBAL UTR REGISTRY & DUPLICATE PROTECTION
  public normalizeUtr(utr?: string): string {
    if (!utr) return '';
    return utr.trim().toUpperCase().replace(/\s+/g, '');
  }

  public isCashOrNoUtr(utr?: string): boolean {
    if (!utr) return true;
    const normalized = utr.trim().toLowerCase();
    return (
      normalized === '' ||
      normalized === 'cash' ||
      normalized === 'no utr' ||
      normalized === 'no utr available' ||
      normalized === 'none' ||
      normalized === 'n/a'
    );
  }

  public rebuildGlobalUtrRegistry(): GlobalUtrRecord[] {
    const records: GlobalUtrRecord[] = [];

    // 1. From Khata
    const khata = this.getKhataTransactions();
    for (const item of khata) {
      if (item.utrNumber && !this.isCashOrNoUtr(item.utrNumber)) {
        const norm = this.normalizeUtr(item.utrNumber);
        records.push({
          utrNumber: norm,
          sourceModule: 'Khata',
          referenceId: item.id,
          amount: item.amount,
          date: item.date,
          description: `Khata (${item.personName} - ${item.type})`,
          createdAt: item.createdAt
        });
      }
    }

    // 2. From Expenses
    const expenses = this.getExpenses();
    for (const item of expenses) {
      if (item.utrNumber && !this.isCashOrNoUtr(item.utrNumber)) {
        const norm = this.normalizeUtr(item.utrNumber);
        records.push({
          utrNumber: norm,
          sourceModule: 'Expense',
          referenceId: item.id,
          amount: item.amount,
          date: item.date,
          description: `Personal Expense (${item.category})`,
          createdAt: item.createdAt
        });
      }
    }

    // 3. From Long-Term Loans
    const loans = this.getLongTermLoans();
    for (const item of loans) {
      if (item.utrNumber && !this.isCashOrNoUtr(item.utrNumber)) {
        const norm = this.normalizeUtr(item.utrNumber);
        records.push({
          utrNumber: norm,
          sourceModule: 'LongTermLoan',
          referenceId: item.id,
          amount: item.originalAmount,
          date: item.startDate,
          description: `Long-Term Loan (${item.personName} - ${item.loanType})`,
          createdAt: item.createdAt
        });
      }

      // Repayments
      if (item.repayments && Array.isArray(item.repayments)) {
        for (const rep of item.repayments) {
          if (rep.utrNumber && !this.isCashOrNoUtr(rep.utrNumber)) {
            const norm = this.normalizeUtr(rep.utrNumber);
            records.push({
              utrNumber: norm,
              sourceModule: 'LoanRepayment',
              referenceId: rep.id,
              amount: rep.amount,
              date: rep.date,
              description: `Loan Repayment for ${item.personName}`,
              createdAt: rep.createdAt
            });
          }
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.GLOBAL_UTR, JSON.stringify(records));
    return records;
  }

  public getGlobalUtrRecords(): GlobalUtrRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.GLOBAL_UTR);
    if (!raw) return this.rebuildGlobalUtrRegistry();
    try {
      return JSON.parse(raw);
    } catch {
      return this.rebuildGlobalUtrRegistry();
    }
  }

  public checkDuplicateUtr(
    utrNumber?: string,
    excludeReferenceId?: string
  ): { isDuplicate: boolean; conflictRecord?: GlobalUtrRecord } {
    if (!utrNumber || this.isCashOrNoUtr(utrNumber)) {
      return { isDuplicate: false };
    }

    const norm = this.normalizeUtr(utrNumber);
    const records = this.getGlobalUtrRecords();

    const match = records.find(
      r => r.utrNumber === norm && (!excludeReferenceId || r.referenceId !== excludeReferenceId)
    );

    if (match) {
      return { isDuplicate: true, conflictRecord: match };
    }
    return { isDuplicate: false };
  }

  // ==========================================
  // SECTION 1: KHATA / SHORT-TERM TRANSACTIONS
  // ==========================================
  public getKhataPeople(): KhataPerson[] {
    const raw = localStorage.getItem(STORAGE_KEYS.KHATA_PEOPLE);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addKhataPerson(data: Omit<KhataPerson, 'id' | 'createdAt' | 'updatedAt'>): KhataPerson {
    const people = this.getKhataPeople();
    const newPerson: KhataPerson = {
      id: `person-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    people.unshift(newPerson);
    localStorage.setItem(STORAGE_KEYS.KHATA_PEOPLE, JSON.stringify(people));
    this.notify();
    return newPerson;
  }

  public updateKhataPerson(
    id: string,
    data: Partial<Omit<KhataPerson, 'id' | 'createdAt'>>
  ): KhataPerson {
    const people = this.getKhataPeople();
    const index = people.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Person not found');

    const updated: KhataPerson = {
      ...people[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    people[index] = updated;
    localStorage.setItem(STORAGE_KEYS.KHATA_PEOPLE, JSON.stringify(people));

    // Update name on associated transactions if changed
    if (data.name && data.name !== people[index].name) {
      const txs = this.getKhataTransactions();
      const updatedTxs = txs.map(t => (t.personId === id ? { ...t, personName: data.name! } : t));
      localStorage.setItem(STORAGE_KEYS.KHATA_TRANSACTIONS, JSON.stringify(updatedTxs));
    }

    this.notify();
    return updated;
  }

  public deleteKhataPerson(id: string): void {
    const people = this.getKhataPeople().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.KHATA_PEOPLE, JSON.stringify(people));

    // Remove transactions for this person as well
    const txs = this.getKhataTransactions().filter(t => t.personId !== id);
    localStorage.setItem(STORAGE_KEYS.KHATA_TRANSACTIONS, JSON.stringify(txs));

    this.rebuildGlobalUtrRegistry();
    this.notify();
  }

  public getKhataTransactions(): KhataTransaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.KHATA_TRANSACTIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addKhataTransaction(
    data: Omit<KhataTransaction, 'id' | 'createdAt'>
  ): { success: boolean; error?: string; transaction?: KhataTransaction } {
    // 1. Validation
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Transaction amount must be greater than zero.' };
    }
    if (!data.date) {
      return { success: false, error: 'Transaction date is required.' };
    }
    if (!data.personId || !data.personName) {
      return { success: false, error: 'Person is required.' };
    }

    // 2. Global UTR duplicate check
    if (data.utrNumber && !this.isCashOrNoUtr(data.utrNumber)) {
      const { isDuplicate, conflictRecord } = this.checkDuplicateUtr(data.utrNumber);
      if (isDuplicate && conflictRecord) {
        return {
          success: false,
          error: `Duplicate UTR Number!\n\nThis payment UTR "${data.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}) on ${conflictRecord.date}.\n\nTransaction cannot be saved.`
        };
      }
    }

    const txs = this.getKhataTransactions();
    const newTx: KhataTransaction = {
      ...data,
      id: `kht-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    txs.unshift(newTx);
    localStorage.setItem(STORAGE_KEYS.KHATA_TRANSACTIONS, JSON.stringify(txs));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, transaction: newTx };
  }

  public updateKhataTransaction(
    id: string,
    data: Partial<Omit<KhataTransaction, 'id' | 'createdAt'>>
  ): { success: boolean; error?: string; transaction?: KhataTransaction } {
    const txs = this.getKhataTransactions();
    const index = txs.findIndex(t => t.id === id);
    if (index === -1) return { success: false, error: 'Transaction not found.' };

    if (data.amount !== undefined && data.amount <= 0) {
      return { success: false, error: 'Transaction amount must be greater than zero.' };
    }

    // Check UTR if updated
    if (data.utrNumber && !this.isCashOrNoUtr(data.utrNumber)) {
      const { isDuplicate, conflictRecord } = this.checkDuplicateUtr(data.utrNumber, id);
      if (isDuplicate && conflictRecord) {
        return {
          success: false,
          error: `Duplicate UTR Number!\n\nThis payment UTR "${data.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}).\n\nTransaction cannot be saved.`
        };
      }
    }

    const updated: KhataTransaction = {
      ...txs[index],
      ...data
    };
    txs[index] = updated;
    localStorage.setItem(STORAGE_KEYS.KHATA_TRANSACTIONS, JSON.stringify(txs));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, transaction: updated };
  }

  public deleteKhataTransaction(id: string): void {
    const txs = this.getKhataTransactions().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.KHATA_TRANSACTIONS, JSON.stringify(txs));
    this.rebuildGlobalUtrRegistry();
    this.notify();
  }

  // Calculate Ledger for a single Person
  public getPersonLedger(personId: string) {
    const txs = this.getKhataTransactions().filter(t => t.personId === personId);

    let totalGiven = 0;
    let totalReceived = 0;

    for (const tx of txs) {
      if (tx.type === 'Money Given' || tx.type === 'Short-Term Loan Given') {
        totalGiven += Number(tx.amount);
      } else if (
        tx.type === 'Money Received' ||
        tx.type === 'Loan Return' ||
        tx.type === 'Short-Term Loan Borrowed'
      ) {
        // Notice:
        // Money Given: Shubham gives money (Receivable)
        // Money Received: Shubham gets money back (Reduces receivable)
        // Short-Term Loan Given: Shubham gives loan (Receivable)
        // Short-Term Loan Borrowed: Shubham receives borrowed money (Payable)
        // Loan Return: Return of loan
      }
    }

    // Pure logic:
    // Money Given to Person: +Given
    // Money Received from Person: +Received
    // Short-Term Loan Given: +Given
    // Short-Term Loan Borrowed: Shubham borrowed from them (+Received/Payable)
    // Loan Return:
    // If Shubham gave money and person returns: Person gives to Shubham (+Received)
    let given = 0;
    let received = 0;
    let borrowedFromPerson = 0;
    let returnedToPerson = 0;

    for (const tx of txs) {
      const amt = Number(tx.amount) || 0;
      switch (tx.type) {
        case 'Money Given':
        case 'Short-Term Loan Given':
          given += amt;
          break;
        case 'Money Received':
          received += amt;
          break;
        case 'Short-Term Loan Borrowed':
          borrowedFromPerson += amt;
          break;
        case 'Loan Return':
          // If given > received, this was person returning money to Shubham
          if (given > received) {
            received += amt;
          } else {
            returnedToPerson += amt;
          }
          break;
      }
    }

    // Net amounts:
    // Shubham's receivable from person: (given - received)
    // Shubham's payable to person: (borrowedFromPerson - returnedToPerson)
    const netReceivable = Math.max(0, given - received);
    const netPayable = Math.max(0, borrowedFromPerson - returnedToPerson);
    const remainingAmount = netReceivable > 0 ? netReceivable : netPayable;
    const balanceStatus: 'Receivable' | 'Payable' | 'Settled' =
      netReceivable > 0 ? 'Receivable' : netPayable > 0 ? 'Payable' : 'Settled';

    return {
      totalGiven: given,
      totalReceived: received,
      totalPayable: netPayable,
      totalReceivable: netReceivable,
      remainingAmount,
      balanceStatus,
      transactions: txs
    };
  }

  // Khata overall statistics (completely independent from other modules)
  public getKhataSummary() {
    const people = this.getKhataPeople();
    let totalReceivable = 0;
    let totalPayable = 0;
    let totalTransactionsCount = 0;

    for (const person of people) {
      const ledger = this.getPersonLedger(person.id);
      totalReceivable += ledger.totalReceivable;
      totalPayable += ledger.totalPayable;
      totalTransactionsCount += ledger.transactions.length;
    }

    return {
      totalReceivable,
      totalPayable,
      netBalance: totalReceivable - totalPayable,
      peopleCount: people.length,
      totalTransactionsCount
    };
  }

  // ==========================================
  // SECTION 2: PERSONAL EXPENSES
  // ==========================================
  public getExpenses(): Expense[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addExpense(
    data: Omit<Expense, 'id' | 'createdAt'>
  ): { success: boolean; error?: string; expense?: Expense } {
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Expense amount must be greater than zero.' };
    }
    if (!data.date) {
      return { success: false, error: 'Expense date is required.' };
    }
    if (!data.category) {
      return { success: false, error: 'Category is required.' };
    }

    // Global duplicate UTR check
    if (data.utrNumber && !this.isCashOrNoUtr(data.utrNumber)) {
      const { isDuplicate, conflictRecord } = this.checkDuplicateUtr(data.utrNumber);
      if (isDuplicate && conflictRecord) {
        return {
          success: false,
          error: `Duplicate UTR Number!\n\nThis payment UTR "${data.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}) on ${conflictRecord.date}.\n\nTransaction cannot be saved.`
        };
      }
    }

    const expenses = this.getExpenses();
    const newExpense: Expense = {
      ...data,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    expenses.unshift(newExpense);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, expense: newExpense };
  }

  public updateExpense(
    id: string,
    data: Partial<Omit<Expense, 'id' | 'createdAt'>>
  ): { success: boolean; error?: string; expense?: Expense } {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) return { success: false, error: 'Expense not found.' };

    if (data.amount !== undefined && data.amount <= 0) {
      return { success: false, error: 'Expense amount must be greater than zero.' };
    }

    if (data.utrNumber && !this.isCashOrNoUtr(data.utrNumber)) {
      const { isDuplicate, conflictRecord } = this.checkDuplicateUtr(data.utrNumber, id);
      if (isDuplicate && conflictRecord) {
        return {
          success: false,
          error: `Duplicate UTR Number!\n\nThis payment UTR "${data.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}).\n\nTransaction cannot be saved.`
        };
      }
    }

    const updated: Expense = {
      ...expenses[index],
      ...data
    };
    expenses[index] = updated;
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, expense: updated };
  }

  public deleteExpense(id: string): void {
    const expenses = this.getExpenses().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    this.rebuildGlobalUtrRegistry();
    this.notify();
  }

  // Expense Calculations (completely independent)
  public getExpenseSummary(targetDate = new Date()) {
    const expenses = this.getExpenses();

    const todayStr = targetDate.toISOString().split('T')[0];
    const currentYear = targetDate.getFullYear();
    const currentMonth = targetDate.getMonth() + 1; // 1-12
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let todayExpense = 0;
    let monthlyExpense = 0;
    let yearlyExpense = 0;

    const categoryTotals: Record<ExpenseCategory, number> = {
      Food: 0,
      Travel: 0,
      Shopping: 0,
      Recharge: 0,
      Education: 0,
      Bills: 0,
      Entertainment: 0,
      Medical: 0,
      Other: 0
    };

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      const expDate = exp.date;

      // Today
      if (expDate === todayStr) {
        todayExpense += amt;
      }

      // Monthly
      if (expDate.startsWith(currentMonthStr)) {
        monthlyExpense += amt;
      }

      // Yearly
      if (expDate.startsWith(String(currentYear))) {
        yearlyExpense += amt;
      }

      // Category total
      if (categoryTotals[exp.category] !== undefined) {
        categoryTotals[exp.category] += amt;
      } else {
        categoryTotals['Other'] += amt;
      }
    }

    return {
      todayExpense,
      monthlyExpense,
      yearlyExpense,
      categoryTotals,
      totalCount: expenses.length
    };
  }

  // ==========================================
  // SECTION 3: LONG-TERM LOANS
  // ==========================================
  public getLongTermLoans(): LongTermLoan[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LONG_TERM_LOANS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addLongTermLoan(
    data: Omit<LongTermLoan, 'id' | 'status' | 'closedDate' | 'createdAt' | 'updatedAt' | 'repayments'>
  ): { success: boolean; error?: string; loan?: LongTermLoan } {
    if (!data.originalAmount || data.originalAmount <= 0) {
      return { success: false, error: 'Original loan amount must be greater than zero.' };
    }
    if (!data.personName?.trim()) {
      return { success: false, error: 'Person name is required.' };
    }
    if (!data.startDate || !data.expectedReturnDate) {
      return { success: false, error: 'Start date and expected return date are required.' };
    }

    // Global duplicate UTR check
    if (data.utrNumber && !this.isCashOrNoUtr(data.utrNumber)) {
      const { isDuplicate, conflictRecord } = this.checkDuplicateUtr(data.utrNumber);
      if (isDuplicate && conflictRecord) {
        return {
          success: false,
          error: `Duplicate UTR Number!\n\nThis payment UTR "${data.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}) on ${conflictRecord.date}.\n\nTransaction cannot be saved.`
        };
      }
    }

    const loans = this.getLongTermLoans();
    const newLoan: LongTermLoan = {
      ...data,
      id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'Active',
      repayments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    loans.unshift(newLoan);
    localStorage.setItem(STORAGE_KEYS.LONG_TERM_LOANS, JSON.stringify(loans));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, loan: newLoan };
  }

  public updateLongTermLoan(
    id: string,
    data: Partial<Omit<LongTermLoan, 'id' | 'createdAt' | 'repayments'>>
  ): { success: boolean; error?: string; loan?: LongTermLoan } {
    const loans = this.getLongTermLoans();
    const index = loans.findIndex(l => l.id === id);
    if (index === -1) return { success: false, error: 'Loan not found.' };

    if (data.originalAmount !== undefined && data.originalAmount <= 0) {
      return { success: false, error: 'Original loan amount must be greater than zero.' };
    }

    if (data.utrNumber && !this.isCashOrNoUtr(data.utrNumber)) {
      const { isDuplicate, conflictRecord } = this.checkDuplicateUtr(data.utrNumber, id);
      if (isDuplicate && conflictRecord) {
        return {
          success: false,
          error: `Duplicate UTR Number!\n\nThis payment UTR "${data.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}).\n\nTransaction cannot be saved.`
        };
      }
    }

    const existing = loans[index];
    const updated: LongTermLoan = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Recalculate status based on repayments
    const totalReturned = (updated.repayments || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const remaining = updated.originalAmount - totalReturned;

    if (remaining <= 0) {
      updated.status = 'Closed';
      if (!updated.closedDate) {
        updated.closedDate = new Date().toISOString().split('T')[0];
      }
    } else if (totalReturned > 0) {
      updated.status = 'Partially Paid';
      updated.closedDate = undefined;
    } else {
      // Check if overdue
      const today = new Date().toISOString().split('T')[0];
      if (updated.expectedReturnDate < today) {
        updated.status = 'Overdue';
      } else {
        updated.status = 'Active';
      }
      updated.closedDate = undefined;
    }

    loans[index] = updated;
    localStorage.setItem(STORAGE_KEYS.LONG_TERM_LOANS, JSON.stringify(loans));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, loan: updated };
  }

  public deleteLongTermLoan(id: string): void {
    const loans = this.getLongTermLoans().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEYS.LONG_TERM_LOANS, JSON.stringify(loans));
    this.rebuildGlobalUtrRegistry();
    this.notify();
  }

  // Add a partial repayment to a loan
  public addLoanRepayment(
    loanId: string,
    data: Omit<LoanRepayment, 'id' | 'loanId' | 'createdAt'>
  ): { success: boolean; error?: string; loan?: LongTermLoan } {
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Repayment amount must be greater than zero.' };
    }
    if (!data.date) {
      return { success: false, error: 'Repayment date is required.' };
    }

    const loans = this.getLongTermLoans();
    const index = loans.findIndex(l => l.id === loanId);
    if (index === -1) return { success: false, error: 'Loan record not found.' };

    const loan = loans[index];
    const totalReturnedBefore = (loan.repayments || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const remainingBefore = loan.originalAmount - totalReturnedBefore;

    if (data.amount > remainingBefore) {
      return {
        success: false,
        error: `Repayment amount (₹${data.amount.toLocaleString('en-IN')}) cannot exceed remaining loan balance (₹${remainingBefore.toLocaleString('en-IN')}).`
      };
    }

    // Global duplicate UTR check
    if (data.utrNumber && !this.isCashOrNoUtr(data.utrNumber)) {
      const { isDuplicate, conflictRecord } = this.checkDuplicateUtr(data.utrNumber);
      if (isDuplicate && conflictRecord) {
        return {
          success: false,
          error: `Duplicate UTR Number!\n\nThis payment UTR "${data.utrNumber}" has already been registered in ${conflictRecord.sourceModule} (${conflictRecord.description}) on ${conflictRecord.date}.\n\nTransaction cannot be saved.`
        };
      }
    }

    const newRepayment: LoanRepayment = {
      ...data,
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      loanId,
      createdAt: new Date().toISOString()
    };

    const updatedRepayments = [...(loan.repayments || []), newRepayment];
    const newTotalReturned = updatedRepayments.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const newRemaining = loan.originalAmount - newTotalReturned;

    let newStatus: LongTermLoan['status'] = loan.status;
    let closedDate: string | undefined = loan.closedDate;

    if (newRemaining <= 0) {
      newStatus = 'Closed';
      closedDate = data.date || new Date().toISOString().split('T')[0];
    } else {
      newStatus = 'Partially Paid';
    }

    const updatedLoan: LongTermLoan = {
      ...loan,
      repayments: updatedRepayments,
      status: newStatus,
      closedDate,
      updatedAt: new Date().toISOString()
    };

    loans[index] = updatedLoan;
    localStorage.setItem(STORAGE_KEYS.LONG_TERM_LOANS, JSON.stringify(loans));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, loan: updatedLoan };
  }

  // Delete a repayment
  public deleteLoanRepayment(loanId: string, repaymentId: string): void {
    const loans = this.getLongTermLoans();
    const index = loans.findIndex(l => l.id === loanId);
    if (index === -1) return;

    const loan = loans[index];
    const updatedRepayments = (loan.repayments || []).filter(r => r.id !== repaymentId);
    const totalReturned = updatedRepayments.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const remaining = loan.originalAmount - totalReturned;

    let newStatus: LongTermLoan['status'] = 'Active';
    let closedDate: string | undefined = undefined;

    if (remaining <= 0) {
      newStatus = 'Closed';
      closedDate = new Date().toISOString().split('T')[0];
    } else if (totalReturned > 0) {
      newStatus = 'Partially Paid';
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (loan.expectedReturnDate < today) {
        newStatus = 'Overdue';
      }
    }

    loans[index] = {
      ...loan,
      repayments: updatedRepayments,
      status: newStatus,
      closedDate,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.LONG_TERM_LOANS, JSON.stringify(loans));
    this.rebuildGlobalUtrRegistry();
    this.notify();
  }

  // Long-Term Loans calculation (completely independent)
  public getLongTermLoanSummary() {
    const loans = this.getLongTermLoans();
    const today = new Date().toISOString().split('T')[0];

    let totalGiven = 0;
    let totalGivenReturned = 0;
    let totalBorrowed = 0;
    let totalBorrowedReturned = 0;

    let activeCount = 0;
    let closedCount = 0;
    let overdueCount = 0;

    for (const loan of loans) {
      const orig = Number(loan.originalAmount) || 0;
      const returned = (loan.repayments || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

      if (loan.loanType === 'Loan Given') {
        totalGiven += orig;
        totalGivenReturned += returned;
      } else {
        totalBorrowed += orig;
        totalBorrowedReturned += returned;
      }

      if (loan.status === 'Closed') {
        closedCount++;
      } else {
        activeCount++;
        if (loan.expectedReturnDate < today) {
          overdueCount++;
        }
      }
    }

    const netGivenRemaining = totalGiven - totalGivenReturned;
    const netBorrowedRemaining = totalBorrowed - totalBorrowedReturned;

    return {
      totalGiven,
      totalGivenReturned,
      netGivenRemaining,
      totalBorrowed,
      totalBorrowedReturned,
      netBorrowedRemaining,
      activeCount,
      closedCount,
      overdueCount,
      totalLoansCount: loans.length
    };
  }

  // Backup & Restore
  public exportAllData(): string {
    return this.exportAllDataJson();
  }

  public exportAllDataJson(): string {
    const data = {
      exportDate: new Date().toISOString(),
      user: this.getProfile(),
      khataPeople: this.getKhataPeople(),
      khataTransactions: this.getKhataTransactions(),
      expenses: this.getExpenses(),
      longTermLoans: this.getLongTermLoans(),
      globalUtr: this.getGlobalUtrRecords()
    };
    return JSON.stringify(data, null, 2);
  }

  public importData(jsonStr: string): { success: boolean; error?: string } {
    const ok = this.importDataJson(jsonStr);
    return {
      success: ok,
      error: ok ? undefined : 'Invalid financial JSON backup format'
    };
  }

  public importDataJson(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.khataPeople) {
        localStorage.setItem(STORAGE_KEYS.KHATA_PEOPLE, JSON.stringify(data.khataPeople));
      }
      if (data.khataTransactions) {
        localStorage.setItem(STORAGE_KEYS.KHATA_TRANSACTIONS, JSON.stringify(data.khataTransactions));
      }
      if (data.expenses) {
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
      }
      if (data.longTermLoans) {
        localStorage.setItem(STORAGE_KEYS.LONG_TERM_LOANS, JSON.stringify(data.longTermLoans));
      }
      this.rebuildGlobalUtrRegistry();
      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to import JSON data:', e);
      return false;
    }
  }

  public resetAllData(): void {
    this.resetToDefaultDemoData();
  }

  public resetToDefaultDemoData(): void {
    localStorage.removeItem(STORAGE_KEYS.KHATA_PEOPLE);
    localStorage.removeItem(STORAGE_KEYS.KHATA_TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.LONG_TERM_LOANS);
    this.initialized = false;
    this.init();
  }
}

export const storage = new StorageService();
