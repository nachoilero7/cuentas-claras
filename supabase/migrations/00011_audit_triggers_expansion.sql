-- ============================================================
-- Cuentas Claras - Audit Triggers Expansion
-- Migration: 00011_audit_triggers_expansion
-- Description: Add audit triggers to 6 additional tables
-- ============================================================

-- Seasons: INSERT/UPDATE/DELETE
CREATE TRIGGER audit_seasons
  AFTER INSERT OR UPDATE OR DELETE ON seasons
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Approval requests: INSERT/UPDATE/DELETE
CREATE TRIGGER audit_approval_requests
  AFTER INSERT OR UPDATE OR DELETE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Recurring transactions: INSERT/UPDATE/DELETE
CREATE TRIGGER audit_recurring_transactions
  AFTER INSERT OR UPDATE OR DELETE ON recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Budget alerts: INSERT/UPDATE/DELETE
CREATE TRIGGER audit_budget_alerts
  AFTER INSERT OR UPDATE OR DELETE ON budget_alerts
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Notifications: INSERT/UPDATE/DELETE
CREATE TRIGGER audit_notifications
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- User category permissions: INSERT/UPDATE/DELETE
CREATE TRIGGER audit_user_category_permissions
  AFTER INSERT OR UPDATE OR DELETE ON user_category_permissions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
