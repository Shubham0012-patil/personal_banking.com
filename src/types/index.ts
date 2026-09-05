export type PaymentMethod = 'PhonePe' | 'Google Pay' | 'Paytm' | 'Bank Transfer' | 'Cash' | 'Other';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'PhonePe',
  'Google Pay',
  'Paytm',
  'Bank Transfer',
  'Cash',
  'Other'
];

export type KhataTransactionType =
  | 'Money Given'
  | 'Money Received'
  | 'Short-Term Loan Given'
  | 'Short-Term Loan Borrowed'
  | 'Loan Return';

export const KHATA_TRANSACTION_TYPES: KhataTransactionType[] = [
  'Money Given',
  'Money Received',
  'Short-Term Loan Given',
  'Short-Term Loan Borrowed',
  'Loan Return'
];

export interface KhataPerson {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KhataTransaction {
  id: string;
  personId: string;
  personName: string;
  type: KhataTransactionType;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  utrNumber?: string;
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'Food'
  | 'Travel'
  | 'Shopping'
  | 'Recharge'
  | 'Education'
  | 'Bills'
  | 'Entertainment'
  | 'Medical'
  | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Travel',
  'Shopping',
  'Recharge',
  'Education',
  'Bills',
  'Entertainment',
  'Medical',
  'Other'
];

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  utrNumber?: string;
  notes?: string;
  createdAt: string;
}

export type LoanType = 'Loan Given' | 'Loan Borrowed';

export type LoanStatus = 'Active' | 'Partially Paid' | 'Closed' | 'Overdue';

export interface LoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  utrNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface LongTermLoan {
  id: string;
  personName: string;
  loanType: LoanType;
  originalAmount: number;
  startDate: string;
  expectedReturnDate: string;
  paymentMethod: PaymentMethod;
  utrNumber?: string;
  notes?: string;
  status: LoanStatus;
  closedDate?: string;
  createdAt: string;
  updatedAt: string;
  repayments: LoanRepayment[];
}

export interface GlobalUtrRecord {
  utrNumber: string;
  sourceModule: 'Khata' | 'Expense' | 'LongTermLoan' | 'LoanRepayment';
  referenceId: string;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  pinHash: string; // SHA-256 or masked PIN
  pinLength: 4 | 6;
  isPinSet: boolean;
}

export type ActiveTab = 'dashboard' | 'khata' | 'expenses' | 'loans' | 'reports' | 'settings';
