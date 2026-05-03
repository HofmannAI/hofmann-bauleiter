-- ============================================================
-- 0019_task_segments
-- Adds segments JSONB column to tasks for segment bars
-- (interruptions/pauses within a task).
-- Format: [{"start":"2026-05-10","end":"2026-05-12"},...]
-- NULL = no segments (continuous bar).
-- Additive, idempotent, transactional.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'segments'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN segments jsonb;
  END IF;
END $$;

COMMIT;
