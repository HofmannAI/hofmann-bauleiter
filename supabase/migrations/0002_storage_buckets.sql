-- ============================================================
-- 0002_storage_buckets
-- Creates the four buckets used by the app and locks down policies so
-- that only authed members of the owning project can read/write.
-- ============================================================

-- Buckets are private (signed URLs only)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('checklist-photos', 'checklist-photos', false),
  ('defect-photos',    'defect-photos',    false),
  ('plans',            'plans',            false),
  ('musterdetails',    'musterdetails',    false)
ON CONFLICT (id) DO NOTHING;

-- Object policy: path is "<projectId>/..." across all four buckets.
-- The first segment must be a project_id the current user is a member of.
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['checklist-photos','defect-photos','plans','musterdetails']
  LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "members rw %1$s" ON storage.objects;
      CREATE POLICY "members rw %1$s" ON storage.objects
        FOR ALL TO authenticated
        USING (bucket_id = %1$L AND public.is_project_member((split_part(name,'/',1))::uuid))
        WITH CHECK (bucket_id = %1$L AND public.is_project_member((split_part(name,'/',1))::uuid));
    $f$, b);
  END LOOP;
END $$;
