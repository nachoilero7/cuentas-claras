-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  CUENTAS CLARAS - ESQUEMA COMPLETO CONSOLIDADO                         ║
-- ║                                                                         ║
-- ║  ⚠️  ADVERTENCIA: Este archivo es SOLO para referencia y deploys       ║
-- ║  frescos. NO ejecutar en bases de datos que ya tienen migraciones       ║
-- ║  aplicadas. Para bases existentes, usar los archivos individuales       ║
-- ║  de migracion (00001 a 00012).                                          ║
-- ║                                                                         ║
-- ║  Consolida migraciones: 00001 a 00016                                   ║
-- ║  Generado: 2026-02-16                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ============================================================
-- 2. ENUMS
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
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'digital_wallet', 'check');
CREATE TYPE balance_alert_type AS ENUM ('below', 'above');

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3.1 PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  phone TEXT,
  payment_alias TEXT,
  push_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN profiles.payment_alias IS
  'CBU/CVU/Alias de pago del usuario, visible para otros usuarios al realizar transferencias';

-- 3.2 SEASONS (period management)
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

CREATE UNIQUE INDEX idx_seasons_current
  ON seasons (is_current) WHERE is_current = true;

-- 3.3 CATEGORIES (rubros)
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

-- 3.4 USER CATEGORY PERMISSIONS
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

-- 3.5 TRANSACTIONS
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
  payment_method payment_method,
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

COMMENT ON COLUMN transactions.payment_method IS
  'Metodo de pago utilizado: efectivo, transferencia bancaria, billetera virtual o cheque';

CREATE UNIQUE INDEX idx_transactions_client_id
  ON transactions (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_season ON transactions(season_id);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transactions_type_date ON transactions(type, transaction_date);

-- 3.6 ATTACHMENTS
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

-- 3.7 APPROVAL REQUESTS
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

-- 3.8 CURRENCY RATES
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

-- 3.9 BUDGET ALERTS (balance-based: below/above threshold)
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  alert_type balance_alert_type NOT NULL DEFAULT 'below',
  threshold_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, alert_type)
);

-- 3.10 NOTIFICATIONS
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

-- 3.11 AUDIT LOG
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

-- 3.12 RECURRING TRANSACTIONS
CREATE TABLE recurring_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  description TEXT NOT NULL,
  notes TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'digital_wallet', 'check')),
  category_id UUID NOT NULL REFERENCES categories(id),
  transfer_to_category_id UUID REFERENCES categories(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_execution DATE NOT NULL,
  last_executed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_next_execution
  ON recurring_transactions(next_execution) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_created_by
  ON recurring_transactions(created_by);

-- ============================================================
-- 4. FUNCTIONS (versiones hardened de 00010)
-- ============================================================

-- 4.1 Auto-create profile on signup (hardened: always 'viewer')
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    'viewer'  -- SIEMPRE viewer, nunca leer rol desde metadata
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Get user role (hardened: checks is_active)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4.3 Category permission check
CREATE OR REPLACE FUNCTION has_category_permission(
  p_category_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF get_user_role() = 'admin' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM user_category_permissions
    WHERE user_id = auth.uid()
      AND category_id = p_category_id
      AND CASE p_permission
        WHEN 'view' THEN can_view
        WHEN 'create' THEN can_create
        WHEN 'edit' THEN can_edit
        WHEN 'delete' THEN can_delete
        ELSE false
      END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.4 Audit log trigger function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.5 Compute amount_in_ars from exchange rate
CREATE OR REPLACE FUNCTION compute_amount_in_ars()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.currency = 'ARS' THEN
    NEW.amount_in_ars := NEW.amount;
  ELSIF NEW.currency = 'USD' AND NEW.exchange_rate IS NOT NULL THEN
    NEW.amount_in_ars := NEW.amount * NEW.exchange_rate;
  ELSE
    SELECT rate INTO NEW.exchange_rate
    FROM currency_rates
    WHERE from_currency = 'USD' AND to_currency = 'ARS'
    ORDER BY effective_date DESC
    LIMIT 1;

    IF NEW.exchange_rate IS NOT NULL THEN
      NEW.amount_in_ars := NEW.amount * NEW.exchange_rate;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.6 Prevent transaction type change (immutability)
CREATE OR REPLACE FUNCTION prevent_transaction_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type IS DISTINCT FROM NEW.type THEN
    RAISE EXCEPTION 'No se puede cambiar el tipo de una transaccion existente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.7 Set current season (hardened: admin-only)
CREATE OR REPLACE FUNCTION set_current_season(p_season_id UUID)
RETURNS SETOF seasons AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true) != 'admin' THEN
    RAISE EXCEPTION 'Permisos insuficientes: solo administradores pueden cambiar la temporada actual';
  END IF;

  UPDATE seasons SET is_current = false WHERE is_current = true;
  UPDATE seasons SET is_current = true WHERE id = p_season_id;

  RETURN QUERY SELECT * FROM seasons WHERE id = p_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.8 Dashboard summary (hardened: permission-filtered, with USD)
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_season_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = true;

  SELECT json_build_object(
    'total_income_ars', COALESCE(SUM(CASE
      WHEN type = 'income' AND status = 'approved'
      THEN amount_in_ars ELSE 0
    END), 0),
    'total_expenses_ars', COALESCE(SUM(CASE
      WHEN type = 'expense' AND status = 'approved'
      THEN amount_in_ars ELSE 0
    END), 0),
    'net_balance_ars', COALESCE(SUM(CASE
      WHEN type = 'income' AND status = 'approved' THEN amount_in_ars
      WHEN type = 'expense' AND status = 'approved' THEN -amount_in_ars
      ELSE 0
    END), 0),
    'total_income_usd', COALESCE(SUM(CASE
      WHEN type = 'income' AND status = 'approved' AND currency = 'USD'
      THEN amount ELSE 0
    END), 0),
    'total_expenses_usd', COALESCE(SUM(CASE
      WHEN type = 'expense' AND status = 'approved' AND currency = 'USD'
      THEN amount ELSE 0
    END), 0),
    'net_balance_usd', COALESCE(SUM(CASE
      WHEN type = 'income' AND status = 'approved' AND currency = 'USD' THEN amount
      WHEN type = 'expense' AND status = 'approved' AND currency = 'USD' THEN -amount
      ELSE 0
    END), 0),
    'transaction_count', COUNT(*),
    'pending_approvals', COUNT(*) FILTER (WHERE status = 'pending')
  ) INTO result
  FROM transactions
  WHERE (p_season_id IS NULL OR season_id = p_season_id)
    AND (v_role = 'admin' OR has_category_permission(category_id, 'view'));

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.9 Monthly breakdown (hardened: permission-filtered)
CREATE OR REPLACE FUNCTION get_monthly_breakdown(
  p_season_id UUID DEFAULT NULL,
  p_months INTEGER DEFAULT 6
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = true;

  SELECT json_agg(row_data) INTO result
  FROM (
    SELECT
      TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month,
      TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon YYYY') AS label,
      COALESCE(SUM(CASE WHEN type = 'income' AND status = 'approved'
        THEN amount_in_ars ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'approved'
        THEN amount_in_ars ELSE 0 END), 0) AS expenses
    FROM transactions
    WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - (p_months || ' months')::INTERVAL
      AND (p_season_id IS NULL OR season_id = p_season_id)
      AND (v_role = 'admin' OR has_category_permission(category_id, 'view'))
    GROUP BY DATE_TRUNC('month', transaction_date)
    ORDER BY DATE_TRUNC('month', transaction_date)
  ) AS row_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.10 Category breakdown (hardened: permission-filtered)
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_season_id UUID DEFAULT NULL,
  p_type transaction_type DEFAULT 'expense',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = true;

  SELECT json_agg(row_data) INTO result
  FROM (
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.color,
      c.icon,
      COALESCE(SUM(t.amount_in_ars), 0) AS total_ars,
      COUNT(t.id) AS count
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id
      AND t.type = p_type
      AND t.status = 'approved'
      AND (p_start_date IS NULL OR t.transaction_date >= p_start_date)
      AND (p_end_date IS NULL OR t.transaction_date <= p_end_date)
    WHERE c.is_active = true
      AND (p_season_id IS NULL OR c.season_id = p_season_id)
      AND (v_role = 'admin' OR has_category_permission(c.id, 'view'))
    GROUP BY c.id, c.name, c.color, c.icon
    HAVING COALESCE(SUM(t.amount_in_ars), 0) > 0
    ORDER BY total_ars DESC
  ) AS row_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- 5.1 Auto-create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5.2 updated_at auto-update
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_categories
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_seasons
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_recurring_transactions
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- 5.3 Computed field: amount_in_ars
CREATE TRIGGER compute_ars_amount
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION compute_amount_in_ars();

-- 5.4 Transaction type immutability
CREATE TRIGGER enforce_transaction_type_immutability
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_transaction_type_change();

-- 5.5 Audit triggers (9 tables)
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_categories
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_profiles
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_seasons
  AFTER INSERT OR UPDATE OR DELETE ON seasons
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_approval_requests
  AFTER INSERT OR UPDATE OR DELETE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_recurring_transactions
  AFTER INSERT OR UPDATE OR DELETE ON recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_budget_alerts
  AFTER INSERT OR UPDATE OR DELETE ON budget_alerts
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_notifications
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_user_category_permissions
  AFTER INSERT OR UPDATE OR DELETE ON user_category_permissions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================================
-- 6. ROW LEVEL SECURITY (versiones hardened de 00010)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- 6.1 PROFILES
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

-- 6.2 SEASONS
CREATE POLICY "seasons_select_authenticated"
  ON seasons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "seasons_insert_admin"
  ON seasons FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "seasons_update_admin"
  ON seasons FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "seasons_delete_admin"
  ON seasons FOR DELETE
  USING (get_user_role() = 'admin');

-- 6.3 CATEGORIES
CREATE POLICY "categories_select_permitted"
  ON categories FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR has_category_permission(id, 'view')
  );

CREATE POLICY "categories_insert_admin_manager"
  ON categories FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "categories_update_admin"
  ON categories FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "categories_delete_admin"
  ON categories FOR DELETE
  USING (get_user_role() = 'admin');

-- 6.4 USER CATEGORY PERMISSIONS
CREATE POLICY "permissions_select_own_or_admin"
  ON user_category_permissions FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "permissions_manage_admin"
  ON user_category_permissions FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "permissions_update_admin"
  ON user_category_permissions FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "permissions_delete_admin"
  ON user_category_permissions FOR DELETE
  USING (get_user_role() = 'admin');

-- 6.5 TRANSACTIONS (hardened: validates transfer destination category)
CREATE POLICY "transactions_select_permitted"
  ON transactions FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR has_category_permission(category_id, 'view')
  );

CREATE POLICY "transactions_insert_permitted"
  ON transactions FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR (
      has_category_permission(category_id, 'create')
      AND (
        transfer_to_category_id IS NULL
        OR has_category_permission(transfer_to_category_id, 'create')
      )
    )
  );

CREATE POLICY "transactions_update_permitted"
  ON transactions FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR (
      has_category_permission(category_id, 'edit')
      AND created_by = auth.uid()
      AND (
        transfer_to_category_id IS NULL
        OR has_category_permission(transfer_to_category_id, 'edit')
      )
    )
  );

CREATE POLICY "transactions_delete_admin"
  ON transactions FOR DELETE
  USING (get_user_role() = 'admin');

-- 6.6 ATTACHMENTS
CREATE POLICY "attachments_select_permitted"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_id
      AND (get_user_role() = 'admin' OR has_category_permission(t.category_id, 'view'))
    )
  );

CREATE POLICY "attachments_insert_own"
  ON attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_id
      AND (get_user_role() = 'admin' OR has_category_permission(t.category_id, 'create'))
    )
  );

CREATE POLICY "attachments_delete_admin"
  ON attachments FOR DELETE
  USING (get_user_role() = 'admin');

-- 6.7 APPROVAL REQUESTS
CREATE POLICY "approvals_select_relevant"
  ON approval_requests FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR requested_by = auth.uid()
    OR get_user_role() = 'manager'
  );

CREATE POLICY "approvals_insert_authenticated"
  ON approval_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "approvals_update_admin"
  ON approval_requests FOR UPDATE
  USING (get_user_role() = 'admin');

-- 6.8 CURRENCY RATES
CREATE POLICY "rates_select_authenticated"
  ON currency_rates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "rates_insert_admin_manager"
  ON currency_rates FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- 6.9 BUDGET ALERTS
CREATE POLICY "alerts_select_authenticated"
  ON budget_alerts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "alerts_manage_admin"
  ON budget_alerts FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "alerts_update_admin"
  ON budget_alerts FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "alerts_delete_admin"
  ON budget_alerts FOR DELETE
  USING (get_user_role() = 'admin');

-- 6.10 NOTIFICATIONS
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_system"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 6.11 AUDIT LOG
CREATE POLICY "audit_select_admin_manager"
  ON audit_log FOR SELECT
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "audit_insert_system"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- 6.12 RECURRING TRANSACTIONS
CREATE POLICY "admin_full_access_recurring" ON recurring_transactions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_own_recurring_select" ON recurring_transactions
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "user_own_recurring_insert" ON recurring_transactions
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "user_own_recurring_update" ON recurring_transactions
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "user_own_recurring_delete" ON recurring_transactions
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================
-- 7. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW category_balances AS
SELECT
  c.id AS category_id,
  c.name AS category_name,
  c.color,
  c.icon,
  c.season_id,
  c.budget_limit_ars,
  c.budget_limit_usd,
  c.is_active,
  COALESCE(SUM(CASE
    WHEN t.type = 'income' AND t.status = 'approved'
    THEN t.amount_in_ars ELSE 0
  END), 0) AS total_income_ars,
  COALESCE(SUM(CASE
    WHEN t.type = 'expense' AND t.status = 'approved'
    THEN t.amount_in_ars ELSE 0
  END), 0) AS total_expenses_ars,
  COALESCE(SUM(CASE
    WHEN t.type = 'transfer' AND t.status = 'approved' AND t.category_id = c.id
    THEN -t.amount_in_ars ELSE 0
  END), 0) +
  COALESCE(SUM(CASE
    WHEN t.type = 'transfer' AND t.status = 'approved' AND t.transfer_to_category_id = c.id
    THEN t.amount_in_ars ELSE 0
  END), 0) AS net_transfers_ars,
  COALESCE(SUM(CASE
    WHEN t.type = 'income' AND t.status = 'approved'
    THEN t.amount_in_ars ELSE 0
  END), 0)
  - COALESCE(SUM(CASE
    WHEN t.type = 'expense' AND t.status = 'approved'
    THEN t.amount_in_ars ELSE 0
  END), 0) AS balance_ars,
  COUNT(t.id) AS transaction_count
FROM categories c
LEFT JOIN transactions t ON (t.category_id = c.id OR t.transfer_to_category_id = c.id)
GROUP BY c.id, c.name, c.color, c.icon, c.season_id,
         c.budget_limit_ars, c.budget_limit_usd, c.is_active;

-- ============================================================
-- 8. STORAGE BUCKETS
-- ============================================================

-- 8.1 Receipts (comprobantes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('receipts', 'receipts', false, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('exports', 'exports', false, 10485760,
   ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('avatars', 'avatars', true, 2097152,
   ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- 8.2 Storage policies: receipts
CREATE POLICY "receipts_upload_authenticated"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "receipts_view_authenticated"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "receipts_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- 8.3 Storage policies: exports
CREATE POLICY "exports_view_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "exports_insert_authenticated"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exports' AND auth.uid() IS NOT NULL);

-- 8.4 Storage policies: avatars
CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
