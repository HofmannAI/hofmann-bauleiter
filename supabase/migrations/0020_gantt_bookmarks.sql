-- ============================================================
-- 0020_gantt_bookmarks
-- Row and date bookmarks in the Gantt chart.
-- Additive, idempotent, transactional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.gantt_bookmarks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('row', 'date')),
  task_id     uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  date        date,
  color       text NOT NULL DEFAULT '#E30613',
  label       text,
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gantt_bm_project_idx ON public.gantt_bookmarks(project_id);

ALTER TABLE public.gantt_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gantt_bm read members" ON public.gantt_bookmarks;
CREATE POLICY "gantt_bm read members" ON public.gantt_bookmarks
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "gantt_bm write members" ON public.gantt_bookmarks;
CREATE POLICY "gantt_bm write members" ON public.gantt_bookmarks
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

COMMIT;
