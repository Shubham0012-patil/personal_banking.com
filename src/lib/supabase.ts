import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite env or local settings
export function getSupabaseCredentials() {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('smm_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('smm_supabase_anon_key') : null;

  const url = (envUrl || localUrl || '').trim();
  const key = (envKey || localKey || '').trim();

  return { url, key };
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
  get url() {
    return getSupabaseCredentials().url || 'https://gfsqukuppuloteiokpdb.supabase.co';
  },
  get anonKey() {
    return getSupabaseCredentials().key || '';
  }
};

export interface SupabaseErrorInfo {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
}

/**
 * Standard Supabase error logger complying with error logging requirement:
 * logs error.message, error.details, error.hint, error.code
 */
export function logSupabaseError(operation: string, error: any): SupabaseErrorInfo {
  const info: SupabaseErrorInfo = {
    message: error?.message || String(error),
    details: error?.details || null,
    hint: error?.hint || null,
    code: error?.code || null
  };
  console.error(`[Supabase Error - ${operation}]:`, {
    message: info.message,
    details: info.details,
    hint: info.hint,
    code: info.code
  });
  return info;
}

/**
 * Call the secure Supabase RPC has_app_pin()
 * Returns null if RPC is not available in database
 */
export async function hasAppPinRpc(): Promise<boolean | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('has_app_pin');
    if (error) {
      // Function not deployed yet in schema
      return null;
    }
    return typeof data === 'boolean' ? data : Boolean(data);
  } catch (err) {
    console.warn('has_app_pin RPC error:', err);
    return null;
  }
}

/**
 * Call the secure Supabase RPC set_app_pin(p_pin text)
 * Hashes and saves the PIN securely on the backend database
 */
export async function setAppPinRpc(pin: string): Promise<{ success: boolean; error?: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('set_app_pin', { p_pin: pin });
    if (error) {
      if (error.code === 'PGRST202') {
        // Function not deployed in database
        return null;
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('set_app_pin RPC error:', err);
    return null;
  }
}

/**
 * Call the secure Supabase RPC verify_app_pin(p_pin text)
 * Verifies the PIN on the database without exposing hash to client
 */
export async function verifyAppPinRpc(pin: string): Promise<boolean | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('verify_app_pin', { p_pin: pin });
    if (error) {
      if (error.code === 'PGRST202') {
        // Function not deployed in database
        return null;
      }
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.warn('verify_app_pin RPC error:', err);
    return null;
  }
}

/**
 * Call the secure Supabase RPC has_login_pin()
 * Returns null if RPC is not available in database
 */
export async function hasLoginPinRpc(): Promise<boolean | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('has_login_pin');
    if (error) {
      return null;
    }
    return typeof data === 'boolean' ? data : Boolean(data);
  } catch (err) {
    console.warn('has_login_pin RPC error:', err);
    return null;
  }
}

/**
 * Call the secure Supabase RPC set_login_pin(p_pin text)
 */
export async function setLoginPinRpc(pin: string): Promise<{ success: boolean; error?: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { error } = await supabase.rpc('set_login_pin', { p_pin: pin });
    if (error) {
      if (error.code === 'PGRST202') return null;
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('set_login_pin RPC error:', err);
    return null;
  }
}

/**
 * Call the secure Supabase RPC verify_login_pin(p_pin text)
 */
export async function verifyLoginPinRpc(pin: string): Promise<boolean | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('verify_login_pin', { p_pin: pin });
    if (error) {
      if (error.code === 'PGRST202') return null;
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.warn('verify_login_pin RPC error:', err);
    return null;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- NEXMONEY — SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Multi-User Personal Finance System with strict per-user Row Level Security (RLS)
-- =========================================================================

-- Enable UUID & pgcrypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SECURITY PINS: LOGIN PIN & TRANSACTION PIN (COMPLETELY SEPARATE)
CREATE TABLE IF NOT EXISTS app_pins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    login_pin_hash TEXT,
    login_pin_length INT DEFAULT 4,
    pin_hash TEXT, -- transaction pin hash
    pin_length INT DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE app_pins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own security PINs" ON app_pins;
CREATE POLICY "Users manage own security PINs" ON app_pins FOR ALL USING (auth.uid() = user_id);

-- Check if user has configured Login PIN
CREATE OR REPLACE FUNCTION has_login_pin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM app_pins WHERE user_id = auth.uid() AND login_pin_hash IS NOT NULL
    ) INTO v_has;
    RETURN v_has;
END;
$$;

-- Set or update Login PIN
CREATE OR REPLACE FUNCTION set_login_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF length(p_pin) NOT IN (4, 6) THEN
        RAISE EXCEPTION 'Login PIN must be 4 or 6 numeric digits';
    END IF;

    INSERT INTO app_pins (user_id, login_pin_hash, login_pin_length, updated_at)
    VALUES (
        auth.uid(),
        crypt(p_pin, gen_salt('bf', 10)),
        length(p_pin),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET login_pin_hash = crypt(p_pin, gen_salt('bf', 10)),
        login_pin_length = length(p_pin),
        updated_at = now();

    RETURN true;
END;
$$;

-- Verify Login PIN
CREATE OR REPLACE FUNCTION verify_login_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash text;
BEGIN
    SELECT login_pin_hash INTO v_stored_hash
    FROM app_pins
    WHERE user_id = auth.uid();

    IF v_stored_hash IS NULL THEN
        RETURN false;
    END IF;

    RETURN v_stored_hash = crypt(p_pin, v_stored_hash);
END;
$$;

-- RPC 1: Check if user has configured an application transaction PIN
CREATE OR REPLACE FUNCTION has_app_pin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM app_pins WHERE user_id = auth.uid()
    ) INTO v_has;
    RETURN v_has;
END;
$$;

-- RPC 2: Set or update application transaction PIN securely
CREATE OR REPLACE FUNCTION set_app_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF length(p_pin) NOT IN (4, 6) THEN
        RAISE EXCEPTION 'Transaction PIN must be 4 or 6 numeric digits';
    END IF;

    INSERT INTO app_pins (user_id, pin_hash, pin_length, updated_at)
    VALUES (
        auth.uid(),
        crypt(p_pin, gen_salt('bf', 10)),
        length(p_pin),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = crypt(p_pin, gen_salt('bf', 10)),
        pin_length = length(p_pin),
        updated_at = now();

    RETURN true;
END;
$$;

-- RPC 3: Verify transaction PIN against stored hash
CREATE OR REPLACE FUNCTION verify_app_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash text;
BEGIN
    SELECT pin_hash INTO v_stored_hash
    FROM app_pins
    WHERE user_id = auth.uid();

    IF v_stored_hash IS NULL THEN
        RETURN false;
    END IF;

    RETURN v_stored_hash = crypt(p_pin, v_stored_hash);
END;
$$;

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) DEFAULT 'User',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. GLOBAL UTR REGISTRY (Per-user unique UTR protection)
CREATE TABLE IF NOT EXISTS global_utr_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    utr_number VARCHAR(100) NOT NULL,
    source_module VARCHAR(50) NOT NULL, -- 'Khata', 'Expense', 'LongTermLoan', 'LoanRepayment'
    reference_id VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_utr UNIQUE(user_id, utr_number)
);

-- 4. SECTION 1: KHATA / SHORT-TERM TRANSACTIONS
CREATE TABLE IF NOT EXISTS khata_people (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS khata_transactions (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id VARCHAR(100) NOT NULL,
    person_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    utr_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SECTION 2: PERSONAL EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    utr_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SECTION 3: LONG-TERM LOANS
CREATE TABLE IF NOT EXISTS long_term_loans (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_name VARCHAR(255) NOT NULL,
    loan_type VARCHAR(50) NOT NULL,
    original_amount NUMERIC(15, 2) NOT NULL CHECK (original_amount > 0),
    start_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    utr_number VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    closed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. LONG-TERM LOAN REPAYMENTS
CREATE TABLE IF NOT EXISTS loan_repayments (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    repayment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    utr_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- STRICT ROW LEVEL SECURITY (RLS) POLICIES — ENFORCE COMPLETE USER ISOLATION
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE long_term_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_utr_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User profiles policy" ON profiles;
CREATE POLICY "User profiles policy" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "User khata_people policy" ON khata_people;
CREATE POLICY "User khata_people policy" ON khata_people FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User khata_transactions policy" ON khata_transactions;
CREATE POLICY "User khata_transactions policy" ON khata_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User expenses policy" ON expenses;
CREATE POLICY "User expenses policy" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User long_term_loans policy" ON long_term_loans;
CREATE POLICY "User long_term_loans policy" ON long_term_loans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User loan_repayments policy" ON loan_repayments;
CREATE POLICY "User loan_repayments policy" ON loan_repayments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User global_utr_registry policy" ON global_utr_registry;
CREATE POLICY "User global_utr_registry policy" ON global_utr_registry FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
`;

