-- ============================================================
-- 0011_defect_layouts
-- Vorgefertigte Filter-Layouts für die Mängel-Liste (analog
-- docma's "Startlayouts" A000/A100/F010/...). Pro Layout: name,
-- filter_json, sort_json, group_by. Globale + Projekt-spezifische.
-- Idempotent + transactional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.defect_layouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  code            text NOT NULL,                    -- "A000", "F040" etc.
  name            text NOT NULL,
  beschreibung    text,
  filter_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_json       jsonb,
  group_by        text,
  is_global       boolean DEFAULT false NOT NULL,
  sort_order      integer DEFAULT 0 NOT NULL,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dl_project_idx ON public.defect_layouts(project_id);

ALTER TABLE public.defect_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "layouts read all" ON public.defect_layouts;
CREATE POLICY "layouts read all" ON public.defect_layouts
  FOR SELECT TO authenticated
  USING (project_id IS NULL OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "layouts write members" ON public.defect_layouts;
CREATE POLICY "layouts write members" ON public.defect_layouts
  FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "layouts update members" ON public.defect_layouts;
CREATE POLICY "layouts update members" ON public.defect_layouts
  FOR UPDATE TO authenticated
  USING (project_id IS NULL OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "layouts delete members" ON public.defect_layouts;
CREATE POLICY "layouts delete members" ON public.defect_layouts
  FOR DELETE TO authenticated
  USING (project_id IS NOT NULL AND public.is_project_member(project_id));

-- ----- Default-Globale-Layouts (orientiert an docma's Startlayouts) -----
INSERT INTO public.defect_layouts (project_id, code, name, beschreibung, filter_json, group_by, is_global, sort_order)
SELECT * FROM (VALUES
  (NULL::uuid, 'A000', 'Offene Mängel', 'Alle nicht-erledigten Mängel',
    '{"statusNotIn":["resolved","accepted","rejected"]}'::jsonb, 'gewerk', true, 10),
  (NULL::uuid, 'A100', 'Abgeschlossene Mängel', 'Alle erledigten/akzeptierten/abgelehnten',
    '{"statusIn":["resolved","accepted","rejected"]}'::jsonb, 'gewerk', true, 20),
  (NULL::uuid, 'F010', 'Neu erfasst', 'Status erfasst, noch nicht angezeigt',
    '{"anStatusIn":["erfasst"]}'::jsonb, 'gewerk', true, 30),
  (NULL::uuid, 'F020', 'Erfassung unvollständig', 'Mängel ohne Gewerk oder Beschreibung',
    '{"missingFields":["gewerkId","description"]}'::jsonb, NULL, true, 40),
  (NULL::uuid, 'F035', 'Angezeigt — innerhalb Frist', 'AN-Status angezeigt, Frist nicht überfällig',
    '{"anStatusIn":["angezeigt"],"dueDateOnOrAfter":"today"}'::jsonb, 'gewerk', true, 50),
  (NULL::uuid, 'F040', '1. Frist abgelaufen', 'AN-Status angezeigt, Frist überfällig',
    '{"anStatusIn":["angezeigt"],"dueDateBefore":"today"}'::jsonb, 'gewerk', true, 60),
  (NULL::uuid, 'F060', 'Nachfrist abgelaufen', 'AN-Status nachfrist, Frist überfällig',
    '{"anStatusIn":["nachfrist"],"dueDateBefore":"today"}'::jsonb, 'gewerk', true, 70),
  (NULL::uuid, 'F070', 'Klärung läuft', 'NU hat Klärungsbedarf gemeldet',
    '{"anStatusIn":["klaerung"]}'::jsonb, 'gewerk', true, 80),
  (NULL::uuid, 'F080', 'Freigemeldet (NU)', 'NU meldet Mangel als behoben',
    '{"anStatusIn":["freigemeldet_NU"]}'::jsonb, 'gewerk', true, 90),
  (NULL::uuid, 'F100', 'Beseitigte Mängel', 'AG-Status erledigt',
    '{"agStatusIn":["erledigt"]}'::jsonb, 'gewerk', true, 100)
) AS v(project_id, code, name, beschreibung, filter_json, group_by, is_global, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.defect_layouts WHERE project_id IS NULL AND defect_layouts.code = v.code
);

COMMIT;
