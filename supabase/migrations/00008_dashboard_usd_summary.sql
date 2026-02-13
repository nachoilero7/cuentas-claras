-- ============================================================
-- Cuentas Claras - Dashboard USD Summary
-- Migration: 00008_dashboard_usd_summary
-- Description: Add USD totals to the dashboard summary RPC
-- ============================================================

-- Update get_dashboard_summary to include USD amounts
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
  WHERE (p_season_id IS NULL OR season_id = p_season_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
