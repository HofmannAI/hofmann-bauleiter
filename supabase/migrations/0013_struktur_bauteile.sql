-- ============================================================
-- 0013_struktur_bauteile
-- Strukturbaum-Verortung: Räume innerhalb von Apartments + zusätzliche
-- Bauteil-Felder am Mangel (room_id, bauteil, bauteilqualitaet).
-- Idempotent + transactional.
-- (0012 reserviert für QR-Freimeldung — siehe OPEN_QUESTIONS OQ-021.)
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  name            text NOT NULL,
  raumnummer      text,
  flaeche_qm      numeric(6,2),
  sort_order      integer DEFAULT 0 NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rooms_apartment_idx ON public.rooms(apartment_id);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms rw members" ON public.rooms;
CREATE POLICY "rooms rw members" ON public.rooms
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.apartments a
    JOIN public.houses h ON h.id = a.house_id
    WHERE a.id = rooms.apartment_id
      AND public.is_project_member(h.project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.apartments a
    JOIN public.houses h ON h.id = a.house_id
    WHERE a.id = rooms.apartment_id
      AND public.is_project_member(h.project_id)
  ));

-- Defects ergänzen: room_id, bauteil, bauteilqualitaet
ALTER TABLE public.defects
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bauteil text,
  ADD COLUMN IF NOT EXISTS bauteilqualitaet text;

CREATE INDEX IF NOT EXISTS defects_room_idx ON public.defects(room_id);

COMMIT;
