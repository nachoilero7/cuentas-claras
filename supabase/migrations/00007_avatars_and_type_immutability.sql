-- ============================================================
-- Cuentas Claras - Avatars Bucket + Transaction Type Immutability
-- Migration: 00007_avatars_and_type_immutability
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. BUCKET DE AVATARES
-- ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                                          -- publico (las fotos de perfil son visibles)
  2097152,                                       -- 2MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Usuarios autenticados pueden subir su propio avatar
CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Todos pueden ver avatares (bucket publico)
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Usuarios pueden actualizar su propio avatar
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Usuarios pueden borrar su propio avatar
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ────────────────────────────────────────────────────────────
-- 2. INMUTABILIDAD DEL TIPO DE TRANSACCION
-- ────────────────────────────────────────────────────────────
-- Impide cambiar el type (income/expense/transfer) despues de crear
-- la transaccion. Solo se valida en UPDATE, no en INSERT.

CREATE OR REPLACE FUNCTION prevent_transaction_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type IS DISTINCT FROM NEW.type THEN
    RAISE EXCEPTION 'No se puede cambiar el tipo de una transaccion existente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_transaction_type_immutability
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_transaction_type_change();
