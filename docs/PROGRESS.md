# PROGRESS

Single source of truth fürs Resumen. Erste Aktion jeder Session: diese Datei lesen. Letzte Aktion: aktualisieren.

---

## Aktueller Stand

**Phase**: Phase 3 — Mängel-Modul (in Arbeit)
**Datum**: 2026-04-29
**Branch**: `claude/setup-docs-secrets-WMSDP`
**Tags**: `phase-1-complete`, `phase-2-complete`

### Phase 1 — Foundation ✅
- [x] Doku-Skelett (SECRETS gitignored, DECISIONS, OPEN_QUESTIONS, PROGRESS, CHANGELOG)
- [x] SvelteKit + TS strict + Tailwind + Drizzle + Supabase SSR scaffold
- [x] Design-Tokens 1:1 aus prototype.html in tailwind.config.ts und app.css
- [x] Drizzle-Schema (24 Tabellen) + Migration `0000_…sql`
- [x] RLS-Migration `0001_rls_and_triggers.sql`: `is_project_member()`,
      `handle_new_user`-Trigger (Auto-Profile bei Magic-Link), Policies für alle Tabellen
- [x] Magic-Link Auth: `/login`, `/auth/callback`, `/auth/logout`
- [x] Project Picker `/projects` mit Hauseit/Wohnungs/Termin-Counts
- [x] Setup Wizard `/projects/new` (Empty / Sample-Gaisbach-Template)
- [x] App Shell: Topbar (Projekt, Initialen-Menü, Logout) + Tabbar (6 Tabs)
- [x] Dashboard mit Hero, Quick-Cards, Activity-Feed
- [x] Checklisten-Modul vollständig portiert: Liste mit Filter, Detail-View
      mit House-Chips, item-first Layout, Pills, Bottom-Sheet Editor
      (Status, Datum, Notizen, Foto-Upload mit 1600px-Compression)
- [x] Bauzeitenplan visual: Gantt-Komponente mit Zoom (Tag/Woche/Monat),
      Today-Line, hierarchische Liste, Color-coded Bars, Empty-State mit
      "Gaisbach 13 laden (150 Termine)"-Action
- [x] Realtime: `subscribeRealtime()` auf `postgres_changes` für
      checklist_progress / defects / tasks / activity → invalidateAll + Toast
- [x] `scripts/import-prototype.ts` portiert prototype-JSON-Backups
- [x] CI: typecheck + test + build auf jedem PR

### Phase 2 — Bauzeitenplan-Engine + Aufgaben ✅
- [x] `lib/gantt/engine.ts`: `propagate()` mit topo-sort + working-day-calendar,
      `criticalPath()` walks back from latest-ending task
- [x] 10 Vitest-Unit-Tests für Engine + Calendar — alle grün
- [x] Drag-to-move auf Bars (Maus); Diff-Preview-Dialog listet alle
      betroffenen Termine vor dem Übernehmen
- [x] Critical-Path-Toggle (highlight in Rot)
- [x] Per-Apartment Drill-Down im Task-Editor (`/bauzeitenplan/[taskId]`)
- [x] Task-Editor: Name/Notes/Color-Swatches inline, Vorgänger/Nachfolger
      Pills, Delete-Button mit Confirm
- [x] Aufgaben-Tab: aggregiert Tasks + Per-Apartment-Slots + offene
      Mängel-Deadlines, sortiert nach Deadline, gruppiert in
      Überfällig/Diese Woche/Nächste 14 Tage/Später, Filter-Pills

### Phase 3 — Mängel-Modul (in Arbeit)
- [x] `defectQueries.ts`: list/get/create/update + auto-`M-###` short_id
- [x] Mängel-Übersicht: Status- + Gewerk-Filter, Liste mit Color-Stripe
      und Status-Pill, "Aus Protokoll-Text"-Bulk-Extract (eine Zeile = ein Mangel),
      Sheet-Editor zum Anlegen
- [x] Mängel-Detail: Inline-Edit (Titel, Description, Gewerk, Kontakt,
      Deadline, Wiedervorlage, Priorität), Status-Workflow-Buttons,
      Foto-Upload mit Signed-URL-Anzeige, Verlauf
- [x] Pläne-Liste + Upload (PDF, page count via PDF.js client-side)
- [x] Plan-Viewer mit PDF.js: Zoom (+/−), Seitenwahl, Tap-on-empty-area
      öffnet "Mangel hier anlegen?"-Sheet, bestehende Pins werden
      Status-farbig angezeigt
- [x] mailto-Versand mit Templating (öffnet Outlook, Status → 'sent')
- [ ] Phase 3.5 — Kontakte-Verwaltung (UI)
- [ ] Phase 3.6 — PDF-Mängelreport pro Gewerk (`lib/pdf/defectReport.ts`)
- [ ] Phase 3.10 — Musterdetails Galerie
- [ ] Phase 3.11 — Gewerk-Checklisten je Wohnung (Bruders Punkt)

### Nächster konkreter Schritt
Phase 3.5: `/[projectId]/kontakte` UI bauen, dann `lib/pdf/defectReport.ts`
mit pdf-lib (Cover + eine Seite pro Mangel + Plan-Snippet mit rotem Pin-Kreis).
Anschließend Phase 3.10 (Musterdetails) und 3.11 (Gewerk-Checklisten je Wohnung).
Dann Phase 4: Polish, PWA, README, `v1.0.0-rc1`-Tag.

### Kontext für nächste Session
- Branch: `claude/setup-docs-secrets-WMSDP`
- Supabase Projekt: `prauunvyjkjvyzizhoqm.supabase.co` (siehe SECRETS.md)
- 7 Bauleiter-Emails seedbar
- Gaisbach-Sample portiert (150 Termine in `src/lib/seed/gaisbach.ts`)
- Checklisten 1:1 portiert (`src/lib/seed/checklists.ts`)
- Engine + 10 Tests grün; type-check sauber, Build OK
