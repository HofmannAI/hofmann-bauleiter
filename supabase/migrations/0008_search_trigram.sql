-- ============================================================
-- 0008_search_trigram
-- Trigram-based fuzzy search across Mängel, Kontakte, Termine.
-- Fast LIKE '%term%' via pg_trgm + GIN indexes — language-agnostic
-- (kein Stemming nötig, deutsche Umlaute und Bauteilnamen
-- bleiben so wie sie sind).
--
-- Cmd+K Power-Up nutzt diese Indexe für globale Suche pro Projekt.
-- Idempotent + transactional.
-- ============================================================

BEGIN;

-- pg_trgm-Extension aktivieren (falls noch nicht).
-- Supabase free tier hat sie verfügbar; idempotent durch IF NOT EXISTS.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Defects: searchable über short_id, title, description
CREATE INDEX IF NOT EXISTS defects_title_trgm
  ON public.defects USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS defects_description_trgm
  ON public.defects USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS defects_short_id_trgm
  ON public.defects USING gin (short_id gin_trgm_ops);

-- Contacts: searchable über company, contact_name, email
CREATE INDEX IF NOT EXISTS contacts_company_trgm
  ON public.contacts USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_contact_name_trgm
  ON public.contacts USING gin (contact_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_email_trgm
  ON public.contacts USING gin (email gin_trgm_ops);

-- Tasks: searchable über name, num, notes
CREATE INDEX IF NOT EXISTS tasks_name_trgm
  ON public.tasks USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tasks_num_trgm
  ON public.tasks USING gin (num gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tasks_notes_trgm
  ON public.tasks USING gin (notes gin_trgm_ops);

-- RLS bleibt unverändert: Indexe respektieren immer die bestehenden
-- Project-Scoped-Policies, da Queries mit project_id-Filter laufen.

COMMIT;
