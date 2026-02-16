-- ============================================================
-- Cuentas Claras - Fix Category Balances View
-- Migration: 00013_fix_category_balances
-- Description: Fix balance_ars formula to include net transfers,
--              and use COUNT(DISTINCT) to avoid inflation from OR JOIN
-- ============================================================

-- DROP necesario porque CREATE OR REPLACE no permite cambiar columnas
DROP VIEW IF EXISTS category_balances;

CREATE VIEW category_balances AS
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
  -- FIX: balance ahora incluye transferencias netas
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
  -- FIX: COUNT(DISTINCT) evita inflacion por el OR JOIN
  COUNT(DISTINCT t.id) AS transaction_count
FROM categories c
LEFT JOIN transactions t ON (t.category_id = c.id OR t.transfer_to_category_id = c.id)
GROUP BY c.id, c.name, c.color, c.icon, c.season_id,
         c.budget_limit_ars, c.budget_limit_usd, c.is_active;
