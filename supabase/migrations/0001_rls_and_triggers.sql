-- ============================================================
-- 0001_rls_and_triggers
-- Enables RLS, defines policies, and adds auto-profile-on-signup trigger.
-- See docs/DECISIONS.md D-009 for the policy template.
-- ============================================================

-- Helper: is current user a member of a project?
CREATE OR REPLACE FUNCTION public.is_project_member(pid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = pid AND user_id = auth.uid()
  );
$$;

-- Auto-create profile row on auth.users insert.
-- Bauleiter team is hard-allowlisted by email — others get a profile but no
-- project memberships, so RLS will hide everything.
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

-- ============================================================
-- Enable RLS on every public table
-- ============================================================
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gewerke                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_sections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_progress        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_photos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_apartment_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_photos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gewerk_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gewerk_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musterdetails             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity                  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Profiles: read all (so we can show "Jonas hat …"), write only own row
-- ============================================================
CREATE POLICY "profiles read authed" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- Catalog tables (gewerke, checklists*) — read-only for authed
-- ============================================================
CREATE POLICY "gewerke read" ON public.gewerke FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklists read" ON public.checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_sections read" ON public.checklist_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_items read" ON public.checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "gewerk_checklist_templates read" ON public.gewerk_checklist_templates FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Projects: select via membership; insert by anyone authed (creator becomes owner)
-- ============================================================
CREATE POLICY "projects select members" ON public.projects
  FOR SELECT TO authenticated USING (public.is_project_member(id));
CREATE POLICY "projects insert authed" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "projects update members" ON public.projects
  FOR UPDATE TO authenticated USING (public.is_project_member(id)) WITH CHECK (public.is_project_member(id));
CREATE POLICY "projects delete owner" ON public.projects
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'owner')
  );

-- ============================================================
-- project_members: select if you're a member of the same project
-- insert/delete: only by an owner of the project
-- ============================================================
CREATE POLICY "project_members select" ON public.project_members
  FOR SELECT TO authenticated USING (public.is_project_member(project_id) OR user_id = auth.uid());
CREATE POLICY "project_members insert by self or owner" ON public.project_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'owner')
  );
CREATE POLICY "project_members delete owner" ON public.project_members
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'owner')
  );

-- ============================================================
-- Generic project-scoped RLS macro (apply to all child tables)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'houses','apartments','checklist_progress','checklist_photos',
    'tasks','task_dependencies','task_apartment_progress',
    'plans','contacts','defects','defect_photos','defect_history',
    'gewerk_checklist_progress','musterdetails','activity'
  ]
  LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s rw members" ON public.%1$I
        FOR ALL TO authenticated
        USING (
          CASE
            WHEN to_regclass('public.%1$I') IS NULL THEN false
            ELSE public.is_project_member(
              CASE
                WHEN '%1$s' IN ('apartments') THEN (SELECT project_id FROM houses WHERE houses.id = %1$I.house_id)
                WHEN '%1$s' IN ('checklist_photos') THEN (SELECT project_id FROM checklist_progress cp WHERE cp.id = %1$I.progress_id)
                WHEN '%1$s' IN ('task_dependencies') THEN (SELECT project_id FROM tasks t WHERE t.id = %1$I.predecessor_id)
                WHEN '%1$s' IN ('task_apartment_progress') THEN (SELECT project_id FROM tasks t WHERE t.id = %1$I.task_id)
                WHEN '%1$s' IN ('defect_photos','defect_history') THEN (SELECT project_id FROM defects d WHERE d.id = %1$I.defect_id)
                ELSE %1$I.project_id
              END
            )
          END
        );
    $f$, t);
  END LOOP;
END $$;

-- contacts may be global (project_id IS NULL) — read by anyone authed
CREATE POLICY "contacts read global" ON public.contacts
  FOR SELECT TO authenticated USING (project_id IS NULL);
