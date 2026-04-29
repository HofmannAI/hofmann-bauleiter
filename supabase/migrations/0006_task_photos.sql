-- ============================================================
-- 0006_task_photos
-- Fotos und Notizen am Bauzeit-Termin (Phase 2E).
--
-- - tasks.notes existiert bereits (in 0000)
-- - task_photos: analog zu defect_photos, mit sort_order
-- - Storage-Bucket task-photos wird ebenfalls angelegt + RLS-Policy
--
-- Idempotent + transaktional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.task_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  task_id       uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  caption       text,
  sort_order    integer NOT NULL DEFAULT 0,
  uploaded_by   uuid REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_photos_task_idx ON public.task_photos(task_id);

ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Zugriff via Eltern-Task (project_id) — analog zu defect_photos
DROP POLICY IF EXISTS "task_photos rw members" ON public.task_photos;
CREATE POLICY "task_photos rw members" ON public.task_photos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_photos.task_id
        AND public.is_project_member(t.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_photos.task_id
        AND public.is_project_member(t.project_id)
    )
  );

-- Storage-Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "members rw task-photos" ON storage.objects;
CREATE POLICY "members rw task-photos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  )
  WITH CHECK (
    bucket_id = 'task-photos'
    AND public.is_project_member((split_part(name, '/', 1))::uuid)
  );

COMMIT;
