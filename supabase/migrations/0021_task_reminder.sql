-- ============================================================
-- 0021_task_reminder
-- Adds reminder_date to tasks for deadline reminders.
-- Additive, idempotent, transactional.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'reminder_date'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN reminder_date date;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tasks_reminder_idx
  ON public.tasks(reminder_date)
  WHERE reminder_date IS NOT NULL;

COMMIT;
