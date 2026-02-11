-- ============================================================
-- Cuentas Claras - Row Level Security Policies
-- Migration: 00003_rls_policies
-- Description: RLS policies for all tables
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

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

-- ============================================================
-- ENABLE RLS ON ALL TABLES
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

-- ============================================================
-- PROFILES
-- ============================================================

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

-- ============================================================
-- SEASONS
-- ============================================================

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

-- ============================================================
-- CATEGORIES
-- ============================================================

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

-- ============================================================
-- USER CATEGORY PERMISSIONS
-- ============================================================

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

-- ============================================================
-- TRANSACTIONS
-- ============================================================

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
    OR has_category_permission(category_id, 'create')
  );

CREATE POLICY "transactions_update_permitted"
  ON transactions FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR (has_category_permission(category_id, 'edit') AND created_by = auth.uid())
  );

CREATE POLICY "transactions_delete_admin"
  ON transactions FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================================
-- ATTACHMENTS
-- ============================================================

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

-- ============================================================
-- APPROVAL REQUESTS
-- ============================================================

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

-- ============================================================
-- CURRENCY RATES
-- ============================================================

CREATE POLICY "rates_select_authenticated"
  ON currency_rates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "rates_insert_admin_manager"
  ON currency_rates FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- BUDGET ALERTS
-- ============================================================

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

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_system"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE POLICY "audit_select_admin_manager"
  ON audit_log FOR SELECT
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "audit_insert_system"
  ON audit_log FOR INSERT
  WITH CHECK (true);
