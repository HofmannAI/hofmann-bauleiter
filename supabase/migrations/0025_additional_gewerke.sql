-- 0025: Zusätzliche Gewerke für vollständige Abdeckung aller Bauzeitenplan-Tasks
-- + Gewerk-Checklisten-Templates für die neuen Gewerke

BEGIN;

-- Neue Gewerke (falls nicht vorhanden)
INSERT INTO public.gewerke (name, color, default_per_apartment, sort_order)
VALUES
  ('Abdichtung',     '#2196F3', false, 21),
  ('Putzer',         '#FF9800', true,  22),
  ('Fußbodenheizung','#00BCD4', true,  23),
  ('Reinigung',      '#607D8B', false, 24),
  ('Flaschner',      '#795548', false, 25),
  ('Treppenhaus',    '#9E9E9E', false, 26),
  ('Steigleitungen', '#00897B', false, 27),
  ('Toreinbau',      '#546E7A', false, 28),
  ('Haustüren',      '#8D6E63', false, 29)
ON CONFLICT (name) DO NOTHING;

-- Gewerk-Checklisten-Templates für neue Gewerke
INSERT INTO public.gewerk_checklist_templates (gewerk_id, item, requires_photo, sort_order)
SELECT g.id, t.item, t.requires_photo, t.sort_order
FROM (VALUES
  -- Abdichtung
  ('Abdichtung', 'Fensteranschlüsse dicht (Dichtraupe + Folie)', true, 1),
  ('Abdichtung', 'Balkon-Abdichtung vollflächig, keine Blasen', true, 2),
  ('Abdichtung', 'Abdichtung Sockelfuß durchgängig', true, 3),
  ('Abdichtung', 'Penthouse-Abdichtung Prüfprotokoll vorhanden', false, 4),

  -- Putzer (Innen + Außen)
  ('Putzer', 'Innenputz gleichmäßig, keine Risse', true, 1),
  ('Putzer', 'Putzstärke lt. Spec eingehalten', false, 2),
  ('Putzer', 'Fensterlaibungen sauber verputzt', true, 3),
  ('Putzer', 'Außenputz Armierung vollständig', true, 4),
  ('Putzer', 'Sockelputz wasserabweisend', false, 5),

  -- Estrich (existing gewerk, add templates)
  ('Estrich', 'Estrich eben (2m Richtlatte max. 3mm)', true, 1),
  ('Estrich', 'Trocknungsprotokolle vorhanden', false, 2),
  ('Estrich', 'Randdämmstreifen umlaufend vorhanden', true, 3),
  ('Estrich', 'Höhenkoten an Türdurchgängen geprüft', false, 4),

  -- Trockenbau (existing gewerk, add templates if missing)
  ('Trockenbau', 'Ständerwerk lotrecht und winkelrecht', true, 1),
  ('Trockenbau', 'Beplankung ohne Beschädigungen', true, 2),
  ('Trockenbau', 'Spachtelarbeiten glatt (Q3/Q4)', true, 3),
  ('Trockenbau', 'Revisions-/Inspektionsöffnungen vorhanden', false, 4),
  ('Trockenbau', 'Brandschutzplatten lt. Brandschutznachweis', false, 5),

  -- Flaschner
  ('Flaschner', 'Fallrohre sicher befestigt', true, 1),
  ('Flaschner', 'Blechanschlüsse dicht', true, 2),
  ('Flaschner', 'Rinnenneigung geprüft', false, 3),

  -- Fußbodenheizung
  ('Fußbodenheizung', 'Heizschleifen lt. Verlegeplan', true, 1),
  ('Fußbodenheizung', 'Druckprüfung dokumentiert', false, 2),
  ('Fußbodenheizung', 'Verteiler beschriftet', true, 3),

  -- Reinigung
  ('Reinigung', 'Bauendreinigung abgeschlossen', true, 1),
  ('Reinigung', 'Fenster gereinigt', false, 2),
  ('Reinigung', 'Sanitärobjekte sauber', false, 3)
) AS t(gewerk_name, item, requires_photo, sort_order)
INNER JOIN public.gewerke g ON g.name = t.gewerk_name
ON CONFLICT DO NOTHING;

COMMIT;
