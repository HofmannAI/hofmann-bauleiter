-- ============================================================
-- 0016_task_actual_dates
-- Adds actual_start_date and actual_end_date to tasks for
-- Soll-Ist tracking (Rückmeldung). Additive, idempotent.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'actual_start_date'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN actual_start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'actual_end_date'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN actual_end_date date;
  END IF;
END $$;

COMMIT;
