-- ═══════════════════════════════════════════════════════════════════════════════
-- Tabla: recurring_transactions
-- Transacciones recurrentes (cuotas, suscripciones, pagos periodicos)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  description TEXT NOT NULL,
  notes TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'digital_wallet', 'check')),
  category_id UUID NOT NULL REFERENCES public.categories(id),
  transfer_to_category_id UUID REFERENCES public.categories(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_execution DATE NOT NULL,
  last_executed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_recurring_next_execution ON public.recurring_transactions(next_execution) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_created_by ON public.recurring_transactions(created_by);

-- Trigger para updated_at (usa moddatetime, igual que las demas tablas)
CREATE TRIGGER handle_updated_at_recurring_transactions
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Admin puede ver/modificar todo
CREATE POLICY "admin_full_access_recurring" ON public.recurring_transactions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Usuarios normales solo sus propias recurrentes
CREATE POLICY "user_own_recurring_select" ON public.recurring_transactions
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "user_own_recurring_insert" ON public.recurring_transactions
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "user_own_recurring_update" ON public.recurring_transactions
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "user_own_recurring_delete" ON public.recurring_transactions
  FOR DELETE
  USING (created_by = auth.uid());
