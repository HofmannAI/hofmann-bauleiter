-- ============================================================
-- 0015_defect_task_link
-- Adds task_id FK to defects table — links Mängel to
-- Bauzeitenplan-Termine. Additive, idempotent, transactional.
-- ============================================================

BEGIN;

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'defects'
      AND column_name = 'task_id'
  ) THEN
    ALTER TABLE public.defects
      ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for fast lookups: "all defects for a given task"
CREATE INDEX IF NOT EXISTS defects_task_id_idx ON public.defects(task_id)
  WHERE task_id IS NOT NULL;

COMMIT;
