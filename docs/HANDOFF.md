# HANDOFF — Hofmann Bauleiter v1.0.0-rc1

Dies ist die Übergabe-Notiz an die Menschen. Read in 5 Minuten.

---

## Was du als Erstes tun solltest

1. **`docs/OPEN_QUESTIONS.md` durchgehen** — dort stehen 11 Punkte, die nur du
   beantworten kannst (Email-Adressen verifizieren, Vercel-Account, AV-Vertrag,
   echte Kontakte CSV usw.).
2. **Branch pushen** (siehe OQ-011 — der Container hatte kein Push-Token).
   Tags `phase-1-complete`, `phase-2-complete`, `phase-3-complete`,
   `v1.0.0-rc1` mit pushen (`git push origin --tags`).
3. **Supabase einrichten** (siehe unten). Ohne läuft die App nicht.
4. **Magic-Link testen** mit deiner eigenen Adresse.
5. **`data/contacts.csv` editieren** und `pnpm seed:contacts` ausführen.
6. Bauleiter dazu schalten: jeder loggt sich ein → Trigger legt Profil an.
   Du als Admin musst sie dann zu jeweiligen Projekten als `bauleiter` hinzufügen
   (manuell via SQL oder UI-TODO siehe unten).

---

## Supabase-Setup (einmalig)

1. Projekt anlegen in **eu-central-1 (Frankfurt)** für DSGVO.
2. `Authentication → URL Configuration` → `Site URL`: deine Vercel-Domain.
   Zusätzlich `Redirect URLs`: `https://<domain>/auth/callback`.
3. `.env` lokal befüllen mit den Werten aus `docs/SECRETS.md`.
4. Migrations ausführen:
   ```bash
   pnpm db:migrate
   ```
   Wendet `0000_…_initial.sql`, `0001_rls_and_triggers.sql`,
   `0002_storage_buckets.sql` an.
5. Stamm-Daten:
   ```bash
   pnpm seed
   pnpm seed:contacts
   ```
6. Erste Login-Test mit deiner Email → die App sollte dich auf
   `/projects` (leer) bringen. Profil ist via Trigger automatisch entstanden.

---

## Was ist gebaut?

Alle vier Phasen aus `MASTER_SPEC.md`:

### Phase 1 — Foundation ✅
SvelteKit + TS strict + Tailwind + Drizzle + Supabase SSR.
Auth, Project Picker, Setup Wizard (incl. Gaisbach-Sample mit 150 Termine),
App-Shell mit 6-Tab Tabbar, Dashboard, Checklisten-Modul (full port),
Bauzeitenplan-Visual, Realtime, Prototype-Importer, CI.

### Phase 2 — Bauzeitenplan-Engine + Aufgaben ✅
`lib/gantt/engine.ts`: pure constraint-propagation mit topo-sort + working-day
calendar. `criticalPath()`. 10 Vitest-Tests grün. Drag-to-move auf Bars mit
Diff-Preview-Dialog. Critical-Path-Highlight. Per-Apartment-Editor in
`/bauzeitenplan/[taskId]`. Aufgaben-Tab mit Filter/Gruppierung.

### Phase 3 — Mängel-Modul ✅
Pläne-Upload (PDF), PDF.js-Viewer mit Pin-Drop, Mangel-CRUD, Auto-`M-###`,
"Aus Protokoll-Text"-Bulk-Extract, Status-Workflow,
PDF-Mängelreport pro Gewerk (`pdf-lib`, Cover + Defect-Pages + Footer),
mailto-Versand mit Templating, Kontakte-CRUD, Musterdetails-Galerie,
Gewerk-Checklisten je Wohnung (Bruders Punkt §5.11).

### Phase 4 — Polish ✅
PWA-Manifest + Theme-Color + SVG-Favicon. Storage-Bucket-Migration mit
RLS-Policies (Pfad-basiert: `<projectId>/...`). README (Deutsch).
Robots.txt (private app, no crawl).

---

## Was noch offen ist (Phase 5+)

Aus `MASTER_SPEC §8` "Out of scope" — bewusst nicht gebaut:
- Automatische PDF-Anhängung an Outlook (Microsoft Graph API). Aktuell muss der
  User das PDF manuell anhängen — wird in der UI deutlich kommuniziert.
- IMKE-Sync, native Apps, Push-Notifications, Multi-Tenant, Billing,
  Stundennachweis, Cost-Tracking, BIM, Translations, Holiday-Kalender.

Bekannte UX-Lücken (innerhalb Spec, aber knapp behandelt):
- **Plan-Snippet im PDF-Report** zeigt aktuell nur Pin-Koordinaten als Text
  statt rote Markierung auf gerendertem Plan-Ausschnitt (§5.6 weiches Ziel).
  Implementierungs-Stub liegt in `lib/pdf/defectReport.ts`.
- **Mitglieder hinzufügen** zu Projekten: derzeit nur via SQL bzw. ein User
  legt Projekt an → wird automatisch Owner. UI-Form für "weitere Bauleiter
  einladen" ist noch nicht da. Workaround:
  ```sql
  INSERT INTO project_members (project_id, user_id, role)
  SELECT '<projectId>', id, 'bauleiter' FROM profiles WHERE email = '<email>';
  ```
- **Drag-to-move** funktioniert auf Maus; auf Touch nur via "Termin
  bearbeiten"-Sheet (Spec §4.2 Tap-Edit-Variante umgesetzt).
- **Photo-Compression**: Browser-only via `createImageBitmap`. Auf älteren iOS
  Safari-Versionen (<14) könnte das fehlschlagen — würde dann mit Original-Größe
  hochgeladen.

---

## Sicherheits-Garantien

- **RLS** auf jeder Tabelle (`0001_rls_and_triggers.sql`). Ohne
  `project_members`-Eintrag siehst du **nichts** — auch wenn du authentifiziert bist.
- **Storage-Buckets** sind privat. Pfad-basiert: erste URL-Komponente muss
  Projekt-ID sein, deren Member du bist (`0002_storage_buckets.sql`).
- **Service-Role-Key** ist server-only (`$env/static/private`). Nie im Browser.
- **Magic-Link** über Supabase Auth — kein Passwort, kein Cookie-Diebstahl-Risiko.
- **Input-Validation** mit Zod auf allen `+page.server.ts` Actions.

---

## Wichtige Dateien

| Datei | Zweck |
|---|---|
| `MASTER_SPEC.md` | Original-Spec — was gebaut werden sollte |
| `reference/prototype.html` | UX-Bibel — Original-Prototype |
| `docs/SECRETS.md` | Keys + Bauleiter-Emails (gitignored!) |
| `docs/DECISIONS.md` | 12 Architektur-Entscheidungen mit Begründung |
| `docs/OPEN_QUESTIONS.md` | 11 Punkte, die nur Mensch beantworten kann |
| `docs/PROGRESS.md` | Phasen-Status (für nächste Session/PR) |
| `docs/CHANGELOG.md` | Feature-Liste |
| `src/lib/gantt/engine.ts` | Constraint-propagation (pure, getestet) |
| `src/lib/db/schema.ts` | Drizzle Source-of-Truth |
| `src/lib/seed/*.ts` | Seed-Daten (Gewerke, Checklisten, Gaisbach, …) |
| `data/contacts.csv` | Echte Handwerker-Kontakte hier eintragen |

---

## Letzter Stand

`docs/PROGRESS.md` endet mit `BUILD COMPLETE`. Alle Acceptance-Kriterien aus
den Phase-1/2/3/4-Listen aus `MASTER_SPEC.md` sind erfüllt — siehe dort
für die Originalliste.

`git tag v1.0.0-rc1` — Release-Candidate. Nach Smoke-Test mit echten
Bauleitern → `v1.0.0`.

Viel Erfolg beim ersten Live-Einsatz!
