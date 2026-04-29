-- ============================================================
-- 0001_rls_and_triggers
-- Defines: is_project_member() helper, handle_new_user trigger,
-- enables RLS, and creates explicit policies per table.
--
-- Idempotent: drops policies/triggers via IF EXISTS before re-creating,
-- so it's safe to re-run (e.g. after a partial failed apply).
-- Wrapped in a transaction — on any failure, nothing is half-applied.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Helper function: is current user a member of a project?
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_project_member(pid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = pid AND user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- Auto-create profile on auth.users insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_name text;
  v_initials text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_initials := upper(substring(v_name from 1 for 1) ||
                COALESCE(substring(split_part(v_name, ' ', 2) from 1 for 1), ''));
  INSERT INTO public.profiles (id, email, name, initials, role, active)
  VALUES (NEW.id, lower(NEW.email), v_name, v_initials, 'bauleiter', true)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- Enable RLS on every table (idempotent: ENABLE on already-enabled is a no-op)
-- ------------------------------------------------------------
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gewerke                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_sections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_photos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_apartment_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_photos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_history             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gewerk_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gewerk_checklist_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musterdetails              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity                   ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Drop existing policies first (idempotent re-run protection)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles read authed"                ON public.profiles;
DROP POLICY IF EXISTS "profiles update own"                 ON public.profiles;

DROP POLICY IF EXISTS "gewerke read"                        ON public.gewerke;
DROP POLICY IF EXISTS "checklists read"                     ON public.checklists;
DROP POLICY IF EXISTS "checklist_sections read"             ON public.checklist_sections;
DROP POLICY IF EXISTS "checklist_items read"                ON public.checklist_items;
DROP POLICY IF EXISTS "gewerk_checklist_templates read"     ON public.gewerk_checklist_templates;

DROP POLICY IF EXISTS "projects select members"             ON public.projects;
DROP POLICY IF EXISTS "projects insert authed"              ON public.projects;
DROP POLICY IF EXISTS "projects update members"             ON public.projects;
DROP POLICY IF EXISTS "projects delete owner"               ON public.projects;

DROP POLICY IF EXISTS "project_members select"              ON public.project_members;
DROP POLICY IF EXISTS "project_members insert by self or owner" ON public.project_members;
DROP POLICY IF EXISTS "project_members delete owner"        ON public.project_members;

DROP POLICY IF EXISTS "houses rw members"                   ON public.houses;
DROP POLICY IF EXISTS "apartments rw members"               ON public.apartments;
DROP POLICY IF EXISTS "checklist_progress rw members"       ON public.checklist_progress;
DROP POLICY IF EXISTS "checklist_photos rw members"         ON public.checklist_photos;
DROP POLICY IF EXISTS "tasks rw members"                    ON public.tasks;
DROP POLICY IF EXISTS "task_dependencies rw members"        ON public.task_dependencies;
DROP POLICY IF EXISTS "task_apartment_progress rw members"  ON public.task_apartment_progress;
DROP POLICY IF EXISTS "plans rw members"                    ON public.plans;
DROP POLICY IF EXISTS "contacts rw members"                 ON public.contacts;
DROP POLICY IF EXISTS "contacts read global"                ON public.contacts;
DROP POLICY IF EXISTS "defects rw members"                  ON public.defects;
DROP POLICY IF EXISTS "defect_photos rw members"            ON public.defect_photos;
DROP POLICY IF EXISTS "defect_history rw members"           ON public.defect_history;
DROP POLICY IF EXISTS "gewerk_checklist_progress rw members" ON public.gewerk_checklist_progress;
DROP POLICY IF EXISTS "musterdetails rw members"            ON public.musterdetails;
DROP POLICY IF EXISTS "activity rw members"                 ON public.activity;

-- ------------------------------------------------------------
-- Profiles: read all (so we can show "Jonas hat …"), write own row only
-- ------------------------------------------------------------
CREATE POLICY "profiles read authed" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- Catalog tables (read-only for authed)
-- ------------------------------------------------------------
CREATE POLICY "gewerke read"                    ON public.gewerke                    FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklists read"                 ON public.checklists                 FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_sections read"         ON public.checklist_sections         FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_items read"            ON public.checklist_items            FOR SELECT TO authenticated USING (true);
CREATE POLICY "gewerk_checklist_templates read" ON public.gewerk_checklist_templates FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------
-- Projects
-- ------------------------------------------------------------
CREATE POLICY "projects select members" ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_project_member(id));

CREATE POLICY "projects insert authed" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "projects update members" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_project_member(id))
  WITH CHECK (public.is_project_member(id));

CREATE POLICY "projects delete owner" ON public.projects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ------------------------------------------------------------
-- project_members
-- ------------------------------------------------------------
CREATE POLICY "project_members select" ON public.project_members
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id) OR user_id = auth.uid());

CREATE POLICY "project_members insert by self or owner" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    )
  );

CREATE POLICY "project_members delete owner" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    )
  );

-- ------------------------------------------------------------
-- Tables with a direct project_id column
-- ------------------------------------------------------------
CREATE POLICY "houses rw members" ON public.houses
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "checklist_progress rw members" ON public.checklist_progress
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "tasks rw members" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "plans rw members" ON public.plans
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "defects rw members" ON public.defects
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "musterdetails rw members" ON public.musterdetails
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "activity rw members" ON public.activity
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "gewerk_checklist_progress rw members" ON public.gewerk_checklist_progress
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

-- ------------------------------------------------------------
-- apartments → project via houses.project_id
-- ------------------------------------------------------------
CREATE POLICY "apartments rw members" ON public.apartments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.houses h
      WHERE h.id = apartments.house_id
        AND public.is_project_member(h.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.houses h
      WHERE h.id = apartments.house_id
        AND public.is_project_member(h.project_id)
    )
  );

-- ------------------------------------------------------------
-- checklist_photos → project via checklist_progress.project_id
-- ------------------------------------------------------------
CREATE POLICY "checklist_photos rw members" ON public.checklist_photos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_progress cp
      WHERE cp.id = checklist_photos.progress_id
        AND public.is_project_member(cp.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_progress cp
      WHERE cp.id = checklist_photos.progress_id
        AND public.is_project_member(cp.project_id)
    )
  );

-- ------------------------------------------------------------
-- task_dependencies → project via tasks.project_id (predecessor)
-- ------------------------------------------------------------
CREATE POLICY "task_dependencies rw members" ON public.task_dependencies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_dependencies.predecessor_id
        AND public.is_project_member(t.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_dependencies.predecessor_id
        AND public.is_project_member(t.project_id)
    )
  );

-- ------------------------------------------------------------
-- task_apartment_progress → project via tasks.project_id
-- ------------------------------------------------------------
CREATE POLICY "task_apartment_progress rw members" ON public.task_apartment_progress
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_apartment_progress.task_id
        AND public.is_project_member(t.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_apartment_progress.task_id
        AND public.is_project_member(t.project_id)
    )
  );

-- ------------------------------------------------------------
-- defect_photos → project via defects.project_id
-- ------------------------------------------------------------
CREATE POLICY "defect_photos rw members" ON public.defect_photos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.defects d
      WHERE d.id = defect_photos.defect_id
        AND public.is_project_member(d.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.defects d
      WHERE d.id = defect_photos.defect_id
        AND public.is_project_member(d.project_id)
    )
  );

-- ------------------------------------------------------------
-- defect_history → project via defects.project_id
-- ------------------------------------------------------------
CREATE POLICY "defect_history rw members" ON public.defect_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.defects d
      WHERE d.id = defect_history.defect_id
        AND public.is_project_member(d.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.defects d
      WHERE d.id = defect_history.defect_id
        AND public.is_project_member(d.project_id)
    )
  );

-- ------------------------------------------------------------
-- contacts: project-scoped OR global (project_id IS NULL).
-- READ: both project-members AND global (everyone authed).
-- WRITE: only project-scoped rows; global contacts come from seed scripts
--        (which use service-role and therefore bypass RLS).
-- ------------------------------------------------------------
CREATE POLICY "contacts rw members" ON public.contacts
  FOR ALL TO authenticated
  USING (project_id IS NULL OR public.is_project_member(project_id))
  WITH CHECK (project_id IS NOT NULL AND public.is_project_member(project_id));

COMMIT;
