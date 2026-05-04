-- 0026: Freimeldungs-Tokens für QR-Code-basierte Termin-Bestätigung durch Subunternehmer

BEGIN;

CREATE TABLE IF NOT EXISTS public.freimeldung_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  completed_at timestamptz,
  completed_by_name text,
  completed_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_freimeldung_token ON public.freimeldung_tokens(token);

-- RLS: Read/Write for project members, public read by token
ALTER TABLE public.freimeldung_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "freimeldung select members" ON public.freimeldung_tokens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = freimeldung_tokens.project_id AND user_id = auth.uid())
  );

CREATE POLICY "freimeldung insert members" ON public.freimeldung_tokens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = freimeldung_tokens.project_id AND user_id = auth.uid())
  );

-- Allow anonymous update (for the subcontractor submitting via token)
CREATE POLICY "freimeldung update by token" ON public.freimeldung_tokens
  FOR UPDATE USING (true) WITH CHECK (true);

COMMIT;
