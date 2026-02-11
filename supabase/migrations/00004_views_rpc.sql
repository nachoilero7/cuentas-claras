-- ============================================================
-- Cuentas Claras - Views and RPC Functions
-- Migration: 00004_views_rpc
-- Description: Database views and remote procedure calls
-- ============================================================

-- ============================================================
-- VIEWS
-- ============================================================

-- Category balance summary
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
-- RPC FUNCTIONS
-- ============================================================

-- Dashboard summary for a given season
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_season_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
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
    'transaction_count', COUNT(*),
    'pending_approvals', COUNT(*) FILTER (WHERE status = 'pending')
  ) INTO result
  FROM transactions
  WHERE (p_season_id IS NULL OR season_id = p_season_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monthly breakdown for charts
CREATE OR REPLACE FUNCTION get_monthly_breakdown(
  p_season_id UUID DEFAULT NULL,
  p_months INTEGER DEFAULT 6
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
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
    GROUP BY DATE_TRUNC('month', transaction_date)
    ORDER BY DATE_TRUNC('month', transaction_date)
  ) AS row_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Category breakdown for pie charts
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_season_id UUID DEFAULT NULL,
  p_type transaction_type DEFAULT 'expense',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
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
    GROUP BY c.id, c.name, c.color, c.icon
    HAVING COALESCE(SUM(t.amount_in_ars), 0) > 0
    ORDER BY total_ars DESC
  ) AS row_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
