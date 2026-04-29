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

---

# Live-Schaltung in 10 Minuten

Schritt-für-Schritt-Anleitung für den ersten Production-Deploy.
Mache es zur „Mittagspause"-Aktion: Migration läuft, Vercel deployed,
Magic-Link-Test, Bauleiter-Einladung. Du brauchst dafür ca. 10 Minuten
sobald PR #2 (Migration-Fix) gemergt ist.

## Schritt 1 — Supabase: Migrations + Seeds (3 Min)

1. Öffne `https://supabase.com/dashboard/project/<dein-projekt>/sql/new`
   (SQL-Editor, neuer Tab).
2. Datei `supabase/migrations/0000_ordinary_the_order.sql` aus dem Repo
   kopieren → in den SQL-Editor einfügen → **RUN** klicken. Erfolg = "No rows returned".
3. Wiederhole mit `0001_rls_and_triggers.sql` → **RUN**.
4. Wiederhole mit `0002_storage_buckets.sql` → **RUN**.
5. Wiederhole mit `0003_defect_photo_sort_order.sql` → **RUN**.
6. Wiederhole mit `0004_textbausteine.sql` → **RUN**.
7. Stamm-Daten seeden: lokales Terminal,
   ```bash
   pnpm install
   cp .env.example .env  # und Werte aus docs/SECRETS.md eintragen
   pnpm seed
   pnpm seed:contacts
   ```
   Resultat im Supabase-Dashboard → "Table Editor" → `gewerke` (20 Reihen),
   `checklists` (~11), `gewerk_checklist_templates` (~38),
   `textbausteine` (~30), `contacts` (20 globale Dummies).

> **Falls du die echten Handwerker-Kontakte schon hast**: bearbeite
> `data/contacts.csv` lokal und führe `pnpm seed:contacts` erneut aus.
> Globale Dummies werden ersetzt; projekt-spezifische Kontakte bleiben.

## Schritt 2 — Vercel: GitHub-Repo importieren (2 Min)

1. Öffne `https://vercel.com/new`
2. **Import Git Repository** → suche „hofmann-bauleiter" → **Import**
3. Framework wird automatisch als **SvelteKit** erkannt → kein Eingriff nötig
4. **Build & Output Settings** lassen wie sie sind (SvelteKit-Defaults)
5. **Environment Variables** → klicke „Add" für jede der folgenden:

| Variable | Wert | Quelle |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Supabase → Settings → API |
| `PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` | Supabase → Settings → API |
| `SUPABASE_DB_PASSWORD` | `<dein-passwort>` | docs/SECRETS.md |
| `DATABASE_URL` | `postgres://postgres.<ref>:<pw>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres` | Supabase → Settings → Database → Connection string |

> Wichtig: Für jede Variable die Checkboxen **Production**, **Preview**,
> **Development** ankreuzen.

6. Region (Function-Region) prüfen — sollte **Frankfurt (fra1)** sein
   (steht so in `vercel.json`).

## Schritt 3 — Deploy (1 Min)

7. Klicke **Deploy**.
8. Warte ~60-90 Sekunden. Beim ersten Build kann es 2 Minuten dauern.
9. Wenn fertig: Du bekommst eine URL wie `https://hofmann-bauleiter-xyz.vercel.app`.
   **Diese URL kopieren** — gleich brauchst du sie zweimal.

## Schritt 4 — Supabase Auth-URLs setzen (1 Min)

10. Öffne `https://supabase.com/dashboard/project/<ref>/auth/url-configuration`
11. **Site URL**: kopierte Vercel-URL einfügen (`https://hofmann-bauleiter-xyz.vercel.app`)
12. **Redirect URLs**: dieselbe URL plus `/auth/callback` (z.B.
    `https://hofmann-bauleiter-xyz.vercel.app/auth/callback`)
13. **Save**.

## Schritt 5 — Magic-Link-Test mit eigener Email (2 Min)

14. Öffne deine Vercel-URL im Browser → du landest auf `/login`.
15. Gib deine eigene Email-Adresse ein (z.B. `laurenz.hofmann@hofmann-haus.com`).
16. Klicke **Magic-Link senden**.
17. Öffne deinen Posteingang → Mail von Supabase Auth → Link klicken.
18. Du landest auf `/projects` (leer).
19. Im Supabase Dashboard → "Table Editor" → `profiles` siehst du jetzt
    deinen Eintrag automatisch (Trigger `handle_new_user` hat ihn angelegt).

> **Wenn der Link nicht funktioniert**: prüfe Site URL + Redirect URL aus
> Schritt 4 noch mal — Tippfehler sind die häufigste Ursache.

## Schritt 6 — Erstes Projekt anlegen + sich selbst Owner machen (1 Min)

20. Auf der `/projects`-Seite → **Neues Projekt**
21. Wähle „Gaisbach 13" als Template (lädt 150 Termine zum Spielen) oder
    ein leeres Projekt mit beliebig vielen Häusern/Wohnungen.
22. Speichern → du bist automatisch **Owner** dieses Projekts.

## Schritt 7 — Andere Bauleiter einladen

Es gibt zwei Wege:

**A) Magic-Link, dann manuell ins Projekt:**
1. Bauleiter X loggt sich auf der App-URL ein (Magic-Link an
   `vorname.nachname@hofmann-haus.com`). Profil entsteht automatisch.
2. Du als Owner musst ihn als Member zum Projekt zufügen — derzeit per SQL
   im Supabase-Editor:
   ```sql
   INSERT INTO project_members (project_id, user_id, role)
   SELECT '<projektId>', id, 'bauleiter' FROM profiles WHERE email = '<email>';
   ```
   (UI-Form für „weitere Bauleiter einladen" ist Phase 5+.)

**B) Per-Projekt-Einladung gleich beim Setup:**
Aktuell legt der Setup-Wizard nur den ersten User als Owner an. Im Phase 5+
kann hier eine Multi-Select-Liste hin.

## Schritt 8 — Echte Daten

- `data/contacts.csv` mit den echten Hofmann-Handwerkern befüllen + `pnpm seed:contacts`
- Erstes echtes Projekt anlegen (oder das Sample löschen + neu anlegen)
- Plan hochladen (PDF), Pin droppen, Mangel anlegen — fertig.

---

## Trouble-Shooting

| Problem | Ursache | Fix |
|---|---|---|
| Magic-Link kommt nicht | Site URL nicht gesetzt | Schritt 4 erneut |
| 500-Fehler nach Login | DATABASE_URL falsch | Vercel Settings → Env Vars |
| RLS-Fehler "permission denied" | Migration 0001 nicht durchgelaufen | SQL-Editor erneut ausführen |
| Foto-Upload bricht ab | Storage-Bucket fehlt / Policy falsch | Migration 0002 erneut |
| Voice-Input fehlt | Browser ohne SpeechRecognition | Chrome/Edge mobil oder Safari ≥14.5 |
| Push fail mit 403 | GitHub-App-Permissions | siehe OQ-011 in `OPEN_QUESTIONS.md` |

Für tieferen Kontext: `docs/DECISIONS.md` D-013 (RLS-Strategie), D-018 (was
in Phase 5 noch fehlt) und `docs/UX_AUDIT.md` (was wir gebaut haben und
bewusst weggelassen).
