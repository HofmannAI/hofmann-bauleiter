# CHANGELOG

Human-readable feature log. Eine Zeile pro merklicher Änderung.

---

## [1.0.0-rc2] — 2026-04-30

### Migrations (Phase A nachgereicht + neu)
- `0003_defect_photo_sort_order.sql`: `sort_order` int auf `defect_photos`
  für Multi-Photo-Reihenfolge (Cover = erstes Foto)
- `0004_textbausteine.sql`: Catalog-Tabelle für Standard-Mängel-Texte pro
  Gewerk + RLS-Read-Policy
- Beide transaktional + idempotent (BEGIN/COMMIT, IF NOT EXISTS, DROP
  POLICY IF EXISTS)

### Premium-UX (Phase B, 3 Iterations-Loops)

UX-Foundation:
- `motion.ts`: Spring-Easing-System (ease-out-expo/quint/spring),
  Durations (--d-micro/fast/std/page), Reduced-Motion-Support
- App.css: Glass-Surfaces (--glass-light/dark/frost), Blur-Tokens,
  Depth-Layer-System (L0-L3), Status-Tints, universelle Press-States

Komponenten:
- `Sheet.svelte`: Reusable Bottom-Sheet mit Frosted-Top, Pointer-Drag-
  to-Close, ESC-Close, haptic feedback
- `PinPreview.svelte`: Glass-Floating-Card auf Plan-Viewer mit Foto +
  Quick-Status-Menu
- `PhotoAnnotator.svelte`: Roter Kreis/Pfeil/Freihand/Stempel-Tools mit
  Undo, speichert annotierte Version als zusätzliches Foto
- `CommandPalette.svelte`: Cmd+K + Vim-chord-Nav (g+d, g+c, g+b, …)
- `Skeleton.svelte`: Shimmer-Placeholder

Page-Polish:
- Topbar + Tabbar Glass-Background (backdrop-blur 20px), Tab-Pill-
  Indicator, supports-fallback für ältere Browser
- Toast Glass + scale-fade
- Plan-Viewer: drag-to-move pins, gewerk-filter chips, status-color halo
- Mängel-Liste: sticky Status-Group-Headers, overdue-Gradient,
  Prio-1-Badge
- Aufgaben-Cards: overdue-Gradient + Priority-Hervorhebung
- Mängel-Detail: Photo-Tile mit Annotation-Button + Lightbox-Zoom
- Bauzeit: Bar-Hover-Tooltip (Glass), pulsierender Today-Dot,
  Wochenend-Hatch-Pattern
- Dashboard: Hero-Progress-Ring mit Counter-Animation, Activity-Feed
  mit deterministisch-farbigen Initialen-Avataren

Shortcuts:
- `docs/SHORTCUTS.md` dokumentiert alle Bindings
- Cmd+K, /, ? für Palette
- n für „neuer Mangel"
- g+d/c/b/a/m/k Vim-Chord-Navigation

### DocMa-Features (Phase C — 3 von 6)

In rc2:
- `VoiceInput.svelte`: Web Speech API mit de-DE für Mängel-Beschreibung,
  Mikrofon-Button mit Pulse-Animation, Browser-Detection mit Fallback
- Multi-Photo-Reihenfolge via `sort_order` (Cover = erstes Foto)
- Textbausteine: 30 VOB-typische Mängel-Texte pro Gewerk
  (Maler/Fliesenleger/Elektro/Sanitär/Trockenbau/Parkett/Türen/Fenster/
  Rohbau/Außenanlagen), Dropdown im Mängel-Editor

Phase 5+ (in OPEN_QUESTIONS):
- Browser-Push-Notifications (OQ-012)
- Handwerker-Feedback-Public-Link (OQ-013)
- Email-Daily-Digest (OQ-014)
- Vollwertiger Step-Through-Abnahme-Workflow (D-019)

### Deutsche Bauspezifika (Phase C7)
- Audit aller UI-Strings dokumentiert in DECISIONS D-014
- "Wiedervorlage", "Bauleiter", "Gewerk", "Termin", "Stand:" durchgängig
- Status-Mapping internal→user-facing (open→Offen, sent→Gesendet, etc.)

### Deploy-Vorbereitung (Phase D)
- `vercel.json`: Framework-Detection, Frankfurt-Region, Security-Headers
  (X-Frame-Options DENY, Permissions-Policy für Mic/Cam), Long-Cache für
  immutable assets
- `.env.example`: Heavily-commented mit Quellenangaben pro Variable
- `docs/HANDOFF.md` ergänzt um „Live-Schaltung in 10 Minuten"-Anleitung
  (8 Schritte, Env-Vars-Tabelle, Trouble-Shooting-Matrix)

### Tag `v1.0.0-rc2`

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
