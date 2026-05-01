-- ============================================================
-- 0009_task_progress_pct
-- Task-level Fortschritts-Tracking in Prozent (0-100). Ergänzt
-- die existierende per-Wohnung-Progress-Logik um eine Bauleiter-
-- gepflegte Gesamteinschätzung pro Termin.
--
-- Sichtbar als ausgefüllter unterer Streifen in der Gantt-Bar
-- und als Slider im Task-Editor.
--
-- Idempotent + transactional.
-- ============================================================

BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS progress_pct integer DEFAULT 0 NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_progress_pct_range
    CHECK (progress_pct >= 0 AND progress_pct <= 100);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

COMMIT;
