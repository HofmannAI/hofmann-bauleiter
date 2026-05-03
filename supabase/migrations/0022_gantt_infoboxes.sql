-- ============================================================
-- 0022_gantt_infoboxes
-- Free-floating text boxes in the Gantt timeline.
-- Optionally linked to a task (moves with it) or free.
-- Additive, idempotent, transactional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.gantt_infoboxes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id     uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  title       text,
  body        text NOT NULL,
  color       text NOT NULL DEFAULT '#FFF9C4',
  date        date NOT NULL,
  row_index   integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gantt_ib_project_idx ON public.gantt_infoboxes(project_id);

ALTER TABLE public.gantt_infoboxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gantt_ib read members" ON public.gantt_infoboxes;
CREATE POLICY "gantt_ib read members" ON public.gantt_infoboxes
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "gantt_ib write members" ON public.gantt_infoboxes;
CREATE POLICY "gantt_ib write members" ON public.gantt_infoboxes
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

COMMIT;
