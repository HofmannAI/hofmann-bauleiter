-- 0024: Erweiterte Mangel-Felder
-- cost: Geschätzte Kosten (numerisch, 2 Dezimalstellen)
-- external_id: Externe Mangelnummer (Doppelnummerierung)
-- latitude/longitude: GPS-Standort bei Erfassung

BEGIN;

ALTER TABLE public.defects
  ADD COLUMN IF NOT EXISTS cost numeric,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

COMMENT ON COLUMN public.defects.cost IS 'Geschätzte Kosten in EUR';
COMMENT ON COLUMN public.defects.external_id IS 'Externe Mangelnummer (Doppelnummerierung)';
COMMENT ON COLUMN public.defects.latitude IS 'GPS Breitengrad bei Erfassung';
COMMENT ON COLUMN public.defects.longitude IS 'GPS Längengrad bei Erfassung';

COMMIT;
