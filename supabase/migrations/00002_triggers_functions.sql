-- ============================================================
-- Cuentas Claras - Triggers and Functions
-- Migration: 00002_triggers_functions
-- Description: Auto-create profile, audit logging, updated_at triggers
-- ============================================================

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGERS
-- ============================================================

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

-- ============================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
    VALUES (
      auth.uid(),
      'create',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
    VALUES (
      auth.uid(),
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_categories
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_profiles
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================================
-- COMPUTED FIELDS: amount_in_ars
-- ============================================================

CREATE OR REPLACE FUNCTION compute_amount_in_ars()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.currency = 'ARS' THEN
    NEW.amount_in_ars := NEW.amount;
  ELSIF NEW.currency = 'USD' AND NEW.exchange_rate IS NOT NULL THEN
    NEW.amount_in_ars := NEW.amount * NEW.exchange_rate;
  ELSE
    -- If no exchange rate, try to get the latest one
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

CREATE TRIGGER compute_ars_amount
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION compute_amount_in_ars();
