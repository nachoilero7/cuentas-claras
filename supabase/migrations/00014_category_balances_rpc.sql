-- ============================================================
-- Cuentas Claras - Category Balances RPC
-- Migration: 00014_category_balances_rpc
-- Description: RPC function that computes category balances
--              filtered by TRANSACTION season_id (not category).
--              Fixes: dashboard showing empty when categories
--              have season_id = NULL but transactions have season_id set.
-- ============================================================

CREATE OR REPLACE FUNCTION get_category_balances(p_season_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = true;

  SELECT json_agg(row_data ORDER BY balance_ars DESC) INTO result
  FROM (
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
        WHEN t.type = 'income' AND t.status = 'approved' AND t.category_id = c.id
        THEN t.amount_in_ars ELSE 0
      END), 0) AS total_income_ars,
      COALESCE(SUM(CASE
        WHEN t.type = 'expense' AND t.status = 'approved' AND t.category_id = c.id
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
      -- Balance = ingresos - egresos + transferencias netas
      COALESCE(SUM(CASE
        WHEN t.type = 'income' AND t.status = 'approved' AND t.category_id = c.id
        THEN t.amount_in_ars ELSE 0
      END), 0)
      - COALESCE(SUM(CASE
        WHEN t.type = 'expense' AND t.status = 'approved' AND t.category_id = c.id
        THEN t.amount_in_ars ELSE 0
      END), 0)
      + COALESCE(SUM(CASE
        WHEN t.type = 'transfer' AND t.status = 'approved' AND t.category_id = c.id
        THEN -t.amount_in_ars ELSE 0
      END), 0)
      + COALESCE(SUM(CASE
        WHEN t.type = 'transfer' AND t.status = 'approved' AND t.transfer_to_category_id = c.id
        THEN t.amount_in_ars ELSE 0
      END), 0) AS balance_ars,
      COUNT(DISTINCT t.id) AS transaction_count
    FROM categories c
    LEFT JOIN transactions t
      ON (t.category_id = c.id OR t.transfer_to_category_id = c.id)
      AND (p_season_id IS NULL OR t.season_id = p_season_id)
    WHERE c.is_active = true
      AND (
        v_role = 'admin'
        OR has_category_permission(c.id, 'view')
      )
    GROUP BY c.id, c.name, c.color, c.icon, c.season_id,
             c.budget_limit_ars, c.budget_limit_usd, c.is_active
    HAVING COUNT(DISTINCT t.id) > 0
  ) AS row_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
