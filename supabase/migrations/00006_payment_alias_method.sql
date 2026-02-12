-- Migration: Add payment_alias to profiles and payment_method to transactions
-- Date: 2026-02-11

-- 1. Create payment_method enum type
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'digital_wallet', 'check');

-- 2. Add payment_alias column to profiles
ALTER TABLE profiles
  ADD COLUMN payment_alias TEXT;

COMMENT ON COLUMN profiles.payment_alias IS 'CBU/CVU/Alias de pago del usuario, visible para otros usuarios al realizar transferencias';

-- 3. Add payment_method column to transactions
ALTER TABLE transactions
  ADD COLUMN payment_method payment_method;

COMMENT ON COLUMN transactions.payment_method IS 'Metodo de pago utilizado: efectivo, transferencia bancaria, billetera virtual o cheque';
