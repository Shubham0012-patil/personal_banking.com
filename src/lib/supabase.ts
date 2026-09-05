import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite env or local settings
export function getSupabaseCredentials() {
  const localUrl = localStorage.getItem('smm_supabase_url');
  const localKey = localStorage.getItem('smm_supabase_anon_key');

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const url = localUrl || envUrl || '';
  const key = localKey || envKey || '';

  return { url: url.trim(), key: key.trim() };
}

let clientInstance: SupabaseClient | null = null;
let lastClientKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    return null;
  }

  const clientKey = `${url}:::${key}`;
  if (!clientInstance || lastClientKey !== clientKey) {
    try {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      lastClientKey = clientKey;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return clientInstance;
}

export const SUPABASE_CONFIG = {
  url: getSupabaseCredentials().url || 'https://sg-fintech.supabase.co',
  anonKey: getSupabaseCredentials().key || 'sb_anon_key_prod_financial_secure'
};

export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- SHUBHAM MONEY MANAGER — SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Single personal user: Shubham Godage (forexwithshubham0012@gmail.com)
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GLOBAL UTR REGISTRY
-- Enforces application-wide unique UTR protection across all modules
CREATE TABLE IF NOT EXISTS global_utr_registry (
    utr_number VARCHAR(100) PRIMARY KEY,
    source_module VARCHAR(50) NOT NULL, -- 'Khata', 'Expense', 'LongTermLoan', 'LoanRepayment'
    reference_id UUID NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USER PROFILES & PIN
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) DEFAULT 'Shubham Godage',
    pin_hash VARCHAR(255) NOT NULL,
    pin_length INT DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SECTION 1: KHATA / SHORT-TERM TRANSACTIONS
CREATE TABLE IF NOT EXISTS khata_people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS khata_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES khata_people(id) ON DELETE CASCADE,
    person_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Money Given', 'Money Received', 'Short-Term Loan Given', 'Short-Term Loan Borrowed', 'Loan Return'
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    utr_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SECTION 2: PERSONAL EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL, -- 'Food', 'Travel', 'Shopping', 'Recharge', 'Education', 'Bills', 'Entertainment', 'Medical', 'Other'
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    utr_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SECTION 3: LONG-TERM LOANS
CREATE TABLE IF NOT EXISTS long_term_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    person_name VARCHAR(255) NOT NULL,
    loan_type VARCHAR(50) NOT NULL, -- 'Loan Given', 'Loan Borrowed'
    original_amount NUMERIC(15, 2) NOT NULL CHECK (original_amount > 0),
    start_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    utr_number VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Partially Paid', 'Closed', 'Overdue'
    closed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. LONG-TERM LOAN REPAYMENTS
CREATE TABLE IF NOT EXISTS loan_repayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES long_term_loans(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    repayment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    utr_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE long_term_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_utr_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shubham profiles policy" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Shubham khata_people policy" ON khata_people FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Shubham khata_transactions policy" ON khata_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Shubham expenses policy" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Shubham long_term_loans policy" ON long_term_loans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Shubham loan_repayments policy" ON loan_repayments FOR ALL USING (true);
CREATE POLICY "Shubham global_utr_registry policy" ON global_utr_registry FOR ALL USING (true);
`;
