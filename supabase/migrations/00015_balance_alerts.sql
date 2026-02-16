-- ============================================================
-- Cuentas Claras - Balance Alerts (replaces budget percentage alerts)
-- Migration: 00015_balance_alerts
-- Description: Changes budget alerts from percentage-of-limit
--              to absolute-amount-based balance alerts.
--              Two types: 'below' (balance < X) and 'above' (balance >= X)
-- ============================================================

-- Nuevo enum para tipo de alerta
DO $$ BEGIN
  CREATE TYPE balance_alert_type AS ENUM ('below', 'above');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Agregar nuevas columnas (IF NOT EXISTS)
ALTER TABLE budget_alerts
  ADD COLUMN IF NOT EXISTS alert_type balance_alert_type NOT NULL DEFAULT 'below',
  ADD COLUMN IF NOT EXISTS threshold_amount NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- Eliminar columnas obsoletas (IF EXISTS)
ALTER TABLE budget_alerts
  DROP COLUMN IF EXISTS threshold_percentage,
  DROP COLUMN IF EXISTS notify_roles;

-- Reemplazar constraint UNIQUE(category_id) por UNIQUE(category_id, alert_type)
-- Permite una alerta "below" y una "above" por rubro
ALTER TABLE budget_alerts
  DROP CONSTRAINT IF EXISTS budget_alerts_category_id_key;

DO $$ BEGIN
  ALTER TABLE budget_alerts
    ADD CONSTRAINT budget_alerts_category_type_key UNIQUE(category_id, alert_type);
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;
