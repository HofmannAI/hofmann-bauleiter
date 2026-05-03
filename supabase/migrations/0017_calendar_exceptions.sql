-- ============================================================
-- 0017_calendar_exceptions
-- Project-level calendar exceptions (Betriebsferien, Sperrungen,
-- Samstag als Arbeitstag). Additive, idempotent, transactional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.calendar_exceptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date        date NOT NULL,
  type        text NOT NULL CHECK (type IN ('holiday', 'workday')),
  label       text,
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cal_exc_project_date_idx
  ON public.calendar_exceptions(project_id, date);

CREATE INDEX IF NOT EXISTS cal_exc_project_idx
  ON public.calendar_exceptions(project_id);

ALTER TABLE public.calendar_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cal_exc read members" ON public.calendar_exceptions;
CREATE POLICY "cal_exc read members" ON public.calendar_exceptions
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "cal_exc write members" ON public.calendar_exceptions;
CREATE POLICY "cal_exc write members" ON public.calendar_exceptions
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

COMMIT;
