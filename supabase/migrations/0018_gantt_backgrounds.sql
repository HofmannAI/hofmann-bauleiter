-- ============================================================
-- 0018_gantt_backgrounds
-- Colored background regions in the Gantt chart for marking
-- construction phases (Erdarbeiten, Rohbau, Ausbau, etc.).
-- Additive, idempotent, transactional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.gantt_backgrounds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label       text NOT NULL,
  color       text NOT NULL DEFAULT '#E3F2FD',
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  sort_order  integer DEFAULT 0 NOT NULL,
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gantt_bg_project_idx ON public.gantt_backgrounds(project_id);

ALTER TABLE public.gantt_backgrounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gantt_bg read members" ON public.gantt_backgrounds;
CREATE POLICY "gantt_bg read members" ON public.gantt_backgrounds
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "gantt_bg write members" ON public.gantt_backgrounds;
CREATE POLICY "gantt_bg write members" ON public.gantt_backgrounds
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

COMMIT;
