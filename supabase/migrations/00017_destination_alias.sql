-- 00017_destination_alias.sql
-- Agregar campo de alias/CBU/CVU destino en transacciones

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS destination_alias TEXT;

COMMENT ON COLUMN transactions.destination_alias
  IS 'Alias/CBU/CVU destino de la transferencia (opcional)';
