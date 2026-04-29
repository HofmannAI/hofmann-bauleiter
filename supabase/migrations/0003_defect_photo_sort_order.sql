-- ============================================================
-- 0003_defect_photo_sort_order
-- Adds sort_order to defect_photos so photos can be reordered in
-- the multi-photo gallery (Phase C2 / DocMa-feature).
-- New rows default to 0; reorder UI sets explicit indices.
-- Idempotent + transactional.
-- ============================================================

BEGIN;

ALTER TABLE "defect_photos" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;

COMMIT;
