# HOFMANN HAUS · BAULEITER-COCKPIT — MASTER BUILD SPEC

You are building a multi-user construction site management platform for **Hofmann Haus GmbH** (Schwäbisch Hall, Germany). This document is the complete specification. You will work **autonomously** across multiple sessions over up to 3 days. **No human will answer questions** during the build — make pragmatic decisions, document them, continue.

The existing HTML prototype (attached or in `reference/prototype.html`) is the **UX source of truth**. Match its visual language, design tokens, and interaction patterns. Do not redesign — re-implement on a real stack.

---

## 0. OPERATING RULES — READ FIRST EVERY SESSION

### Autonomy
- **Never block on a question.** When uncertain, pick the most pragmatic option, write the reasoning to `docs/DECISIONS.md`, and continue. Save real questions for `docs/OPEN_QUESTIONS.md` — the user will read this when work is done.
- If a tool/library fails or has a bug, try one alternative. If still broken after 30 min, document in `docs/OPEN_QUESTIONS.md` and route around it.
- Don't refactor what's not broken. Don't gold-plate.
- Don't ask which tech to use — every decision is in §2. Don't deviate.

### Resumability (CRITICAL)
You will likely be paused and resumed multiple times. To survive this:
- **Every session, first action**: read `docs/PROGRESS.md`. It tells you exactly where to continue.
- **Every session, last action**: update `docs/PROGRESS.md` with: current phase, what's done, what's the next concrete step, any context the next session needs.
- Commit often. **Conventional commits** (`feat(gantt): add critical path`, `fix(auth): magic link redirect`). Reference the spec section: `feat(phase2/§5.3): drag-to-move with preview`.
- Push to `main` after every working sub-feature. CI will catch broken pushes.
- Never leave the working tree dirty across sessions.

### Quality bar
- TypeScript strict mode. No `any` unless interfacing with untyped lib.
- Every server route has input validation (Zod).
- Every database query is parameterized (Drizzle handles this — don't write raw SQL with concatenation).
- Auth check on every server route except public landing.
- Every form has loading + error + success states.
- Every list view has empty + error + loading states.
- Mobile-first responsive (this is a Baustelle app — phones will be the primary device).

### Testing
- Unit: Vitest. One test file per module with non-trivial logic (Gantt engine, defect PDF generator).
- E2E: Playwright. Smoke test per phase covering happy path.
- Don't aim for 100% coverage. Aim for "would I bet money this works tomorrow morning."

### Communication with the user
- Update `docs/PROGRESS.md` after every milestone with markdown-formatted progress.
- Keep `docs/CHANGELOG.md` for human-readable feature additions.
- If you genuinely cannot proceed without a decision (rare): document in `docs/OPEN_QUESTIONS.md` and **continue with another phase** or **continue with your best guess**, noting the assumption clearly.

---

## 1. STACK (LOCKED — DO NOT DEVIATE)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **SvelteKit 2** (TypeScript) | Existing prototype is vanilla JS — Svelte's progressive enhancement matches. Smaller bundle than Next. |
| UI styling | **Tailwind CSS 3** + design tokens from prototype | Prototype's CSS vars (`--red`, `--ink`, etc.) are ported as Tailwind theme |
| State (client) | Svelte 5 runes (`$state`, `$derived`) + URL-driven for navigation | No Redux/Pinia |
| DB | **Supabase Postgres** (Frankfurt) | DSGVO, managed, free tier covers dev |
| ORM | **Drizzle ORM** | Type-safe, lightweight, easy migrations |
| Auth | **Supabase Auth** (magic-link email) | Bauleiter team only — no handwerker logins |
| Storage | **Supabase Storage** | Plans, photos, defect images |
| Realtime | **Supabase Realtime** | Multi-bauleiter sync |
| Email | **mailto:** for defect notifications (user's Outlook handles attachment) | No SMTP/Graph in v1 |
| PDF generation | **pdf-lib** (defect reports) + **PDF.js** (plan rendering) | Browser-friendly, no Puppeteer |
| Forms / Validation | Native HTML + Zod | No react-hook-form etc. |
| Tests | Vitest + Playwright | |
| Deploy | **Vercel** (auto from `main`) | Free tier, Frankfurt edge |
| CI | GitHub Actions: typecheck + test + build on PR | |
| Package manager | **pnpm** | Faster, cleaner |
| Node version | 20 LTS | Pin in `.nvmrc` |

### Project structure

```
/
├── src/
│   ├── lib/
│   │   ├── db/              # Drizzle schema, client, queries
│   │   ├── auth/            # Supabase auth helpers
│   │   ├── storage/         # File upload helpers
│   │   ├── gantt/           # Constraint propagation engine
│   │   ├── pdf/             # Defect PDF generator
│   │   ├── components/      # Shared UI (Button, Sheet, etc.)
│   │   └── stores/          # Global state (current project, user)
│   ├── routes/
│   │   ├── (public)/        # Landing, login
│   │   ├── (app)/           # Authed app, layout with topbar+tabbar
│   │   │   ├── projects/    # Project picker + CRUD
│   │   │   ├── [projectId]/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── checklisten/
│   │   │   │   ├── bauzeitenplan/
│   │   │   │   ├── aufgaben/    # Open tasks tab (NEW)
│   │   │   │   ├── maengel/     # Defects (NEW)
│   │   │   │   └── aktivitaet/
│   │   └── api/             # Custom endpoints if needed
│   └── app.html
├── supabase/
│   ├── migrations/          # Drizzle-generated SQL migrations
│   └── seed.sql             # Bauleiter team, gewerke catalog, dummy contacts
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── DECISIONS.md         # Every non-obvious choice you make
│   ├── OPEN_QUESTIONS.md    # Things only the user can answer
│   ├── PROGRESS.md          # Resume-from-here log
│   └── CHANGELOG.md         # Human-readable
├── reference/
│   └── prototype.html       # The existing single-file app — UX bible
├── .env.example
├── .nvmrc
├── package.json
└── README.md                # Onboarding for the team (German)
```

---

## 2. DATA MODEL

Use Drizzle. Generate migrations. **All tables have `id uuid default gen_random_uuid()`, `created_at timestamptz`, `updated_at timestamptz` unless noted.** All `*_by` columns reference `auth.users(id)`.

### Identity & teams

```sql
profiles (
  id uuid PK references auth.users(id),
  email text unique not null,
  name text not null,
  initials text generated,        -- e.g. "LH" for Laurenz Hofmann
  role text check (role in ('admin','bauleiter')) default 'bauleiter',
  active boolean default true
)

projects (
  id uuid PK,
  name text not null,             -- "Gaisbach 13"
  an text default 'Hofmann Haus', -- ausführendes Unternehmen
  archived boolean default false,
  created_by uuid → profiles
)

project_members (
  project_id uuid → projects on delete cascade,
  user_id uuid → profiles,
  role text check (role in ('owner','bauleiter','viewer')) default 'bauleiter',
  primary key (project_id, user_id)
)
```

### Buildings

```sql
houses (
  id uuid PK,
  project_id uuid → projects on delete cascade,
  name text not null,             -- "Haus A"
  sort_order int
)

apartments (
  id uuid PK,
  house_id uuid → houses on delete cascade,
  name text not null,             -- "Wohnung 1"
  sort_order int,
  size_qm numeric,                -- optional
  notes text
)
```

### Gewerke catalog (seed data)

```sql
gewerke (
  id uuid PK,
  name text unique not null,      -- "Maler", "Tiefbau", "Elektro", ...
  color text not null,            -- hex from TASK_COLORS
  default_per_apartment boolean,  -- Maler=true, Tiefbau=false
  sort_order int
)
```

Seed approximately these (Claude: expand the list to ~20 typical Hofmann Haus gewerke):
Tiefbau, Rohbau, Flachdach, Dämmung, Gerüstbau, Fenster, Maler, Elektro, Sanitär/Heizung, Trockenbau, Fliesenleger, Estrich, Parkett, Türen, Schreiner, Schlosser, Außenanlagen, Pflasterarbeiten, Gärtner, Aufzug.

### Checklists (catalog — already exists in prototype)

```sql
checklists (id, num int, title text, scope text check (scope in ('project','house','apartment')))
checklist_sections (id, checklist_id, title text, sort_order int)
checklist_items (id, section_id, text text, sort_order int)
```

Seed from prototype's `CHECKLISTS` array. Read `reference/prototype.html`, extract the `CHECKLISTS` JS array, port to seed SQL.

```sql
checklist_progress (
  id uuid PK,
  project_id uuid → projects,
  item_id uuid → checklist_items,
  scope_key text not null,        -- 'project', 'h:1', 'h:1:a:3' etc.
  done boolean default false,
  done_date date,
  done_by uuid → profiles,
  notes text
)
unique(project_id, item_id, scope_key)

checklist_photos (
  id uuid PK,
  progress_id uuid → checklist_progress on delete cascade,
  storage_path text not null,     -- supabase storage key
  width int, height int,
  uploaded_by uuid → profiles
)
```

### Bauzeitenplan

```sql
tasks (
  id uuid PK,
  project_id uuid → projects on delete cascade,
  num text,                       -- "7.1.5"
  name text not null,
  gewerk_id uuid → gewerke,       -- nullable for parent/grouping rows
  parent_id uuid → tasks,
  start_date date not null,
  end_date date not null,
  duration_at int,                -- working days (Arbeitstage)
  color text,                     -- override gewerk color
  depth int default 0,
  per_apartment boolean default false,  -- inherits from gewerke.default_per_apartment
  sort_order int,
  notes text
)

task_dependencies (
  id uuid PK,
  predecessor_id uuid → tasks on delete cascade,
  successor_id uuid → tasks on delete cascade,
  type text check (type in ('FS','SS','FF','SF')) default 'FS',
  lag_days int default 0,         -- positive = wait; negative = lead
  unique(predecessor_id, successor_id)
)

task_apartment_progress (
  id uuid PK,
  task_id uuid → tasks on delete cascade,
  apartment_id uuid → apartments on delete cascade,
  planned_start date,             -- override task.start_date for this apt
  planned_end date,               -- override task.end_date for this apt
  done boolean default false,
  done_date date,
  done_by uuid → profiles,
  notes text,
  unique(task_id, apartment_id)
)
```

### Mängel-Modul

```sql
plans (
  id uuid PK,
  project_id uuid → projects on delete cascade,
  name text not null,             -- "Grundriss EG Haus A"
  version int default 1,
  storage_path text not null,     -- PDF in supabase storage
  page_count int,
  uploaded_by uuid → profiles,
  superseded_by uuid → plans      -- if user uploads new version
)

contacts (
  id uuid PK,
  project_id uuid → projects on delete cascade,  -- NULL = global contact
  gewerk_id uuid → gewerke,
  company text,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text
)

defects (
  id uuid PK,
  project_id uuid → projects on delete cascade,
  short_id text,                  -- "M-024" auto-generated per project
  plan_id uuid → plans,           -- nullable (defect can be planless)
  page int,                       -- which page of the plan
  x_pct numeric,                  -- pin position 0..100
  y_pct numeric,
  apartment_id uuid → apartments, -- which apartment (optional)
  gewerk_id uuid → gewerke,
  contact_id uuid → contacts,     -- whom to send the report to
  title text not null,            -- short summary
  description text,
  deadline date,
  status text check (status in ('open','sent','acknowledged','resolved','accepted','rejected','reopened')) default 'open',
  priority int default 2,         -- 1=hoch, 2=normal, 3=niedrig
  created_by uuid → profiles,
  resolved_at timestamptz,
  resolved_by uuid → profiles
)

defect_photos (
  id uuid PK,
  defect_id uuid → defects on delete cascade,
  storage_path text not null,
  caption text,
  uploaded_by uuid → profiles
)

defect_history (
  id uuid PK,
  defect_id uuid → defects on delete cascade,
  action text not null,           -- 'created','status_changed','photo_added','sent_to_handwerker', etc.
  by_user uuid → profiles,
  details jsonb
)
```

### Activity feed

```sql
activity (
  id uuid PK,
  project_id uuid → projects on delete cascade,
  user_id uuid → profiles,
  type text not null,             -- 'check','photo','defect','task_moved', etc.
  message text not null,
  ref_table text,                 -- 'checklist_progress','defects', etc.
  ref_id uuid,
  ts timestamptz default now()
)
```

### RLS (Row Level Security)
- Enable RLS on all tables.
- Policy: a user can SELECT/INSERT/UPDATE/DELETE rows only where the row's `project_id` belongs to a `project_members` row matching `auth.uid()`.
- Profiles: anyone authed can read profiles; only own row writable.
- Gewerke catalog: read by anyone authed.

---

## 3. PHASE 1 — FOUNDATION (~1 night)

### 3.1 Setup
- Initialize SvelteKit + TypeScript + Tailwind. Set up Drizzle. Connect to Supabase using env vars.
- Port design tokens from prototype to `tailwind.config.ts` theme (red `#E30613`, ink, paper, etc., plus font stack Archivo/Inter/JetBrains Mono).
- ESLint + Prettier. Pre-commit hook with `lint-staged` (typecheck, format).
- GitHub Actions CI: pnpm install → typecheck → lint → unit tests → build.

### 3.2 Auth
- Magic-link login at `/login`.
- Seed `profiles` for the 7 bauleiter (use emails from `docs/SECRETS.md` or fall back to `vorname.nachname@hofmann-haus.com` pattern):
  - Jonas, Laurenz, Marc, Dorian, Johannes, Simon, Dietmar
- After login, redirect to `/projects` (project picker).
- Logout in topbar menu.

### 3.3 Project picker + setup wizard
Re-create from prototype: list, create, edit, archive, delete. Use real DB.

Setup wizard: name, AN, bauleiter (preselect current user), houses (with apartment counts). On save, create rows in `projects`, `project_members`, `houses`, `apartments`.

**Sample data**: keep the "Gaisbach 13 mit 150 Terminen" option. Port the `SAMPLE_GAISBACH` array from prototype to `lib/seedData.ts`. When user picks "sample", create project + houses + apartments + tasks + dependencies.

### 3.4 Topbar + Tabbar (5 tabs now!)
Tabs: **Übersicht · Checklisten · Bauzeitenplan · Aufgaben · Mängel · Aktivität**. Yes that's 6 — Tabbar shows 5 most relevant; Aktivität moves to topbar menu OR Tabbar goes to compact mode on mobile.

Decision: 6 tabs. On mobile (<640px), make tabbar horizontally scrollable. On desktop, all visible. Don't hide.

### 3.5 Checklisten module (full port)
Re-implement the item-first layout from the prototype. All current behaviors:
- Filter by scope (Alle/Projekt/Häuser/Wohnungen)
- Detail view with house filter chips
- Per-instance pills (`[H1]`, `[W1]`...)
- Bottom sheet editor (status, date, notes, photos)
- Photo upload with compression (1600px max, JPEG 0.78)
- Activity feed entries

Photos: upload to Supabase Storage at `checklist-photos/<project_id>/<progress_id>/<photo_id>.jpg`. Generate signed URLs on the fly (5-min expiry).

### 3.6 Bauzeitenplan module (visual port only — engine in Phase 2)
- Render the Gantt exactly like prototype: zoom (Tag/Woche/Monat), today line, hierarchical list, color-coded bars.
- Read tasks + dependencies from DB.
- Click bar/row → task editor sheet (read-only for now, or basic edit without propagation).
- Empty-state with "Gaisbach 13 laden" button → seeds the 150 tasks.

### 3.7 Realtime sync
Subscribe to changes in `checklist_progress`, `defects`, `tasks` for the current project. When another bauleiter changes something, update UI within 2s. Show a toast: "Jonas hat … geändert".

### 3.8 Migration script
`scripts/import-prototype.ts`: takes a backup JSON exported from the prototype's "Backup exportieren" feature, imports as a new project (with tasks and photos). Document in README.

### 3.9 Acceptance Phase 1
- [ ] Laurenz logs in via magic link, lands on project picker
- [ ] Creates "Gaisbach 13" with sample data → 150 tasks loaded
- [ ] Fills 5 checklist items with photos
- [ ] Logs out
- [ ] Jonas logs in, sees Gaisbach 13, sees Laurenz's progress, adds his own check
- [ ] Laurenz refreshes → sees Jonas's update without reload (realtime)
- [ ] CI is green
- [ ] Deployed on Vercel preview URL
- [ ] `docs/PROGRESS.md` says "Phase 1 done. Phase 2 next: Gantt engine."

**Commit Phase 1 done as `git tag phase-1-complete`.**

---

## 4. PHASE 2 — BAUZEITENPLAN-ENGINE & AUFGABEN (~1 night)

### 4.1 Constraint propagation engine
`lib/gantt/engine.ts`. Pure functions (testable):

```ts
type Task = { id, start, end, duration_at }
type Dep = { predecessor_id, successor_id, type, lag_days }

// Forward pass: given a changed task, compute new schedule
function propagate(
  tasks: Task[],
  deps: Dep[],
  changed: { id: string, start?: string, end?: string }
): Map<string, { start, end }>  // diff: id → new dates

// Critical path: longest chain ending at project end_date
function criticalPath(tasks, deps): Set<string>
```

Algorithm:
- Topological sort tasks via deps.
- For each task in order, compute earliest start = max(predecessor.end + lag) by dep type.
- Apply the changed task's new dates.
- Cascade forward — but only push successors that need to move (i.e., predecessor end + lag > current start).
- Working days: skip Sat/Sun. Add `lib/gantt/calendar.ts` with `addWorkingDays(date, n)` and `workingDaysBetween(a,b)`. (Holidays out of scope for v1.)
- Don't auto-pull tasks earlier — only push later. User explicitly compresses if needed.

### 4.2 Drag-to-move with diff preview
- Mouse: drag bar horizontally → live preview shows new bar position.
- On drop: run `propagate()` → show modal "Diese Verschiebung verschiebt **23 weitere Termine**. Übernehmen?" with a scrollable list (old date → new date).
- User confirms → DB update in transaction.
- Cancel → revert.
- Touch: drag with delay-press to start (avoid scroll conflict). Or just tap-edit: open editor sheet, change dates, same diff preview on save.

### 4.3 Critical path
- Toolbar toggle "Kritischer Pfad". On: highlight bars in red, dim others.

### 4.4 Per-apartment drill-down
For tasks where `gewerk.default_per_apartment = true`:
- In task editor sheet, show "Pro Wohnung" tab.
- List all apartments × the task. Each row: planned start/end (defaults to task dates), checkbox "erledigt", date "fertig am".
- Bauleiter can override dates per apartment.
- For tasks where it's false (Tiefbau, Rohbau): no per-apartment view. Just the main task done/not done.
- "+ Termin pro Wohnung" button: lets user override per-apartment if a non-per-apartment task suddenly needs it (override).

### 4.5 New "Aufgaben" tab — UX is critical
This is what the user explicitly called out. Get it right.

**Goal:** "What is open right now? What's overdue? What's coming this week?"

**Layout (mobile-first):**
- Top: filter chips (Alle / Mein Gewerk / Diese Woche / Überfällig / Heute / Diese 7 Tage)
- Filter chips also for: Haus, Gewerk, Bauleiter (zugewiesen)
- Sort: by deadline ascending, then priority
- Each item card:
  - Color stripe (gewerk color)
  - Title + Pos.-Num.
  - "Haus B · Wohnung 3" if per_apartment
  - Deadline as relative ("in 3 Tagen", "vor 5 Tagen — überfällig" in red)
  - Tap → opens the task or apartment-task editor
- Group sections: **Überfällig** (red header) / **Diese Woche** / **Nächste 14 Tage** / **Später**
- Empty state: "✓ Alles im Plan."

**What counts as an "Aufgabe":**
- Task or per-apartment-task with end_date in the past or near future, where done is false
- Mängel with deadline (after Phase 3 — for now, just tasks)

Combine all into one query, sorted.

### 4.6 Task editor sheet — full version
- All fields editable
- Color override
- Predecessors/successors with picker
- Per-apartment list (if per_apartment)
- Notes
- Delete with cascade warning
- "+ Unteraufgabe einfügen" button — creates child task

### 4.7 Acceptance Phase 2
- [ ] Move task 7.1.4 (Rohinstallation) by 5 days → preview shows ~30 affected tasks → confirm → DB updated
- [ ] Toggle critical path → highlights chain
- [ ] Open task 6.1.5 (Außenputz Haus A) → see per-apartment list of 8 apartments → mark Wohnung 3 done
- [ ] Aufgaben tab loads, sorted properly, filter "Überfällig" works
- [ ] All Phase 1 acceptance still passes
- [ ] `git tag phase-2-complete`

---

## 5. PHASE 3 — MÄNGEL-MODUL (~1.5 nights)

This is the most complex. Don't skip details.

### 5.1 Pläne
- Upload PDF: drag-drop or button. Store in Supabase Storage at `plans/<project_id>/<plan_id>.pdf`.
- After upload: extract page count via PDF.js, save to DB.
- List of plans: name, version, page count, upload date, "Mängel: 12".
- Edit plan: rename, replace file (creates new version, old plan rows get `superseded_by`, defects on old plan show warning "Plan wurde aktualisiert — Pin neu setzen").
- Delete plan: only if no defects reference it.

### 5.2 Plan-Viewer mit Pin-Drop
- Open plan → PDF.js renders page 1.
- Page navigation (prev/next, jump-to).
- Zoom (50%, 100%, 150%, 200%, fit-width). Pinch-zoom on mobile.
- Existing defects shown as numbered pins (M-001, M-002...). Color = status.
- Tap empty area → "Mangel hier anlegen?" → opens new defect sheet with x_pct/y_pct prefilled.
- Tap existing pin → opens defect detail.

### 5.3 Mangel-CRUD
**Create:**
- Title (required)
- Description (markdown supported, at minimum line breaks preserved)
- Gewerk dropdown (required)
- Photos (upload, multiple, compressed like checklist photos)
- Apartment dropdown (optional)
- Deadline (date)
- Priority (Hoch/Normal/Niedrig)
- Contact (auto-suggest based on gewerk)
- Plan + page + position (from where it was opened)
- Status: starts as `open`

**Auto-generated short_id**: `M-001`, `M-002`... per project, sequential.

**Edit:** all fields. Status changes via dropdown. Each status change writes to `defect_history`.

**Delete:** soft (status `rejected` + history entry) — never hard delete.

### 5.4 Mängel-Übersicht (separate from plan-view)
At `/[projectId]/maengel`:
- List view, sortable + filterable
- Filters: Status, Gewerk, Haus, Wohnung, Deadline (offen/überfällig)
- Bulk actions: Status ändern, an Handwerker senden
- "Karte"-Toggle: switch to plan view with pins
- Big "+ Mangel" button (creates without plan-context)

### 5.5 Gewerk-Stamm + Kontakte
Settings page: list of all gewerke for this project. Each gewerk:
- Standardkontakt (one contact selected from `contacts` for this project + gewerk)
- Standard-Email-Template (subject + body, with placeholders: {{projekt}}, {{gewerk}}, {{anzahl_maengel}}, {{deadline}})
- "+ Neuer Kontakt" inline → opens contact form

Contacts page (`/[projectId]/kontakte`): all contacts list, searchable, edit, add. Default contacts seeded as **dummies** in `seed.sql` — one per gewerk like `Mustermann Maler GmbH, info@mustermann-maler.de, +49 791 12345`. **User will swap these out by editing the file `data/contacts.csv` and running `pnpm seed:contacts`.** Document this in `README.md`.

CSV format (UTF-8):
```
gewerk,company,contact_name,email,phone,address
Maler,Mustermann Maler GmbH,Hans Mustermann,info@mustermann.de,+49 791 12345,Hauptstr 1 74523 Hall
...
```

### 5.6 PDF-Mängelreport pro Gewerk
Use **pdf-lib**. `lib/pdf/defectReport.ts`:

Layout:
- Cover: Hofmann Haus logo (red logo CSS-recreated as SVG → embedded), Projekt-Name, Gewerk-Name, "Stand: 28.04.2026", Anzahl Mängel, Bauleiter-Name + Unterschriftsfeld
- One page per defect:
  - Header: M-001 · Maler · Haus B Wohnung 3 · Deadline 15.05.2026
  - Title (bold, large)
  - Description
  - Foto(s) — max 2 per page, scaled to fit
  - Plan-Snippet — crop a 400×300 area around the pin from the plan PDF, render, mark with red circle
- Footer on each page: Seitenzahl, Projekt, Druckdatum

Generated client-side. Save to Storage briefly + provide as download.

### 5.7 mailto: Versand
Button "An Handwerker senden":
1. Generate PDF (5.6).
2. Open user's email client via `mailto:`:
   ```
   mailto:{{contact.email}}?subject=Mängelmeldung+{{projekt}}+-+{{gewerk}}&body={{template}}
   ```
3. Show toast: "Outlook geöffnet. Bitte das PDF (Download eben gestartet) anhängen."
4. After user confirms send, mark defects as `status='sent'`, write history.

The PDF auto-attach problem: **mailto: cannot attach files**. The pragma: download the PDF + open mailto + tell user to attach. Document this clearly in UI. Phase 5 (post-launch) may add Microsoft Graph integration for auto-send.

### 5.8 Wiedervorlage / Kontrolle
- On Mängel-Liste: each Mangel can have a "Wiedervorlage am [Datum]"
- Aufgaben-Tab integrates Mängel: Mängel mit Wiedervorlage in der Vergangenheit oder Deadline überfällig erscheinen dort
- Kontroll-Workflow: Mangel → Status `acknowledged` (Handwerker hat reagiert) → `resolved` (Handwerker meldet erledigt) → Bauleiter prüft → `accepted` oder `rejected` (zurück zu `open`)

### 5.9 Punkte aus Protokollen übernehmen
Free-text input box at top of Mängel-Liste: "Aus Protokoll-Text Mängel extrahieren" → user pastes a multi-line text → for each line, pre-fill a defect form (LLM-free; just split by newline). User assigns gewerk per row in a quick form. Bulk-create.

### 5.10 Musterdetails / Projektdetails
Per project: image gallery for "Musterdetails" (Schnitte, Konstruktionsdetails). Upload, label, view. Used by bauleiter for reference on Baustelle. Simple: just a Storage-backed gallery.

### 5.11 Checklisten je Gewerk je Wohnung (Bruders Punkt)
This is different from existing checklists (which are scope-based). Add a new concept:
- `gewerk_checklists`: per-gewerk template of items to check on each apartment.
- For each (project, gewerk, apartment), a checklist instance exists, started when bauleiter expands it on Baustelle.
- Items have photo support (like main checklists).

Schema:
```sql
gewerk_checklist_templates (id, gewerk_id, item text, requires_photo bool, sort_order)
gewerk_checklist_progress (id, project_id, gewerk_id, apartment_id, template_id, done, photos jsonb, notes, done_by, done_date)
```

Seed templates: ~5-10 per gewerk for the most common ones (Maler, Fliesenleger, Elektro, Sanitär). Keep generic; user can add more. Store in `seed.sql`.

UI: in apartment detail or in gewerk-detail, show "Checkliste pro Wohnung" with the template items.

### 5.12 "+" neues Gewerk inline einfügen
On Mängel-Übersicht, on Aufgaben-Tab: a "+" button on each row group/section header allows inserting a new gewerk-row without navigating to settings. Opens a quick form (name, color picker, contact email).

### 5.13 Acceptance Phase 3
- [ ] Upload `Gaisbach_Grundriss.pdf` → 4-page plan listed
- [ ] Open plan → drop 6 pins on different pages, fill Mängel for Maler (3) and Fliesenleger (3)
- [ ] One Mangel has 2 Fotos
- [ ] Mängel-Übersicht: filter Maler → 3 results, Fliesenleger → 3
- [ ] "An Handwerker senden" für Maler → PDF downloads with cover + 3 pages, mailto opens Outlook with `info@mustermann-maler.de` and templated body
- [ ] Status changes work, history visible
- [ ] Aufgaben-Tab integrates: 2 Mängel mit Deadline überfällig zeigen sich
- [ ] gewerk_checklists template "Maler" auf Wohnung A1 → 8 items, hake 3 ab mit Foto
- [ ] All earlier acceptance still passes
- [ ] `git tag phase-3-complete`

---

## 6. PHASE 4 — POLISH, DEPLOY, DOCUMENT (~half night)

### 6.1 Performance
- Lighthouse audit. Aim for >90 on mobile.
- Image lazy-load. Pagination on long lists (>100 items).
- Drizzle query review: add indexes on hot paths (project_id, deadline, status).

### 6.2 PWA
- `manifest.json`: name "Hofmann Bauleiter", icon (use the red-frame logo as SVG → 192/512 PNG), theme color `#E30613`.
- Service Worker via Vite PWA plugin: cache static assets + checklist data offline.
- "Zur Startseite hinzufügen"-Hinweis on iOS first visit.
- Offline mode: graceful — show "Offline" banner, queue writes in IndexedDB, sync on reconnect (basic queue, not full CRDT).

### 6.3 Production Setup
- Set production env vars in Vercel (Supabase URL, anon key — service_role NEVER in client).
- Custom domain optional (just `*.vercel.app` is fine for now). Document in OPEN_QUESTIONS for user.
- Lock down Supabase: only the bauleiter team's emails can sign up. Add allowlist in `auth.users` policy or seed-only.

### 6.4 README.md (German, for the team)
Structure:
- Was ist das?
- Wer hat Zugriff?
- Erstanmeldung (magic link)
- Funktionen pro Tab
- Kontakte austauschen (`data/contacts.csv` editieren + `pnpm seed:contacts`)
- Backup / Export
- Bei Problemen: an Laurenz wenden
- Tech stack (kurz)

### 6.5 Final Acceptance
- [ ] All tests green
- [ ] Lighthouse mobile >90 perf
- [ ] Deployed on Vercel production URL
- [ ] All 7 bauleiter accounts active
- [ ] Sample project "Gaisbach 13" loaded with realistic data
- [ ] `docs/PROGRESS.md` says "BUILD COMPLETE — review needed"
- [ ] `docs/OPEN_QUESTIONS.md` has the human-only items listed
- [ ] `git tag v1.0.0-rc1`

---

## 7. UX & DESIGN PRINCIPLES (BIBLE: `reference/prototype.html`)

- **Visual style is locked.** Don't redesign.
- Design tokens: red `#E30613` (only for primary accents and red logo), ink `#0F0F10`, paper `#FFFFFF`, bg `#F6F4F1`.
- Fonts: Archivo (display, headlines, weights 700-900), Inter (body), JetBrains Mono (labels, numbers, status).
- Buttons, pills, sheets, cards, hero, progress bars: copy from prototype CSS.
- **Mobile-first.** Test every screen on a 380px viewport before declaring done.
- **No emojis** in UI text (apart from empty-state illustrations).
- **No animation overuse.** Subtle transitions only.
- **Bottom sheets** are the editor surface — modal-style, not separate pages.
- **Don't use external UI libraries** (no shadcn-svelte, no Skeleton). Hand-roll components in the prototype's style.

---

## 8. WHAT'S OUT OF SCOPE (don't build)

- Auto-attaching PDFs to email (mailto: limitation — document, move on)
- Microsoft Graph / Outlook API integration
- IMKE sync
- Native mobile apps
- Push notifications
- Multi-tenant / other companies
- Billing / Subscriptions
- Time-tracking / Stundennachweis
- Cost tracking
- Document management beyond plans + Musterdetails
- BIM / 3D
- Translations (German only)
- Holiday calendar (treat all weekdays as working days; weekends always off)

If user requests these later, that's Phase 5+.

---

## 9. SECRETS YOU NEED

The user will provide these in `docs/SECRETS.md` (gitignored). Expected variables:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_PASSWORD=...
BAULEITER_EMAILS=
  Jonas: jonas.xxx@hofmann-haus.com
  Laurenz: laurenz.hofmann@hofmann-haus.com
  Marc: marc.xxx@hofmann-haus.com
  Dorian: dorian.xxx@hofmann-haus.com
  Johannes: johannes.wagner@hofmann-haus.com
  Simon: simon.xxx@hofmann-haus.com
  Dietmar: dietmar.hofmann@hofmann-haus.com
```

If `SECRETS.md` is missing, look for a `.env.local` file with the same variables. If both are missing: **STOP**. Write to `OPEN_QUESTIONS.md`: "Need Supabase credentials" — and continue with whatever else can be done locally (e.g., set up project structure, write code that depends on env, mock the Supabase client for now).

For bauleiter emails: if exact addresses unknown, use the pattern `vorname.nachname@hofmann-haus.com` and document the assumption in `DECISIONS.md`. Pattern is established (Dietmar = dietmar.hofmann@hofmann-haus.com confirmed from existing prototype data).

---

## 10. RESUMING WORK (every session)

1. `cat docs/PROGRESS.md` — what was the last completed milestone? What's the next concrete step?
2. `git log --oneline -20` — what changed recently?
3. `cat docs/OPEN_QUESTIONS.md` — anything blocked?
4. `pnpm install && pnpm test` — sanity check the codebase still builds.
5. **Continue from "next concrete step" in PROGRESS.md.** Don't re-plan.
6. After meaningful progress, commit + push + update PROGRESS.md.

---

## 11. DEFINITION OF DONE

Build is **complete** when:
- All 4 phase acceptance lists pass
- `git tag v1.0.0-rc1` exists
- `docs/PROGRESS.md` ends with `BUILD COMPLETE`
- A summary of next-steps for the user lives in `docs/HANDOFF.md`

Until then, **keep going**. If you finish faster than 3 days: tighten polish, add a bit more test coverage, write `docs/HANDOFF.md` thoroughly. Don't add scope.

---

**Begin now.** First action: read `reference/prototype.html`. Second action: read `docs/SECRETS.md` (if exists). Third action: scaffold the SvelteKit project. Fourth action: commit "chore: initial scaffold". Then update `PROGRESS.md` and continue.

Good luck. The user is going to bed.
