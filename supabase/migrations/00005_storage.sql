-- ============================================================
-- Cuentas Claras - Storage Buckets
-- Migration: 00005_storage
-- Description: Supabase Storage configuration for file uploads
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('receipts', 'receipts', false, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('exports', 'exports', false, 10485760,
   ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

-- Storage policies for receipts
CREATE POLICY "receipts_upload_authenticated"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "receipts_view_authenticated"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "receipts_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Storage policies for exports
CREATE POLICY "exports_view_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "exports_insert_authenticated"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exports' AND auth.uid() IS NOT NULL);
