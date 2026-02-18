-- ============================================================
-- Cuentas Claras - Fix SECURITY DEFINER issues
-- Migration: 00018_fix_security_definer
-- Description: Drop unused category_balances view and change
--              get_category_balances RPC to SECURITY INVOKER
--              so it respects the calling user's RLS policies.
-- ============================================================

-- 1. Drop vista no utilizada (el RPC la reemplazo en 00014)
DROP VIEW IF EXISTS category_balances;

-- 2. Recrear RPC con SECURITY INVOKER
--    Las RLS de categories y transactions ya filtran por permisos,
--    asi que no necesitamos SECURITY DEFINER.
CREATE OR REPLACE FUNCTION get_category_balances(p_season_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
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
    GROUP BY c.id, c.name, c.color, c.icon, c.season_id,
             c.budget_limit_ars, c.budget_limit_usd, c.is_active
    HAVING COUNT(DISTINCT t.id) > 0
  ) AS row_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
