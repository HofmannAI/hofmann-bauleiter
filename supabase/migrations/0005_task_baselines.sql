-- ============================================================
-- 0005_task_baselines
-- Snapshot mechanism: friere alle aktuellen tasks.start/end als
-- Baseline ein. Im Gantt rendert "Baseline anzeigen"-Toggle
-- pro Task ZWEI Bars (Ist vs. Soll).
--
-- Mehrere Baselines pro Projekt unterstützt — UI bietet Picker.
--
-- Idempotent + transaktional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.task_baselines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  task_id         uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  planned_start   date NOT NULL,
  planned_end     date NOT NULL,
  snapshot_label  text NOT NULL,
  snapshot_at     timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS task_baselines_project_idx ON public.task_baselines(project_id, snapshot_label);
CREATE INDEX IF NOT EXISTS task_baselines_task_idx ON public.task_baselines(task_id);

ALTER TABLE public.task_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_baselines rw members" ON public.task_baselines;
CREATE POLICY "task_baselines rw members" ON public.task_baselines
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

COMMIT;
