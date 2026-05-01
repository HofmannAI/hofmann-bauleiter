-- ============================================================
-- 0014_mangel_templates
-- Wiederkehrende Mangel-Templates für 1-Klick-Erfassung
-- (analog defect_templates aus dem Master-Prompt). 30 globale
-- Standard-Templates seeden. Idempotent + transactional.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.defect_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid,                       -- NULL = global
  name                text NOT NULL,
  beschreibung        text NOT NULL,
  gewerk_id           uuid REFERENCES public.gewerke(id) ON DELETE SET NULL,
  default_bauteil     text,
  default_frist_tage  integer,
  default_priority    integer,                    -- 1=hoch, 2=normal, 3=niedrig
  foto_hinweis        text,
  use_count           integer DEFAULT 0 NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dt_gewerk_idx ON public.defect_templates(gewerk_id);
CREATE INDEX IF NOT EXISTS dt_use_count_idx ON public.defect_templates(use_count DESC);

ALTER TABLE public.defect_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates read all" ON public.defect_templates;
CREATE POLICY "templates read all" ON public.defect_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "templates write authenticated" ON public.defect_templates;
CREATE POLICY "templates write authenticated" ON public.defect_templates
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "templates update authenticated" ON public.defect_templates;
CREATE POLICY "templates update authenticated" ON public.defect_templates
  FOR UPDATE TO authenticated USING (true);

-- ----- Standard-Templates seeden (insert-or-skip via name-Match) -----
DO $$
DECLARE
  g_maler           uuid;
  g_fliesenleger    uuid;
  g_elektro         uuid;
  g_sanitaer        uuid;
  g_trockenbau      uuid;
  g_parkett         uuid;
  g_tueren          uuid;
  g_fenster         uuid;
  g_rohbau          uuid;
  g_aussen          uuid;
BEGIN
  SELECT id INTO g_maler         FROM public.gewerke WHERE name = 'Maler' LIMIT 1;
  SELECT id INTO g_fliesenleger  FROM public.gewerke WHERE name = 'Fliesenleger' LIMIT 1;
  SELECT id INTO g_elektro       FROM public.gewerke WHERE name = 'Elektro' LIMIT 1;
  SELECT id INTO g_sanitaer      FROM public.gewerke WHERE name = 'Sanitär/Heizung' LIMIT 1;
  SELECT id INTO g_trockenbau    FROM public.gewerke WHERE name = 'Trockenbau' LIMIT 1;
  SELECT id INTO g_parkett       FROM public.gewerke WHERE name = 'Parkett' LIMIT 1;
  SELECT id INTO g_tueren        FROM public.gewerke WHERE name = 'Türen' LIMIT 1;
  SELECT id INTO g_fenster       FROM public.gewerke WHERE name = 'Fenster' LIMIT 1;
  SELECT id INTO g_rohbau        FROM public.gewerke WHERE name = 'Rohbau' LIMIT 1;
  SELECT id INTO g_aussen        FROM public.gewerke WHERE name = 'Außenanlagen' LIMIT 1;

  INSERT INTO public.defect_templates (name, beschreibung, gewerk_id, default_bauteil, default_frist_tage, default_priority, foto_hinweis)
  SELECT * FROM (VALUES
    -- Maler
    ('Wandfarbe ungleichmäßig', 'Farbauftrag fleckig oder mit sichtbaren Streifen, Nachbesserung erforderlich.', g_maler, 'Wand', 14, 2, 'Bitte aus 1-2m Entfernung im Streiflicht'),
    ('Lackierung Heizkörper', 'Heizkörper ist unsauber lackiert oder Roststellen sichtbar.', g_maler, 'Heizkörper', 14, 2, NULL),
    ('Spachtelarbeiten unsauber', 'Übergänge bei Wandanschlüssen sichtbar / nicht plan gespachtelt.', g_maler, 'Wand/Decke', 10, 2, NULL),

    -- Fliesenleger
    ('Silikonfuge unsauber', 'Silikonfuge an Anschluss Wand/Boden oder Wanne ist nicht sauber gezogen.', g_fliesenleger, 'Fuge', 7, 3, NULL),
    ('Fliese gerissen', 'Fliese weist Riss/Sprung auf, Austausch erforderlich.', g_fliesenleger, 'Wand/Boden', 14, 2, 'Mit Zollstock oder Münze als Maßstab'),
    ('Fugenbreite unregelmäßig', 'Fugenbreite zwischen den Fliesen weicht sichtbar ab.', g_fliesenleger, 'Wand', 14, 3, NULL),

    -- Elektro
    ('Steckdose schief', 'Steckdose oder Schalter ist nicht plan in der Wand / sitzt schief.', g_elektro, 'Wand', 5, 3, NULL),
    ('Lichtschalter ohne Funktion', 'Lichtschalter schaltet das Licht nicht oder unzuverlässig.', g_elektro, NULL, 3, 1, NULL),
    ('LAN-Dose fehlt', 'Geplante LAN-Dose wurde nicht installiert.', g_elektro, 'Wand', 7, 2, NULL),
    ('Steckdose locker', 'Steckdose sitzt nicht fest in der Wand, Rahmen wackelt.', g_elektro, 'Wand', 7, 2, NULL),

    -- Sanitär
    ('Wasserhahn tropft', 'Armatur ist undicht, Wasser tropft nach Schließen weiter.', g_sanitaer, 'Bad/Küche', 7, 1, NULL),
    ('Abfluss verstopft', 'Wasser läuft nur langsam ab.', g_sanitaer, NULL, 5, 1, NULL),
    ('WC-Spülung undicht', 'Wasser läuft nach Spülung weiter in WC-Schüssel.', g_sanitaer, 'WC', 5, 1, NULL),
    ('Heizkörper wird nicht warm', 'Heizkörper bleibt kalt trotz aufgedrehtem Thermostat.', g_sanitaer, 'Heizkörper', 3, 1, NULL),
    ('Anschluss Wanne undicht', 'Wasseraustritt am Wanneneinlauf oder Überlauf.', g_sanitaer, 'Bad', 3, 1, 'Bitte vor und nach Wasserversuch'),

    -- Trockenbau
    ('Riss in der Wand', 'Sichtbarer Riss an Trockenbauwand, Setzungsriss?', g_trockenbau, 'Wand', 14, 2, NULL),
    ('Stoßfuge nicht verspachtelt', 'Übergang zweier Trockenbauplatten ist nicht verspachtelt.', g_trockenbau, 'Wand', 10, 2, NULL),

    -- Parkett
    ('Parkett knarrt', 'Parkett knarrt beim Begehen an mehreren Stellen.', g_parkett, 'Boden', 14, 2, NULL),
    ('Sockelleiste löst sich', 'Sockelleiste hat sich von der Wand gelöst.', g_parkett, 'Sockel', 7, 2, NULL),

    -- Türen
    ('Tür schleift', 'Tür schleift am Boden oder am Rahmen beim Schließen.', g_tueren, 'Tür', 10, 2, NULL),
    ('Türschloss klemmt', 'Schloss greift nicht zuverlässig, Schließbart muss gerichtet werden.', g_tueren, 'Tür', 7, 2, NULL),
    ('Beschlag locker', 'Türgriff oder Schließblech sitzt nicht fest.', g_tueren, 'Tür', 7, 2, NULL),

    -- Fenster
    ('Fenster zieht', 'Spürbarer Luftzug bei geschlossenem Fenster, Dichtung prüfen.', g_fenster, 'Fenster', 14, 1, NULL),
    ('Fugenanschluss undicht', 'Anschluss Fenster zu Wand zeigt sichtbare Fuge oder Undichtigkeit.', g_fenster, 'Fenster', 14, 1, 'Bitte aussen + innen fotografieren'),
    ('Rolladen klemmt', 'Rolladen lässt sich nicht vollständig hoch- oder runterfahren.', g_fenster, 'Fenster', 7, 2, NULL),

    -- Rohbau
    ('Bodenbelag nicht eben', 'Boden weist Höhenunterschiede > 5mm/m auf.', g_rohbau, 'Boden', 21, 2, 'Mit Wasserwaage messen'),
    ('Wand nicht im Lot', 'Wand fluchtet nicht / weicht sichtbar von der Senkrechten ab.', g_rohbau, 'Wand', 21, 2, 'Mit Lot messen'),

    -- Außen
    ('Pflasterung uneben', 'Pflastersteine sitzen nicht plan, Senkungen sichtbar.', g_aussen, 'Belag', 21, 2, NULL),
    ('Außenanstrich blättert', 'Anstrich an Fassade oder Sockel löst sich.', g_aussen, 'Fassade', 14, 2, NULL),
    ('Regenrinne hängt durch', 'Regenrinne ist nicht mehr im Gefälle / hängt durch.', g_aussen, 'Dach', 21, 2, NULL)
  ) AS v(name, beschreibung, gewerk_id, default_bauteil, default_frist_tage, default_priority, foto_hinweis)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.defect_templates t WHERE t.name = v.name AND t.org_id IS NULL
  );
END $$;

COMMIT;
