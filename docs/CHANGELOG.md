# CHANGELOG

Human-readable feature log. Eine Zeile pro merklicher Änderung.

---

## [1.0.0-rc1] — 2026-04-29

### Phase 4 — Polish + Deploy
- PWA-Manifest mit Hofmann-Theme-Color (`#E30613`), Standalone-Display
- SVG-Favicon (rotes Frame-Logo aus Prototype als optimiertes SVG)
- Storage-Bucket-Migration `0002_storage_buckets.sql`: 4 private Buckets
  (`checklist-photos`, `defect-photos`, `plans`, `musterdetails`) mit
  Pfad-basierter RLS-Policy (erste URL-Komponente = Project-ID)
- README.md auf Deutsch für die Bauleiter-Crew
- HANDOFF.md mit Setup-Anleitung und Übergabe-Punkten
- robots.txt — App ist private, kein Crawl
- Tag `v1.0.0-rc1`

### Phase 3 — Mängel-Modul
- Mängel-Übersicht mit Status- und Gewerk-Filter, Color-Stripe-Cards,
  "Aus Protokoll-Text"-Bulk-Extract (eine Zeile = ein Mangel)
- Mängel-Detail: inline-edit (Titel, Beschreibung, Gewerk, Kontakt,
  Deadline, Wiedervorlage, Priorität), Status-Workflow-Buttons
  (acknowledged/resolved/accepted/rejected/reopened) mit Verlauf
- Foto-Upload mit signed-URL-Anzeige + Delete
- Pläne-Liste mit PDF-Upload (PDF.js-page-count client-side)
- Plan-Viewer (PDF.js): Zoom, Seiten-Navigation, Tap-on-empty-area
  öffnet "Mangel hier anlegen?"-Sheet, Pins werden Status-farbig angezeigt
- Auto-`M-###` short_id pro Projekt
- PDF-Mängelreport pro Gewerk: Cover + eine Seite pro Mangel + Footer,
  via `pdf-lib`, client-seitig generiert (Spec §5.6 Layout 1:1)
- mailto-Versand mit Templating (Outlook öffnet sich, Status → 'sent')
- Kontakte-Verwaltung: Liste mit Suche, Edit-Sheet (Firma/Name/Email/
  Telefon/Adresse/Notizen), Project-scoped + Global
- Musterdetails-Galerie mit Lightbox
- Gewerk-Checklisten je Wohnung (Bruders Punkt §5.11): Filter nach Gewerk
  und Wohnung, Done/Total-Badges, Photo-required-Marker
- Tag `phase-3-complete`

### Phase 2 — Bauzeitenplan-Engine + Aufgaben
- `lib/gantt/engine.ts`: pure constraint-propagation, topo-sort,
  working-day calendar (Mo-Fr, keine Feiertage in v1)
- `propagate()`: Diff-Map nach manuellem Move, push-only (nie pullen)
- `criticalPath()`: walks back from latest-ending task
- 10 Vitest-Unit-Tests grün
- Drag-to-move auf Bars (Maus): Live-Preview, Diff-Dialog mit allen
  betroffenen Terminen, applyMove als atomic batch update
- Critical-Path-Toggle (highlight in Rot)
- Per-Apartment Drill-Down im Task-Editor
- Task-Editor (`/[projectId]/bauzeitenplan/[taskId]`): inline-edit
  Name/Notes/Color-Swatches (8 Farben), Vorgänger/Nachfolger Pills,
  Delete mit Confirm
- Aufgaben-Tab aggregiert Tasks + Per-Apartment-Slots + offene Mängel:
  sortiert nach Deadline, gruppiert in Überfällig/Diese Woche/14 Tage/Später,
  Filter-Pills (Alle/Überfällig/Heute/Diese Woche/14 Tage)
- Tag `phase-2-complete`

### Phase 1 — Foundation
- SvelteKit 2 + Svelte 5 (Runes) + TypeScript strict + Tailwind 3 Setup
- Drizzle Schema mit 24 Tabellen (Profiles, Projects, Members, Houses,
  Apartments, Gewerke, Checklists, Tasks, Defects, Plans, Contacts,
  Activity, History, …)
- RLS-Migration `0001_rls_and_triggers.sql`: `is_project_member()`-helper,
  `handle_new_user`-Trigger (Auto-Profile bei Signup), Policies für jede Tabelle
- Magic-Link-Auth (`/login`, `/auth/callback`, `/auth/logout`) via Supabase SSR
- Project Picker (`/projects`) mit Haus/Wohnungs/Termin-Counts pro Projekt
- Setup Wizard (`/projects/new`): Empty/Sample-Templates, House+Apt-Steppers,
  bei Sample-Wahl wird Gaisbach-13 mit 150 Tasks geladen
- Topbar: Brand, Projekt-Switch-Link, User-Initialen-Menü mit Logout
- Tabbar: 6 Tabs (Übersicht/Checklisten/Bauzeit/Aufgaben/Mängel/Aktivität),
  horizontal scrollbar auf <640px, grid auf ≥640px
- Dashboard: Hero mit Stats, Quick-Cards, Activity-Feed
- Checklisten-Modul (full port): Liste mit Scope-Filter, Detail-View mit
  House-Chips, item-first Layout, Pills, Bottom-Sheet-Editor (Status/Datum/
  Notizen/Foto-Upload mit 1600px-JPEG-q=0.78-Compression)
- Bauzeitenplan-Visual: Gantt-Komponente mit Zoom (Tag/Woche/Monat),
  Today-Line, hierarchische Liste, Color-coded Bars
- Realtime-Sync: `subscribeRealtime()` auf `postgres_changes` für
  checklist_progress / defects / tasks / activity → invalidateAll + Toast
- `scripts/import-prototype.ts` portiert prototype-JSON-Backups
- CI: `.github/workflows/ci.yml` typecheck + test + build
- Seed-Daten: 20 Gewerke, ~38 Gewerk-Checklisten-Templates, 7 Bauleiter-
  Profile, 20 Dummy-Kontakte, 11 Hofmann-Standard-Checklisten (full port)
- Tag `phase-1-complete`

### Initial — Repository Bootstrap
- Doku-Skelett: SECRETS.md (gitignored!), DECISIONS.md (12 Punkte),
  OPEN_QUESTIONS.md (11 Punkte), PROGRESS.md, CHANGELOG.md
- `.gitignore` mit Schutz für `.env` und `docs/SECRETS.md`
