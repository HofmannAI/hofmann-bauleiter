-- ============================================================
-- 0007_defect_plan_crop
-- Plan-Crop pro Mangel: 400×300px JPEG-Ausschnitt um den Pin.
--
-- - defects.plan_crop_path: nullable text — Storage-Pfad
--   (z.B. "<projectId>/<defectId>.jpg" im Bucket defect-crops)
-- - Storage-Bucket "defect-crops" privat + Pfad-basierte RLS analog
--   defect-photos / plans / musterdetails (erste URL-Komponente =
--   Project-ID, gegen project_members geprüft via is_project_member).
--
-- Idempotent + transaktional. Backwards-compatible: existierende
-- Mängel ohne Crop laufen weiter (NULL).
-- ============================================================

BEGIN;

ALTER TABLE public.defects
  ADD COLUMN IF NOT EXISTS plan_crop_path text;

-- Storage-Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('defect-crops', 'defect-crops', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "members rw defect-crops" ON storage.objects;
CREATE POLICY "members rw defect-crops" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'defect-crops'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  )
  WITH CHECK (
    bucket_id = 'defect-crops'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  );

COMMIT;
