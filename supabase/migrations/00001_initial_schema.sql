-- ============================================================
-- Cuentas Claras - Initial Database Schema
-- Migration: 00001_initial_schema
-- Description: Creates all base tables, enums, extensions
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE currency_code AS ENUM ('ARS', 'USD');
CREATE TYPE audit_action AS ENUM (
  'create', 'update', 'delete',
  'approve', 'reject',
  'login', 'logout',
  'role_change', 'permission_change',
  'export'
);
CREATE TYPE season_status AS ENUM ('active', 'closed', 'planning');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- TABLES
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SEASONS (period management)
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status season_status NOT NULL DEFAULT 'planning',
  description TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one season can be current at a time
CREATE UNIQUE INDEX idx_seasons_current
  ON seasons (is_current) WHERE is_current = true;

-- 3. CATEGORIES (rubros)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  budget_limit_ars NUMERIC(15, 2),
  budget_limit_usd NUMERIC(15, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  season_id UUID REFERENCES seasons(id),
  parent_category_id UUID REFERENCES categories(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, season_id)
);

-- 4. USER CATEGORY PERMISSIONS
CREATE TABLE user_category_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- 5. TRANSACTIONS
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'approved',
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency currency_code NOT NULL DEFAULT 'ARS',
  exchange_rate NUMERIC(15, 6),
  amount_in_ars NUMERIC(15, 2),
  description TEXT NOT NULL,
  notes TEXT,
  category_id UUID NOT NULL REFERENCES categories(id),
  transfer_to_category_id UUID REFERENCES categories(id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  season_id UUID REFERENCES seasons(id),
  client_id TEXT,
  is_synced BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_transfer CHECK (
    (type = 'transfer' AND transfer_to_category_id IS NOT NULL) OR
    (type != 'transfer' AND transfer_to_category_id IS NULL)
  ),
  CONSTRAINT different_categories CHECK (
    transfer_to_category_id IS DISTINCT FROM category_id
  )
);

-- Deduplicate offline-created transactions
CREATE UNIQUE INDEX idx_transactions_client_id
  ON transactions (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_season ON transactions(season_id);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transactions_type_date ON transactions(type, transaction_date);

-- 6. ATTACHMENTS
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_transaction ON attachments(transaction_id);

-- 7. APPROVAL REQUESTS
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  status approval_status NOT NULL DEFAULT 'pending',
  threshold_amount NUMERIC(15, 2),
  comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CURRENCY RATES
CREATE TABLE currency_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency currency_code NOT NULL,
  to_currency currency_code NOT NULL,
  rate NUMERIC(15, 6) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'manual',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, effective_date)
);

-- 9. BUDGET ALERTS
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  threshold_percentage INTEGER NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_roles user_role[] NOT NULL DEFAULT '{admin, manager}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id)
);

-- 10. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- 11. AUDIT LOG
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action audit_action NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
