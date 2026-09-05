import {
  KhataPerson,
  KhataTransaction,
  Expense,
  LongTermLoan,
  LoanRepayment,
  GlobalUtrRecord,
  UserProfile,
  RegisteredAccount,
  ExpenseCategory,
  KhataTransactionType,
  LoanType
} from '../types';
import {
  getSupabase,
  logSupabaseError,
  hasAppPinRpc,
  setAppPinRpc,
  verifyAppPinRpc,
  hasLoginPinRpc,
  setLoginPinRpc,
  verifyLoginPinRpc
} from './supabase';

const LEGACY_STORAGE_KEYS = {
  USER_PROFILE: 'smm_user_profile',
  KHATA_PEOPLE: 'smm_khata_people',
  KHATA_TRANSACTIONS: 'smm_khata_transactions',
  EXPENSES: 'smm_expenses',
  LONG_TERM_LOANS: 'smm_long_term_loans',
  GLOBAL_UTR: 'smm_global_utr'
};

// Cryptographically separate SHA-256 salts for Login PIN and Transaction PIN
export async function hashTransactionPin(pin: string, userId: string = 'user'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`nexmoney_txn_salt_${userId}_${pin}_vault_2026`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashLoginPin(pin: string, userId: string = 'user'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`nexmoney_login_salt_${userId}_${pin}_vault_2026`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, userId: string = 'user'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`nexmoney_pwd_salt_${userId}_${password}_vault_2026`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Backward compatibility alias
export async function hashPin(pin: string): Promise<string> {
  return hashTransactionPin(pin);
}

// Initial default profile - NO default PIN is configured
const DEFAULT_PROFILE: UserProfile = {
  id: 'primary_vault_user',
  name: 'Primary Vault',
  email: 'user@nexmoney.internal',
  accountIdentifier: 'user@nexmoney.internal',
  accountType: 'Email',
  loginPinHash: '',
  loginPinLength: 4,
  isLoginPinSet: false,
  pinHash: '',
  pinLength: 4,
  isPinSet: false,
  createdAt: '2026-08-01T10:00:00.000Z'
};

const DEFAULT_KHATA_PEOPLE: KhataPerson[] = [
  {
    id: 'person-sakshi-001',
    userId: 'shubham_godage_primary',
    name: 'Sakshi',
    phone: '+91 98234 56780',
    notes: 'Colleague & personal friend',
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-09-04T12:00:00.000Z'
  },
  {
    id: 'person-rahul-002',
    userId: 'shubham_godage_primary',
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    notes: 'Short term project expenses',
    createdAt: '2026-08-20T14:30:00.000Z',
    updatedAt: '2026-09-02T16:00:00.000Z'
  },
  {
    id: 'person-amit-003',
    userId: 'shubham_godage_primary',
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
    userId: 'shubham_godage_primary',
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
  private currentUserId: string = 'primary_vault_user';
  private currentUserEmail: string = 'user@nexmoney.internal';
  private currentUserName: string = 'Primary Account';

  constructor() {
    this.restoreUserSession();
    this.init();
  }

  private restoreUserSession() {
    const savedUserId = localStorage.getItem('smm_current_user_id');
    const savedMeta = localStorage.getItem('smm_current_user_meta');
    if (savedUserId) {
      this.currentUserId = savedUserId;
    }
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        if (parsed.email) this.currentUserEmail = parsed.email;
        if (parsed.name) this.currentUserName = parsed.name;
      } catch {}
    }
  }

  public getKey(base: string): string {
    return `smm_user_${this.currentUserId}_${base}`;
  }

  public setCurrentUser(
    userOrId: { id: string; email?: string; name?: string; phone?: string; accountType?: 'Email' | 'Mobile' } | string,
    email?: string,
    name?: string
  ) {
    let id: string;
    let userEmail: string;
    let userName: string;

    if (typeof userOrId === 'string') {
      id = userOrId;
      userEmail = email || '';
      userName = name || (userEmail ? userEmail.split('@')[0] : 'User');
    } else {
      id = userOrId.id;
      userEmail = userOrId.email || '';
      userName = userOrId.name || (userOrId.email ? userOrId.email.split('@')[0] : 'User');
    }

    this.currentUserId = id;
    this.currentUserEmail = userEmail;
    this.currentUserName = userName;

    localStorage.setItem('smm_current_user_id', id);
    localStorage.setItem(
      'smm_current_user_meta',
      JSON.stringify({
        id,
        email: userEmail,
        name: userName
      })
    );

    this.initUserStorage({
      id,
      email: userEmail,
      name: userName,
      phone: typeof userOrId === 'object' ? userOrId.phone : undefined,
      accountType: typeof userOrId === 'object' ? userOrId.accountType : undefined
    });

    // Update lastLoginAt in registered accounts index
    this.touchAccountLogin(id);

    if (this.isSupabaseUser(id)) {
      this.fetchFromSupabase().catch(err => {
        console.error('Initial fetchFromSupabase error:', err);
      });
    }

    this.notify();
  }

  public isSupabaseUser(id: string): boolean {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  /**
   * Fetch all records from Supabase tables for the authenticated user (auth.uid() = user_id)
   * Populates local storage cache and notifies components.
   */
  public async fetchFromSupabase(): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase || !this.isSupabaseUser(this.currentUserId)) {
      return { success: false, error: 'No active Supabase user session' };
    }

    try {
      const uid = this.currentUserId;

      // 1. Fetch Profile
      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (profileErr) {
        logSupabaseError('fetch profiles', profileErr);
      } else if (profileRow) {
        const localProf = this.getProfile();
        const updatedProf: UserProfile = {
          ...localProf,
          id: profileRow.id,
          name: profileRow.full_name || localProf.name,
          email: profileRow.email || localProf.email,
          createdAt: profileRow.created_at || localProf.createdAt
        };
        localStorage.setItem(this.getKey('user_profile'), JSON.stringify(updatedProf));
      }

      // 2. Fetch Khata People
      const { data: peopleRows, error: peopleErr } = await supabase
        .from('khata_people')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (peopleErr) {
        logSupabaseError('fetch khata_people', peopleErr);
      } else if (peopleRows) {
        const mappedPeople: KhataPerson[] = peopleRows.map(r => ({
          id: r.id,
          userId: r.user_id,
          name: r.name,
          phone: r.phone || undefined,
          notes: r.notes || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
        localStorage.setItem(this.getKey('khata_people'), JSON.stringify(mappedPeople));
      }

      // 3. Fetch Khata Transactions
      const { data: txRows, error: txErr } = await supabase
        .from('khata_transactions')
        .select('*')
        .eq('user_id', uid)
        .order('transaction_date', { ascending: false });

      if (txErr) {
        logSupabaseError('fetch khata_transactions', txErr);
      } else if (txRows) {
        const mappedTxs: KhataTransaction[] = txRows.map(r => ({
          id: r.id,
          userId: r.user_id,
          personId: r.person_id,
          personName: r.person_name,
          type: r.type as KhataTransactionType,
          amount: Number(r.amount),
          date: r.transaction_date,
          paymentMethod: r.payment_method,
          utrNumber: r.utr_number || undefined,
          notes: r.notes || undefined,
          createdAt: r.created_at
        }));
        localStorage.setItem(this.getKey('khata_transactions'), JSON.stringify(mappedTxs));
      }

      // 4. Fetch Expenses
      const { data: expRows, error: expErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', uid)
        .order('expense_date', { ascending: false });

      if (expErr) {
        logSupabaseError('fetch expenses', expErr);
      } else if (expRows) {
        const mappedExpenses: Expense[] = expRows.map(r => ({
          id: r.id,
          userId: r.user_id,
          amount: Number(r.amount),
          category: r.category as ExpenseCategory,
          date: r.expense_date,
          paymentMethod: r.payment_method,
          utrNumber: r.utr_number || undefined,
          notes: r.notes || undefined,
          createdAt: r.created_at
        }));
        localStorage.setItem(this.getKey('expenses'), JSON.stringify(mappedExpenses));
      }

      // 5. Fetch Long Term Loans and Repayments
      const { data: loanRows, error: loanErr } = await supabase
        .from('long_term_loans')
        .select('*')
        .eq('user_id', uid)
        .order('start_date', { ascending: false });

      const { data: repRows, error: repErr } = await supabase
        .from('loan_repayments')
        .select('*')
        .eq('user_id', uid)
        .order('repayment_date', { ascending: false });

      if (loanErr) {
        logSupabaseError('fetch long_term_loans', loanErr);
      }
      if (repErr) {
        logSupabaseError('fetch loan_repayments', repErr);
      }

      if (loanRows) {
        const allRepayments: LoanRepayment[] = (repRows || []).map(r => ({
          id: r.id,
          userId: r.user_id,
          loanId: r.loan_id,
          amount: Number(r.amount),
          date: r.repayment_date,
          paymentMethod: r.payment_method,
          utrNumber: r.utr_number || undefined,
          notes: r.notes || undefined,
          createdAt: r.created_at
        }));

        const mappedLoans: LongTermLoan[] = loanRows.map(r => ({
          id: r.id,
          userId: r.user_id,
          personName: r.person_name,
          loanType: r.loan_type as LoanType,
          originalAmount: Number(r.original_amount),
          startDate: r.start_date,
          expectedReturnDate: r.expected_return_date,
          paymentMethod: r.payment_method,
          utrNumber: r.utr_number || undefined,
          notes: r.notes || undefined,
          status: r.status as LongTermLoan['status'],
          closedDate: r.closed_date || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          repayments: allRepayments.filter(rep => rep.loanId === r.id)
        }));
        localStorage.setItem(this.getKey('long_term_loans'), JSON.stringify(mappedLoans));
      }

      // Rebuild local UTR registry from fresh records
      this.rebuildGlobalUtrRegistry();
      this.notify();
      return { success: true };
    } catch (err: any) {
      logSupabaseError('fetchFromSupabase catch', err);
      return { success: false, error: err?.message || 'Failed to fetch from Supabase' };
    }
  }

  public getCurrentUser() {
    return {
      id: this.currentUserId,
      email: this.currentUserEmail,
      name: this.currentUserName
    };
  }

  public getCurrentUserName(): string {
    return this.currentUserName || 'Account Holder';
  }

  public async updateUserProfile(data: { name?: string }): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile(data);
  }

  // MULTI-ACCOUNT MANAGEMENT & ISOLATED REGISTRY
  public getRegisteredAccounts(): RegisteredAccount[] {
    try {
      const raw = localStorage.getItem('smm_registered_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  public saveRegisteredAccount(account: RegisteredAccount): void {
    const list = this.getRegisteredAccounts().filter(a => a.id !== account.id && a.identifier !== account.identifier);
    list.unshift(account);
    localStorage.setItem('smm_registered_accounts', JSON.stringify(list));
  }

  public deleteRegisteredAccount(accountId: string): void {
    // Delete all keys belonging to this account
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`smm_user_${accountId}_`)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    const list = this.getRegisteredAccounts().filter(a => a.id !== accountId);
    localStorage.setItem('smm_registered_accounts', JSON.stringify(list));

    if (this.currentUserId === accountId) {
      this.logout();
    }
    this.notify();
  }

  private touchAccountLogin(accountId: string): void {
    const list = this.getRegisteredAccounts();
    const idx = list.findIndex(a => a.id === accountId);
    if (idx !== -1) {
      list[idx].lastLoginAt = new Date().toISOString();
      localStorage.setItem('smm_registered_accounts', JSON.stringify(list));
    }
  }

  /**
   * Register a new account with complete data isolation.
   * New accounts start with empty Khata, Expenses, Loans, and separate PINs.
   */
  public async registerAccount(params: {
    id?: string;
    name: string;
    identifier: string; // email or phone
    accountType: 'Email' | 'Mobile';
    password?: string;
    loginPin?: string;
    transactionPin?: string;
  }): Promise<{ success: boolean; account?: RegisteredAccount; error?: string }> {
    const trimmedIdentifier = params.identifier.trim();
    if (!trimmedIdentifier) {
      return { success: false, error: 'Valid email or mobile number is required' };
    }
    if (!params.name.trim()) {
      return { success: false, error: 'Full name is required' };
    }

    // Ensure Login PIN and Transaction PIN are distinct
    if (params.loginPin && params.transactionPin && params.loginPin === params.transactionPin) {
      return {
        success: false,
        error: 'Security Policy: Login PIN and Transaction PIN must not be identical.'
      };
    }

    // Check duplicate
    const accounts = this.getRegisteredAccounts();
    const duplicate = accounts.find(
      a => a.identifier.toLowerCase() === trimmedIdentifier.toLowerCase()
    );
    if (duplicate) {
      if (params.id && duplicate.id !== params.id) {
        // Upgrade legacy account ID to the authenticated Supabase UUID
        duplicate.id = params.id;
        this.saveRegisteredAccount(duplicate);
        return { success: true, account: duplicate };
      }
      return {
        success: false,
        error: `An account with ${trimmedIdentifier} is already registered. Please sign in instead.`
      };
    }

    const newUserId = params.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let passwordHash = '';
    if (params.password) {
      passwordHash = await hashPassword(params.password, newUserId);
    }

    let loginPinHash = '';
    let isLoginPinSet = false;
    let loginPinLen: 4 | 6 = 4;
    if (params.loginPin && (params.loginPin.length === 4 || params.loginPin.length === 6)) {
      loginPinHash = await hashLoginPin(params.loginPin, newUserId);
      isLoginPinSet = true;
      loginPinLen = params.loginPin.length as 4 | 6;
    }

    let txnPinHash = '';
    let isTxnPinSet = false;
    let txnPinLen: 4 | 6 = 4;
    if (params.transactionPin && (params.transactionPin.length === 4 || params.transactionPin.length === 6)) {
      txnPinHash = await hashTransactionPin(params.transactionPin, newUserId);
      isTxnPinSet = true;
      txnPinLen = params.transactionPin.length as 4 | 6;
    }

    const newProfile: UserProfile = {
      id: newUserId,
      name: params.name.trim(),
      email: params.accountType === 'Email' ? trimmedIdentifier : undefined,
      phone: params.accountType === 'Mobile' ? trimmedIdentifier : undefined,
      accountIdentifier: trimmedIdentifier,
      accountType: params.accountType,
      loginPinHash,
      loginPinLength: loginPinLen,
      isLoginPinSet,
      pinHash: txnPinHash,
      pinLength: txnPinLen,
      isPinSet: isTxnPinSet,
      createdAt: new Date().toISOString()
    };

    // STRICT ISOLATION: Initialize pure, empty financial records for new account
    localStorage.setItem(`smm_user_${newUserId}_user_profile`, JSON.stringify(newProfile));
    localStorage.setItem(`smm_user_${newUserId}_khata_people`, JSON.stringify([]));
    localStorage.setItem(`smm_user_${newUserId}_khata_transactions`, JSON.stringify([]));
    localStorage.setItem(`smm_user_${newUserId}_expenses`, JSON.stringify([]));
    localStorage.setItem(`smm_user_${newUserId}_long_term_loans`, JSON.stringify([]));

    const regAccount: RegisteredAccount = {
      id: newUserId,
      name: params.name.trim(),
      identifier: trimmedIdentifier,
      accountType: params.accountType,
      createdAt: newProfile.createdAt!,
      hasLoginPin: isLoginPinSet,
      hasTxnPin: isTxnPinSet,
      passwordHash: passwordHash || undefined
    };

    this.saveRegisteredAccount(regAccount);

    if (this.isSupabaseUser(newUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        supabase
          .from('profiles')
          .upsert({
            id: newUserId,
            full_name: params.name.trim(),
            email: params.accountType === 'Email' ? trimmedIdentifier : null,
            updated_at: new Date().toISOString()
          })
          .then(({ error }) => {
            if (error) logSupabaseError('upsert profile in registerAccount', error);
          });
      }
    }

    return { success: true, account: regAccount };
  }

  public async verifyAccountPassword(identifier: string, password: string): Promise<{ success: boolean; account?: RegisteredAccount; error?: string }> {
    const trimmed = identifier.trim().toLowerCase();
    const accounts = this.getRegisteredAccounts();
    const account = accounts.find(a => a.identifier.toLowerCase() === trimmed);
    if (!account) {
      return { success: false, error: 'No account found with this email or mobile number.' };
    }
    if (!account.passwordHash) {
      return { success: true, account };
    }
    const hash = await hashPassword(password, account.id);
    if (hash !== account.passwordHash) {
      return { success: false, error: 'Invalid password. Please verify and try again.' };
    }
    return { success: true, account };
  }

  public loginWithAccount(account: RegisteredAccount): void {
    this.setCurrentUser(account.id, account.accountType === 'Email' ? account.identifier : '', account.name);
    const accounts = this.getRegisteredAccounts();
    const idx = accounts.findIndex(a => a.id === account.id);
    if (idx !== -1) {
      accounts[idx].lastLoginAt = new Date().toISOString();
      localStorage.setItem('smm_registered_accounts', JSON.stringify(accounts));
    }
    this.login();
  }

  private initUserStorage(user: {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    accountType?: 'Email' | 'Mobile';
  }) {
    const profileKey = this.getKey('user_profile');
    const khataPeopleKey = this.getKey('khata_people');
    const khataTxsKey = this.getKey('khata_transactions');
    const expensesKey = this.getKey('expenses');
    const loansKey = this.getKey('long_term_loans');

    const existingProfile = localStorage.getItem(profileKey);
    if (!existingProfile) {
      // If this is the initial primary vault and legacy sample demo data exists
      if (user.id === 'primary_vault_user' || user.id === 'shubham_godage_primary') {
        const profile: UserProfile = {
          id: user.id,
          name: user.name || 'Primary Vault',
          email: user.email,
          phone: user.phone,
          accountIdentifier: user.email || user.phone || 'user@nexmoney.internal',
          accountType: user.accountType || 'Email',
          loginPinHash: '',
          loginPinLength: 4,
          isLoginPinSet: false,
          pinHash: '',
          pinLength: 4,
          isPinSet: false,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(profileKey, JSON.stringify(profile));
        localStorage.setItem(khataPeopleKey, JSON.stringify(DEFAULT_KHATA_PEOPLE));
        localStorage.setItem(khataTxsKey, JSON.stringify(DEFAULT_KHATA_TRANSACTIONS));
        localStorage.setItem(expensesKey, JSON.stringify(DEFAULT_EXPENSES));
        localStorage.setItem(loansKey, JSON.stringify(DEFAULT_LONG_TERM_LOANS));
      } else {
        // ANY NEW USER: Clean, completely isolated empty financial vault
        const profile: UserProfile = {
          id: user.id,
          name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
          email: user.email,
          phone: user.phone,
          accountIdentifier: user.email || user.phone,
          accountType: user.accountType || (user.email ? 'Email' : 'Mobile'),
          loginPinHash: '',
          loginPinLength: 4,
          isLoginPinSet: false,
          pinHash: '',
          pinLength: 4,
          isPinSet: false,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(profileKey, JSON.stringify(profile));
        localStorage.setItem(khataPeopleKey, JSON.stringify([]));
        localStorage.setItem(khataTxsKey, JSON.stringify([]));
        localStorage.setItem(expensesKey, JSON.stringify([]));
        localStorage.setItem(loansKey, JSON.stringify([]));
      }
    }

    this.rebuildGlobalUtrRegistry();
  }

  public async init() {
    if (this.initialized) return;

    this.restoreUserSession();
    this.initUserStorage({
      id: this.currentUserId,
      email: this.currentUserEmail,
      name: this.currentUserName
    });

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logSupabaseError('auth.getSession in storage.init', error);
        } else if (session?.user?.id) {
          const uid = session.user.id;
          const email = session.user.email || '';
          const name = session.user.user_metadata?.full_name || (email ? email.split('@')[0] : 'User');
          this.currentUserId = uid;
          this.currentUserEmail = email;
          this.currentUserName = name;
          localStorage.setItem('smm_current_user_id', uid);
          this.initUserStorage({ id: uid, email, name });
          await this.fetchFromSupabase();
        }
      } catch (sbErr: any) {
        logSupabaseError('init Supabase session check', sbErr);
      }
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

  // PROFILE & AUTH METHODS
  public getProfile(): UserProfile {
    const raw = localStorage.getItem(this.getKey('user_profile'));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          name: parsed.name || this.currentUserName,
          email: parsed.email || this.currentUserEmail,
          id: this.currentUserId
        };
      } catch {
        // fallback
      }
    }
    return {
      id: this.currentUserId,
      name: this.currentUserName,
      email: this.currentUserEmail,
      pinHash: '',
      pinLength: 4,
      isPinSet: false
    };
  }

  public getUserProfile(): UserProfile {
    return this.getProfile();
  }

  public async updateProfile(data: { name?: string }): Promise<{ success: boolean; error?: string }> {
    if (data.name?.trim()) {
      this.currentUserName = data.name.trim();
      const current = this.getProfile();
      const updated: UserProfile = {
        ...current,
        name: this.currentUserName
      };
      localStorage.setItem(this.getKey('user_profile'), JSON.stringify(updated));
      localStorage.setItem(
        'smm_current_user_meta',
        JSON.stringify({
          id: this.currentUserId,
          email: this.currentUserEmail,
          name: this.currentUserName
        })
      );

      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.auth.updateUser({
            data: { full_name: this.currentUserName }
          });
          await supabase.from('profiles').upsert({
            id: this.currentUserId,
            full_name: this.currentUserName,
            email: this.currentUserEmail,
            updated_at: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Supabase profile update warning:', err);
        }
      }

      this.notify();
      return { success: true };
    }
    return { success: true };
  }

  public async changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase client is not connected. Connect Supabase in Settings.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update password' };
    }
  }

  public async requestPasswordReset(email?: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase client is not connected. Connect Supabase in Settings.' };
    }
    const targetEmail = (email || this.currentUserEmail).trim();
    if (!targetEmail) {
      return { success: false, error: 'A valid email is required.' };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to request password reset' };
    }
  }

  public getAuthState(): { isAuthenticated: boolean; user: UserProfile } {
    const isAuth = localStorage.getItem('smm_auth_status') === 'authenticated';
    return {
      isAuthenticated: isAuth,
      user: this.getProfile()
    };
  }

  public login(user?: { id: string; email: string; name?: string }): void {
    localStorage.setItem('smm_auth_status', 'authenticated');
    if (user) {
      this.setCurrentUser(user);
    } else {
      this.notify();
    }
  }

  public logout(): void {
    localStorage.removeItem('smm_auth_status');
    localStorage.removeItem('smm_current_user_id');
    localStorage.removeItem('smm_current_user_meta');
    this.currentUserId = 'guest';
    this.currentUserName = 'Guest';
    this.currentUserEmail = '';
    this.notify();
  }

  // LOGIN PIN METHODS (COMPLETELY SEPARATE FROM TRANSACTION PIN)
  public hasLoginPin(forUserId?: string): boolean {
    const targetUserId = forUserId || this.currentUserId;
    const raw = localStorage.getItem(`smm_user_${targetUserId}_user_profile`);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        return Boolean(p.isLoginPinSet && p.loginPinHash);
      } catch {}
    }
    const profile = this.getProfile();
    return Boolean(profile.isLoginPinSet && profile.loginPinHash);
  }

  public async verifyLoginPin(enteredPin: string, forUserId?: string): Promise<boolean> {
    const targetUserId = forUserId || this.currentUserId;
    let storedHash = '';
    const raw = localStorage.getItem(`smm_user_${targetUserId}_user_profile`);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        storedHash = p.loginPinHash || '';
      } catch {}
    }
    if (!storedHash && targetUserId === this.currentUserId) {
      const profile = this.getProfile();
      storedHash = profile.loginPinHash || '';
    }
    if (!storedHash) return false;

    const enteredHash = await hashLoginPin(enteredPin, targetUserId);
    return enteredHash === storedHash;
  }

  public async setLoginPin(newPin: string, forUserId?: string): Promise<{ success: boolean; error?: string }> {
    if (newPin.length !== 4 && newPin.length !== 6) {
      return { success: false, error: 'Login PIN must be either 4 or 6 numeric digits' };
    }
    const targetUserId = forUserId || this.currentUserId;

    // Check separation: ensure Login PIN does not equal current Transaction PIN
    const profile = this.getProfile();
    if (profile.isPinSet && profile.pinHash) {
      const isSameAsTxn = (await hashTransactionPin(newPin, targetUserId)) === profile.pinHash;
      if (isSameAsTxn) {
        return {
          success: false,
          error: 'Security Policy: Login PIN cannot be identical to your Transaction PIN.'
        };
      }
    }

    const newHash = await hashLoginPin(newPin, targetUserId);
    const raw = localStorage.getItem(`smm_user_${targetUserId}_user_profile`);
    let userProf: UserProfile;
    if (raw) {
      try {
        userProf = JSON.parse(raw);
      } catch {
        userProf = this.getProfile();
      }
    } else {
      userProf = this.getProfile();
    }

    userProf.loginPinHash = newHash;
    userProf.loginPinLength = newPin.length as 4 | 6;
    userProf.isLoginPinSet = true;

    localStorage.setItem(`smm_user_${targetUserId}_user_profile`, JSON.stringify(userProf));

    // Update registered account metadata if present
    const accounts = this.getRegisteredAccounts();
    const idx = accounts.findIndex(a => a.id === targetUserId);
    if (idx !== -1) {
      accounts[idx].hasLoginPin = true;
      localStorage.setItem('smm_registered_accounts', JSON.stringify(accounts));
    }

    this.notify();
    return { success: true };
  }

  public async checkHasLoginPin(): Promise<boolean> {
    const rpcResult = await hasLoginPinRpc();
    if (rpcResult !== null) {
      return rpcResult;
    }
    return this.hasLoginPin();
  }

  public async verifyAppLoginPin(pin: string): Promise<boolean> {
    const rpcResult = await verifyLoginPinRpc(pin);
    if (rpcResult !== null) {
      return rpcResult;
    }
    return this.verifyLoginPin(pin);
  }

  public async setAppLoginPin(newPin: string): Promise<{ success: boolean; error?: string }> {
    const localResult = await this.setLoginPin(newPin);
    if (!localResult.success) return localResult;

    const rpcResult = await setLoginPinRpc(newPin);
    if (rpcResult !== null && !rpcResult.success) {
      return rpcResult;
    }
    return { success: true };
  }

  // TRANSACTION PIN METHODS (FOR MONEY TRANSFERS, LOANS, KHATA & REPORT EXPORTS)
  public hasPin(): boolean {
    const profile = this.getProfile();
    return Boolean(profile.isPinSet && profile.pinHash);
  }

  public async verifyPin(enteredPin: string): Promise<boolean> {
    const profile = this.getProfile();
    if (!profile.pinHash || !profile.isPinSet) {
      return false; // Strictly reject if no PIN set - no default fallback
    }
    const enteredHash = await hashTransactionPin(enteredPin, this.currentUserId);
    return enteredHash === profile.pinHash;
  }

  public async setPin(newPin: string): Promise<{ success: boolean; error?: string }> {
    if (newPin.length !== 4 && newPin.length !== 6) {
      return { success: false, error: 'Transaction PIN must be either 4 or 6 numeric digits' };
    }

    // Check separation: ensure Transaction PIN does not equal current Login PIN
    const profile = this.getProfile();
    if (profile.isLoginPinSet && profile.loginPinHash) {
      const isSameAsLogin = (await hashLoginPin(newPin, this.currentUserId)) === profile.loginPinHash;
      if (isSameAsLogin) {
        return {
          success: false,
          error: 'Security Policy: Transaction PIN cannot be identical to your Login PIN.'
        };
      }
    }

    const newHash = await hashTransactionPin(newPin, this.currentUserId);
    const updated: UserProfile = {
      ...profile,
      pinHash: newHash,
      pinLength: newPin.length as 4 | 6,
      isPinSet: true
    };
    localStorage.setItem(this.getKey('user_profile'), JSON.stringify(updated));

    // Update registered account metadata if present
    const accounts = this.getRegisteredAccounts();
    const idx = accounts.findIndex(a => a.id === this.currentUserId);
    if (idx !== -1) {
      accounts[idx].hasTxnPin = true;
      localStorage.setItem('smm_registered_accounts', JSON.stringify(accounts));
    }

    this.notify();
    return { success: true };
  }

  /**
   * Check if application transaction PIN exists via Supabase RPC, falling back to local
   */
  public async checkHasAppPin(): Promise<boolean> {
    const rpcResult = await hasAppPinRpc();
    if (rpcResult !== null) {
      return rpcResult;
    }
    return this.hasPin();
  }

  /**
   * Verify application transaction PIN via Supabase RPC, falling back to local
   */
  public async verifyAppPin(pin: string): Promise<boolean> {
    const rpcResult = await verifyAppPinRpc(pin);
    if (rpcResult !== null) {
      return rpcResult;
    }
    return this.verifyPin(pin);
  }

  /**
   * Set or update application transaction PIN via Supabase RPC, keeping local hash in sync
   */
  public async setAppPin(newPin: string): Promise<{ success: boolean; error?: string }> {
    if (newPin.length !== 4 && newPin.length !== 6) {
      return { success: false, error: 'PIN must be either 4 or 6 numeric digits' };
    }
    const localResult = await this.setPin(newPin);
    if (!localResult.success) {
      return localResult;
    }
    const rpcResult = await setAppPinRpc(newPin);
    if (rpcResult !== null && !rpcResult.success) {
      return rpcResult;
    }
    return { success: true };
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

    localStorage.setItem(this.getKey('global_utr'), JSON.stringify(records));
    return records;
  }

  public getGlobalUtrRecords(): GlobalUtrRecord[] {
    const raw = localStorage.getItem(this.getKey('global_utr'));
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
    const raw = localStorage.getItem(this.getKey('khata_people'));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async addKhataPerson(
    data: Omit<KhataPerson, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<KhataPerson & { success: boolean; error?: string }> {
    const newPerson: KhataPerson = {
      id: `person-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: this.currentUserId,
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('khata_people')
          .insert({
            id: newPerson.id,
            user_id: this.currentUserId,
            name: newPerson.name,
            phone: newPerson.phone || null,
            notes: newPerson.notes || null,
            created_at: newPerson.createdAt,
            updated_at: newPerson.updatedAt
          });

        if (error) {
          logSupabaseError('addKhataPerson', error);
          return { ...newPerson, success: false, error: error.message };
        }
      }
    }

    const people = this.getKhataPeople();
    people.unshift(newPerson);
    localStorage.setItem(this.getKey('khata_people'), JSON.stringify(people));
    this.notify();
    return { ...newPerson, success: true };
  }

  public async updateKhataPerson(
    id: string,
    data: Partial<Omit<KhataPerson, 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string; person?: KhataPerson }> {
    const people = this.getKhataPeople();
    const index = people.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Person not found' };

    const updated: KhataPerson = {
      ...people[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const updatePayload: Record<string, any> = {
          updated_at: updated.updatedAt
        };
        if (data.name !== undefined) updatePayload.name = data.name.trim();
        if (data.phone !== undefined) updatePayload.phone = data.phone?.trim() || null;
        if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;

        const { error } = await supabase
          .from('khata_people')
          .update(updatePayload)
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (error) {
          logSupabaseError('updateKhataPerson', error);
          return { success: false, error: error.message };
        }

        if (data.name && data.name !== people[index].name) {
          await supabase
            .from('khata_transactions')
            .update({ person_name: data.name })
            .eq('person_id', id)
            .eq('user_id', this.currentUserId);
        }
      }
    }

    people[index] = updated;
    localStorage.setItem(this.getKey('khata_people'), JSON.stringify(people));

    // Update name on associated transactions if changed
    if (data.name && data.name !== people[index].name) {
      const txs = this.getKhataTransactions();
      const updatedTxs = txs.map(t => (t.personId === id ? { ...t, personName: data.name! } : t));
      localStorage.setItem(this.getKey('khata_transactions'), JSON.stringify(updatedTxs));
    }

    this.notify();
    return { success: true, person: updated };
  }

  public async deleteKhataPerson(id: string): Promise<{ success: boolean; error?: string }> {
    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        // Delete child transactions first
        const { error: txErr } = await supabase
          .from('khata_transactions')
          .delete()
          .eq('person_id', id)
          .eq('user_id', this.currentUserId);
        if (txErr) {
          logSupabaseError('deleteKhataPerson - child transactions', txErr);
          return { success: false, error: txErr.message };
        }

        const { error } = await supabase
          .from('khata_people')
          .delete()
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (error) {
          logSupabaseError('deleteKhataPerson', error);
          return { success: false, error: error.message };
        }
      }
    }

    const people = this.getKhataPeople().filter(p => p.id !== id);
    localStorage.setItem(this.getKey('khata_people'), JSON.stringify(people));

    // Remove transactions for this person as well
    const txs = this.getKhataTransactions().filter(t => t.personId !== id);
    localStorage.setItem(this.getKey('khata_transactions'), JSON.stringify(txs));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true };
  }

  public getKhataTransactions(): KhataTransaction[] {
    const raw = localStorage.getItem(this.getKey('khata_transactions'));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async addKhataTransaction(
    data: Omit<KhataTransaction, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string; transaction?: KhataTransaction }> {
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

    const newTx: KhataTransaction = {
      ...data,
      id: `kht-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: this.currentUserId,
      createdAt: new Date().toISOString()
    };

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('khata_transactions')
          .insert({
            id: newTx.id,
            user_id: this.currentUserId,
            person_id: newTx.personId,
            person_name: newTx.personName,
            type: newTx.type,
            amount: newTx.amount,
            transaction_date: newTx.date,
            payment_method: newTx.paymentMethod,
            utr_number: newTx.utrNumber || null,
            notes: newTx.notes || null,
            created_at: newTx.createdAt
          });

        if (error) {
          logSupabaseError('addKhataTransaction', error);
          return { success: false, error: error.message };
        }

        if (newTx.utrNumber && !this.isCashOrNoUtr(newTx.utrNumber)) {
          await supabase.from('global_utr_registry').upsert({
            id: `utr-${newTx.id}`,
            user_id: this.currentUserId,
            utr_number: newTx.utrNumber.trim(),
            source_module: 'Khata',
            record_id: newTx.id,
            amount: newTx.amount,
            transaction_date: newTx.date,
            description: `${newTx.type} - ${newTx.personName}`,
            created_at: newTx.createdAt
          });
        }
      }
    }

    const txs = this.getKhataTransactions();
    txs.unshift(newTx);
    localStorage.setItem(this.getKey('khata_transactions'), JSON.stringify(txs));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, transaction: newTx };
  }

  public async updateKhataTransaction(
    id: string,
    data: Partial<Omit<KhataTransaction, 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string; transaction?: KhataTransaction }> {
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

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('khata_transactions')
          .update({
            person_id: updated.personId,
            person_name: updated.personName,
            type: updated.type,
            amount: updated.amount,
            transaction_date: updated.date,
            payment_method: updated.paymentMethod,
            utr_number: updated.utrNumber || null,
            notes: updated.notes || null
          })
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (error) {
          logSupabaseError('updateKhataTransaction', error);
          return { success: false, error: error.message };
        }

        if (updated.utrNumber && !this.isCashOrNoUtr(updated.utrNumber)) {
          await supabase.from('global_utr_registry').upsert({
            id: `utr-${updated.id}`,
            user_id: this.currentUserId,
            utr_number: updated.utrNumber.trim(),
            source_module: 'Khata',
            record_id: updated.id,
            amount: updated.amount,
            transaction_date: updated.date,
            description: `${updated.type} - ${updated.personName}`,
            created_at: updated.createdAt
          });
        }
      }
    }

    txs[index] = updated;
    localStorage.setItem(this.getKey('khata_transactions'), JSON.stringify(txs));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, transaction: updated };
  }

  public async deleteKhataTransaction(id: string): Promise<{ success: boolean; error?: string }> {
    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('khata_transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (error) {
          logSupabaseError('deleteKhataTransaction', error);
          return { success: false, error: error.message };
        }

        await supabase
          .from('global_utr_registry')
          .delete()
          .eq('record_id', id)
          .eq('user_id', this.currentUserId);
      }
    }

    const txs = this.getKhataTransactions().filter(t => t.id !== id);
    localStorage.setItem(this.getKey('khata_transactions'), JSON.stringify(txs));
    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true };
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
        // Money Given: User gives money (Receivable)
        // Money Received: User gets money back (Reduces receivable)
        // Short-Term Loan Given: User gives loan (Receivable)
        // Short-Term Loan Borrowed: User receives borrowed money (Payable)
        // Loan Return: Return of loan
      }
    }

    // Pure logic:
    // Money Given to Person: +Given
    // Money Received from Person: +Received
    // Short-Term Loan Given: +Given
    // Short-Term Loan Borrowed: User borrowed from them (+Received/Payable)
    // Loan Return:
    // If User gave money and person returns: Person gives to User (+Received)
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
          // If given > received, this was person returning money to User
          if (given > received) {
            received += amt;
          } else {
            returnedToPerson += amt;
          }
          break;
      }
    }

    // Net amounts:
    // User's receivable from person: (given - received)
    // User's payable to person: (borrowedFromPerson - returnedToPerson)
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
    const raw = localStorage.getItem(this.getKey('expenses'));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async addExpense(
    data: Omit<Expense, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string; expense?: Expense }> {
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

    const newExpense: Expense = {
      ...data,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: this.currentUserId,
      createdAt: new Date().toISOString()
    };

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('expenses')
          .insert({
            id: newExpense.id,
            user_id: this.currentUserId,
            amount: newExpense.amount,
            category: newExpense.category,
            expense_date: newExpense.date,
            payment_method: newExpense.paymentMethod,
            utr_number: newExpense.utrNumber || null,
            notes: newExpense.notes || null,
            created_at: newExpense.createdAt
          });

        if (error) {
          logSupabaseError('addExpense', error);
          return { success: false, error: error.message };
        }

        if (newExpense.utrNumber && !this.isCashOrNoUtr(newExpense.utrNumber)) {
          await supabase.from('global_utr_registry').upsert({
            id: `utr-${newExpense.id}`,
            user_id: this.currentUserId,
            utr_number: newExpense.utrNumber.trim(),
            source_module: 'Expenses',
            record_id: newExpense.id,
            amount: newExpense.amount,
            transaction_date: newExpense.date,
            description: `Expense - ${newExpense.category}`,
            created_at: newExpense.createdAt
          });
        }
      }
    }

    const expenses = this.getExpenses();
    expenses.unshift(newExpense);
    localStorage.setItem(this.getKey('expenses'), JSON.stringify(expenses));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, expense: newExpense };
  }

  public async updateExpense(
    id: string,
    data: Partial<Omit<Expense, 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string; expense?: Expense }> {
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

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('expenses')
          .update({
            amount: updated.amount,
            category: updated.category,
            expense_date: updated.date,
            payment_method: updated.paymentMethod,
            utr_number: updated.utrNumber || null,
            notes: updated.notes || null
          })
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (error) {
          logSupabaseError('updateExpense', error);
          return { success: false, error: error.message };
        }

        if (updated.utrNumber && !this.isCashOrNoUtr(updated.utrNumber)) {
          await supabase.from('global_utr_registry').upsert({
            id: `utr-${updated.id}`,
            user_id: this.currentUserId,
            utr_number: updated.utrNumber.trim(),
            source_module: 'Expenses',
            record_id: updated.id,
            amount: updated.amount,
            transaction_date: updated.date,
            description: `Expense - ${updated.category}`,
            created_at: updated.createdAt
          });
        }
      }
    }

    expenses[index] = updated;
    localStorage.setItem(this.getKey('expenses'), JSON.stringify(expenses));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, expense: updated };
  }

  public async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (error) {
          logSupabaseError('deleteExpense', error);
          return { success: false, error: error.message };
        }

        await supabase
          .from('global_utr_registry')
          .delete()
          .eq('record_id', id)
          .eq('user_id', this.currentUserId);
      }
    }

    const expenses = this.getExpenses().filter(e => e.id !== id);
    localStorage.setItem(this.getKey('expenses'), JSON.stringify(expenses));
    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true };
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
    const raw = localStorage.getItem(this.getKey('long_term_loans'));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async addLongTermLoan(
    data: Omit<LongTermLoan, 'id' | 'status' | 'closedDate' | 'createdAt' | 'updatedAt' | 'repayments'>
  ): Promise<{ success: boolean; error?: string; loan?: LongTermLoan }> {
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

    const newLoan: LongTermLoan = {
      ...data,
      id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: this.currentUserId,
      status: 'Active',
      repayments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('long_term_loans')
          .insert({
            id: newLoan.id,
            user_id: this.currentUserId,
            person_name: newLoan.personName,
            loan_type: newLoan.loanType,
            original_amount: newLoan.originalAmount,
            start_date: newLoan.startDate,
            expected_return_date: newLoan.expectedReturnDate,
            payment_method: newLoan.paymentMethod,
            utr_number: newLoan.utrNumber || null,
            notes: newLoan.notes || null,
            status: newLoan.status,
            closed_date: newLoan.closedDate || null,
            created_at: newLoan.createdAt,
            updated_at: newLoan.updatedAt
          });

        if (error) {
          logSupabaseError('addLongTermLoan', error);
          return { success: false, error: error.message };
        }

        if (newLoan.utrNumber && !this.isCashOrNoUtr(newLoan.utrNumber)) {
          await supabase.from('global_utr_registry').upsert({
            id: `utr-${newLoan.id}`,
            user_id: this.currentUserId,
            utr_number: newLoan.utrNumber.trim(),
            source_module: 'Long-Term Loans',
            record_id: newLoan.id,
            amount: newLoan.originalAmount,
            transaction_date: newLoan.startDate,
            description: `${newLoan.loanType} - ${newLoan.personName}`,
            created_at: newLoan.createdAt
          });
        }
      }
    }

    const loans = this.getLongTermLoans();
    loans.unshift(newLoan);
    localStorage.setItem(this.getKey('long_term_loans'), JSON.stringify(loans));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, loan: newLoan };
  }

  public async updateLongTermLoan(
    id: string,
    data: Partial<Omit<LongTermLoan, 'id' | 'createdAt' | 'repayments'>>
  ): Promise<{ success: boolean; error?: string; loan?: LongTermLoan }> {
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

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('long_term_loans')
          .update({
            person_name: updated.personName,
            loan_type: updated.loanType,
            original_amount: updated.originalAmount,
            start_date: updated.startDate,
            expected_return_date: updated.expectedReturnDate,
            payment_method: updated.paymentMethod,
            utr_number: updated.utrNumber || null,
            notes: updated.notes || null,
            status: updated.status,
            closed_date: updated.closedDate || null,
            updated_at: updated.updatedAt
          })
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (error) {
          logSupabaseError('updateLongTermLoan', error);
          return { success: false, error: error.message };
        }

        if (updated.utrNumber && !this.isCashOrNoUtr(updated.utrNumber)) {
          await supabase.from('global_utr_registry').upsert({
            id: `utr-${updated.id}`,
            user_id: this.currentUserId,
            utr_number: updated.utrNumber.trim(),
            source_module: 'Long-Term Loans',
            record_id: updated.id,
            amount: updated.originalAmount,
            transaction_date: updated.startDate,
            description: `${updated.loanType} - ${updated.personName}`,
            created_at: updated.createdAt
          });
        }
      }
    }

    loans[index] = updated;
    localStorage.setItem(this.getKey('long_term_loans'), JSON.stringify(loans));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, loan: updated };
  }

  public async deleteLongTermLoan(id: string): Promise<{ success: boolean; error?: string }> {
    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        // Delete child repayments first
        const { error: repErr } = await supabase
          .from('loan_repayments')
          .delete()
          .eq('loan_id', id)
          .eq('user_id', this.currentUserId);
        if (repErr) {
          logSupabaseError('deleteLongTermLoan - delete repayments', repErr);
          return { success: false, error: repErr.message };
        }

        const { error } = await supabase
          .from('long_term_loans')
          .delete()
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (error) {
          logSupabaseError('deleteLongTermLoan', error);
          return { success: false, error: error.message };
        }

        await supabase
          .from('global_utr_registry')
          .delete()
          .eq('record_id', id)
          .eq('user_id', this.currentUserId);
      }
    }

    const loans = this.getLongTermLoans().filter(l => l.id !== id);
    localStorage.setItem(this.getKey('long_term_loans'), JSON.stringify(loans));
    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true };
  }

  // Add a partial repayment to a loan
  public async addLoanRepayment(
    loanId: string,
    data: Omit<LoanRepayment, 'id' | 'loanId' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string; loan?: LongTermLoan }> {
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
      userId: this.currentUserId,
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

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error: repErr } = await supabase
          .from('loan_repayments')
          .insert({
            id: newRepayment.id,
            user_id: this.currentUserId,
            loan_id: loanId,
            amount: newRepayment.amount,
            repayment_date: newRepayment.date,
            payment_method: newRepayment.paymentMethod,
            utr_number: newRepayment.utrNumber || null,
            notes: newRepayment.notes || null,
            created_at: newRepayment.createdAt
          });

        if (repErr) {
          logSupabaseError('addLoanRepayment', repErr);
          return { success: false, error: repErr.message };
        }

        // Update loan status in Supabase
        const { error: loanErr } = await supabase
          .from('long_term_loans')
          .update({
            status: updatedLoan.status,
            closed_date: updatedLoan.closedDate || null,
            updated_at: updatedLoan.updatedAt
          })
          .eq('id', loanId)
          .eq('user_id', this.currentUserId);

        if (loanErr) {
          logSupabaseError('addLoanRepayment - update loan', loanErr);
        }

        if (newRepayment.utrNumber && !this.isCashOrNoUtr(newRepayment.utrNumber)) {
          await supabase.from('global_utr_registry').upsert({
            id: `utr-${newRepayment.id}`,
            user_id: this.currentUserId,
            utr_number: newRepayment.utrNumber.trim(),
            source_module: 'Long-Term Loans Repayment',
            record_id: newRepayment.id,
            amount: newRepayment.amount,
            transaction_date: newRepayment.date,
            description: `Repayment for ${loan.personName}`,
            created_at: newRepayment.createdAt
          });
        }
      }
    }

    loans[index] = updatedLoan;
    localStorage.setItem(this.getKey('long_term_loans'), JSON.stringify(loans));

    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true, loan: updatedLoan };
  }

  // Delete a repayment
  public async deleteLoanRepayment(loanId: string, repaymentId: string): Promise<{ success: boolean; error?: string }> {
    const loans = this.getLongTermLoans();
    const index = loans.findIndex(l => l.id === loanId);
    if (index === -1) return { success: false, error: 'Loan not found' };

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

    const updatedLoan: LongTermLoan = {
      ...loan,
      repayments: updatedRepayments,
      status: newStatus,
      closedDate,
      updatedAt: new Date().toISOString()
    };

    if (this.isSupabaseUser(this.currentUserId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { error: repErr } = await supabase
          .from('loan_repayments')
          .delete()
          .eq('id', repaymentId)
          .eq('user_id', this.currentUserId);

        if (repErr) {
          logSupabaseError('deleteLoanRepayment', repErr);
          return { success: false, error: repErr.message };
        }

        const { error: loanErr } = await supabase
          .from('long_term_loans')
          .update({
            status: updatedLoan.status,
            closed_date: updatedLoan.closedDate || null,
            updated_at: updatedLoan.updatedAt
          })
          .eq('id', loanId)
          .eq('user_id', this.currentUserId);

        if (loanErr) {
          logSupabaseError('deleteLoanRepayment - update loan', loanErr);
        }

        await supabase
          .from('global_utr_registry')
          .delete()
          .eq('record_id', repaymentId)
          .eq('user_id', this.currentUserId);
      }
    }

    loans[index] = updatedLoan;
    localStorage.setItem(this.getKey('long_term_loans'), JSON.stringify(loans));
    this.rebuildGlobalUtrRegistry();
    this.notify();
    return { success: true };
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
        localStorage.setItem(this.getKey('khata_people'), JSON.stringify(data.khataPeople));
      }
      if (data.khataTransactions) {
        localStorage.setItem(this.getKey('khata_transactions'), JSON.stringify(data.khataTransactions));
      }
      if (data.expenses) {
        localStorage.setItem(this.getKey('expenses'), JSON.stringify(data.expenses));
      }
      if (data.longTermLoans) {
        localStorage.setItem(this.getKey('long_term_loans'), JSON.stringify(data.longTermLoans));
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
    localStorage.removeItem(this.getKey('khata_people'));
    localStorage.removeItem(this.getKey('khata_transactions'));
    localStorage.removeItem(this.getKey('expenses'));
    localStorage.removeItem(this.getKey('long_term_loans'));
    this.initialized = false;
    this.init();
  }
}

export const storage = new StorageService();
