-- ============================================================
-- 0023_gantt_views
-- Saved filter presets ("Views"/"Layers") for the Gantt chart.
-- Each view stores gewerk filter, house filter, lookahead,
-- show-critical, show-overdue settings.
-- Additive, idempotent, transactional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.gantt_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  filter_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order  integer DEFAULT 0 NOT NULL,
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gantt_views_project_idx ON public.gantt_views(project_id);

ALTER TABLE public.gantt_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gantt_views read members" ON public.gantt_views;
CREATE POLICY "gantt_views read members" ON public.gantt_views
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "gantt_views write members" ON public.gantt_views;
CREATE POLICY "gantt_views write members" ON public.gantt_views
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

COMMIT;
