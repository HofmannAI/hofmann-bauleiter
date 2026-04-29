-- ============================================================
-- 0004_textbausteine
-- Standard-defect-text-snippets per gewerk (Phase C3 / DocMa-feature).
-- Read-only for authed users; admin can insert/update via seed scripts
-- or future settings UI. RLS-policy mirrors catalog tables.
-- Idempotent + transactional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "textbausteine" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gewerk_id" uuid,
  "label" text NOT NULL,
  "body" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "textbausteine"
    ADD CONSTRAINT "textbausteine_gewerk_id_gewerke_id_fk"
    FOREIGN KEY ("gewerk_id") REFERENCES "public"."gewerke"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.textbausteine ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "textbausteine read" ON public.textbausteine;
CREATE POLICY "textbausteine read" ON public.textbausteine
  FOR SELECT TO authenticated USING (true);

COMMIT;
