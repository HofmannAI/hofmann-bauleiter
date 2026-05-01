-- ============================================================
-- 0010_defect_vorgaenge
-- VOB-Workflow: Vorgangs-Historie pro Mangel (AN/AG-Spuren),
-- Brief-Vorlagen für Mängelrüge / Nachfrist / Ersatzvornahme,
-- Firma-Settings für PDF-Briefkopf.
-- Idempotent + transactional.
-- ============================================================

BEGIN;

-- ----- Enums -----
DO $$ BEGIN
  CREATE TYPE defect_party AS ENUM ('AN', 'AG');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE defect_vorgang_status AS ENUM (
    'erfasst',           -- 000 — neu erfasst
    'angezeigt',         -- 020 — Mängelrüge versendet (Frist läuft)
    'nachfrist',         -- 040 — Frist abgelaufen, Nachfrist gesetzt
    'klaerung',          -- 070 — NU-Klärung läuft
    'freigemeldet_NU',   -- 080 — NU meldet behoben
    'abgelehnt_NU',      -- 085 — NU lehnt ab
    'kontrolle_AG',      -- 090 — Bauleiter kontrolliert Behebung
    'erledigt',          -- 100 — final geschlossen
    'ersatzvornahme',    -- 200 — Ersatzvornahme angedroht/durchgeführt
    'notiz'              -- 999 — interner Vermerk
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----- Vorgänge-Tabelle -----
CREATE TABLE IF NOT EXISTS public.defect_vorgaenge (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id       uuid NOT NULL REFERENCES public.defects(id) ON DELETE CASCADE,
  partei          defect_party NOT NULL,
  status          defect_vorgang_status NOT NULL,
  beschreibung    text,
  termin          date,
  termin_antwort  date,
  document_id     text,
  document_url    text,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dv_defect_partei_idx
  ON public.defect_vorgaenge(defect_id, partei, created_at DESC);

ALTER TABLE public.defect_vorgaenge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vorgaenge rw members" ON public.defect_vorgaenge;
CREATE POLICY "vorgaenge rw members" ON public.defect_vorgaenge
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.defects d
    WHERE d.id = defect_vorgaenge.defect_id
      AND public.is_project_member(d.project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.defects d
    WHERE d.id = defect_vorgaenge.defect_id
      AND public.is_project_member(d.project_id)
  ));

-- ----- defects ergänzen -----
ALTER TABLE public.defects
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS rechtsgrundlage text;

-- contact_id existiert bereits seit Phase 1, kein ADD nötig

-- ----- Brief-Vorlagen -----
CREATE TABLE IF NOT EXISTS public.brief_vorlagen (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name            text NOT NULL,
  typ             text NOT NULL,
  rechtsgrundlage text,
  vorlage_text    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brief_vorlagen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brief vorlagen read all" ON public.brief_vorlagen;
CREATE POLICY "brief vorlagen read all" ON public.brief_vorlagen
  FOR SELECT TO authenticated
  USING (project_id IS NULL OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "brief vorlagen write members" ON public.brief_vorlagen;
CREATE POLICY "brief vorlagen write members" ON public.brief_vorlagen
  FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "brief vorlagen update members" ON public.brief_vorlagen;
CREATE POLICY "brief vorlagen update members" ON public.brief_vorlagen
  FOR UPDATE TO authenticated
  USING (project_id IS NULL OR public.is_project_member(project_id));

-- ----- Firma-Settings (Briefkopf) -----
CREATE TABLE IF NOT EXISTS public.firma_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid,
  name                text NOT NULL DEFAULT 'Hofmann Haus GmbH',
  strasse             text NOT NULL DEFAULT 'Musterstraße 1',
  plz_ort             text NOT NULL DEFAULT '74523 Schwäbisch Hall',
  telefon             text,
  email               text,
  web                 text,
  geschaeftsfuehrer   text,
  ust_id              text,
  bank                text,
  iban                text,
  bic                 text,
  logo_path           text,
  unterzeichner1      text,
  unterzeichner2      text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firma read all" ON public.firma_settings;
CREATE POLICY "firma read all" ON public.firma_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "firma write authenticated" ON public.firma_settings;
CREATE POLICY "firma write authenticated" ON public.firma_settings
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "firma update authenticated" ON public.firma_settings;
CREATE POLICY "firma update authenticated" ON public.firma_settings
  FOR UPDATE TO authenticated USING (true);

INSERT INTO public.firma_settings (name, strasse, plz_ort)
  SELECT 'Hofmann Haus GmbH', 'Musterstraße 1', '74523 Schwäbisch Hall'
  WHERE NOT EXISTS (SELECT 1 FROM public.firma_settings WHERE org_id IS NULL);

-- ----- Default-Vorlagen (global, project_id NULL) -----
DO $$
DECLARE
  v_template_text text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.brief_vorlagen WHERE project_id IS NULL AND typ = 'mängelrüge_vorabnahme') THEN
    v_template_text := E'Sehr geehrte Damen und Herren,\n\n'
      || E'an der von Ihnen ausgeführten Leistung am Bauvorhaben '
      || E'„{{projekt}}" haben sich die in der Anlage geschilderten '
      || E'Restleistungen und/oder Mängel gezeigt.\n\n'
      || E'Wir möchten Sie bitten, diese offenen Punkte spätestens bis '
      || E'{{frist}} zu beseitigen und uns durch Unterzeichnung und '
      || E'Rücksendung der in der Anlage beigefügten Bestätigung '
      || E'entsprechend zu informieren.\n\n'
      || E'Sollten Sie der Aufforderung zur Mängelbeseitigung innerhalb '
      || E'der gesetzten Frist nicht nachkommen, behalten wir uns '
      || E'rechtliche Schritte gem. {{rechtsgrundlage}} vor.\n\n'
      || E'Mit freundlichen Grüßen\n{{unterzeichner}}';
    INSERT INTO public.brief_vorlagen (project_id, name, typ, rechtsgrundlage, vorlage_text)
    VALUES (NULL, 'Mängelrüge §4 Abs.7 VOB/B (vor Abnahme)', 'mängelrüge_vorabnahme', '§4 Abs.7 VOB/B', v_template_text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.brief_vorlagen WHERE project_id IS NULL AND typ = 'mängelrüge_nachabnahme') THEN
    v_template_text := E'Sehr geehrte Damen und Herren,\n\n'
      || E'an der von Ihnen ausgeführten und abgenommenen Leistung am '
      || E'Bauvorhaben „{{projekt}}" haben sich die in der Anlage '
      || E'geschilderten Mängel gezeigt.\n\n'
      || E'Wir fordern Sie hiermit gem. §13 Abs.5 Nr.1 VOB/B zur '
      || E'Beseitigung dieser Mängel innerhalb der Gewährleistungsfrist '
      || E'auf. Frist zur Beseitigung: {{frist}}.\n\n'
      || E'Mit freundlichen Grüßen\n{{unterzeichner}}';
    INSERT INTO public.brief_vorlagen (project_id, name, typ, rechtsgrundlage, vorlage_text)
    VALUES (NULL, 'Mängelrüge §13 Abs.5 Nr.1 VOB/B (nach Abnahme)', 'mängelrüge_nachabnahme', '§13 Abs.5 Nr.1 VOB/B', v_template_text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.brief_vorlagen WHERE project_id IS NULL AND typ = 'nachfrist') THEN
    v_template_text := E'Sehr geehrte Damen und Herren,\n\n'
      || E'mit unserem Schreiben vom {{datum_anzeige}} hatten wir Sie '
      || E'aufgefordert, die in der Anlage genannten Mängel bis zum '
      || E'{{frist_alt}} zu beseitigen. Eine Mängelbeseitigung ist '
      || E'innerhalb der gesetzten Frist nicht erfolgt.\n\n'
      || E'Hiermit setzen wir Ihnen gem. {{rechtsgrundlage}} eine '
      || E'angemessene Nachfrist bis zum {{frist}}.\n\n'
      || E'Sollten Sie auch innerhalb dieser Nachfrist die Mängel nicht '
      || E'beseitigen, drohen wir Ihnen hiermit die Ersatzvornahme auf '
      || E'Ihre Kosten an.\n\n'
      || E'Mit freundlichen Grüßen\n{{unterzeichner}}';
    INSERT INTO public.brief_vorlagen (project_id, name, typ, rechtsgrundlage, vorlage_text)
    VALUES (NULL, 'Nachfrist mit Ersatzvornahme-Androhung', 'nachfrist', '§4 Abs.7 VOB/B', v_template_text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.brief_vorlagen WHERE project_id IS NULL AND typ = 'freimeldung_bestaetigung') THEN
    v_template_text := E'Sehr geehrte Damen und Herren,\n\n'
      || E'mit Ihrer Rückmeldung vom {{datum_freimeldung}} haben Sie '
      || E'uns mitgeteilt, dass die in der Anlage genannten Mängel '
      || E'beseitigt sind.\n\n'
      || E'Hiermit bestätigen wir die Kontrolle vor Ort und das '
      || E'Erledigt-Setzen dieser Mängel im Mängelmanagement-System.\n\n'
      || E'Mit freundlichen Grüßen\n{{unterzeichner}}';
    INSERT INTO public.brief_vorlagen (project_id, name, typ, rechtsgrundlage, vorlage_text)
    VALUES (NULL, 'Freimeldungs-Bestätigung', 'freimeldung_bestaetigung', NULL, v_template_text);
  END IF;
END $$;

COMMIT;
