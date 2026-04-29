-- ============================================================
-- 0002_storage_buckets
-- Creates the four private buckets used by the app and locks down
-- access via path-based RLS policies on storage.objects.
--
-- Convention: every object key starts with "<projectId>/...".
-- Membership is checked via public.is_project_member() (defined in 0001).
--
-- Idempotent: bucket inserts use ON CONFLICT DO NOTHING; policy
-- creates are guarded by DROP POLICY IF EXISTS.
-- Wrapped in a transaction.
-- ============================================================

BEGIN;

-- Buckets are private (signed URLs only)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('checklist-photos', 'checklist-photos', false),
  ('defect-photos',    'defect-photos',    false),
  ('plans',            'plans',            false),
  ('musterdetails',    'musterdetails',    false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Policies on storage.objects, one per bucket.
-- The first segment of `name` (before the first '/') must be a UUID
-- that the current user is a member of via project_members.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "members rw checklist-photos" ON storage.objects;
CREATE POLICY "members rw checklist-photos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'checklist-photos'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  )
  WITH CHECK (
    bucket_id = 'checklist-photos'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  );

DROP POLICY IF EXISTS "members rw defect-photos" ON storage.objects;
CREATE POLICY "members rw defect-photos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'defect-photos'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  )
  WITH CHECK (
    bucket_id = 'defect-photos'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  );

DROP POLICY IF EXISTS "members rw plans" ON storage.objects;
CREATE POLICY "members rw plans" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'plans'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  )
  WITH CHECK (
    bucket_id = 'plans'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  );

DROP POLICY IF EXISTS "members rw musterdetails" ON storage.objects;
CREATE POLICY "members rw musterdetails" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'musterdetails'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  )
  WITH CHECK (
    bucket_id = 'musterdetails'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  );

COMMIT;
