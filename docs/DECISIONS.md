# DECISIONS

Jede nicht-offensichtliche Entscheidung mit Begründung. Damit der Mensch (oder die nächste Session) nicht raten muss.

---

## D-001 — Bauleiter-Email-Pattern

Der Spec-Pattern `vorname.nachname@hofmann-haus.com` wurde durch die vom User
bestätigten Adressen verifiziert. Bei den Bauleitern, deren Nachnamen unklar
waren, wurden folgende Annahmen getroffen (vom User bestätigt):

- Jonas → **Hofmann** (`jonas.hofmann@hofmann-haus.com`)
- Marc → **Langer** (`marc.langer@hofmann-haus.com`)
- Dorian → **Hartmann** (`dorian.hartmann@hofmann-haus.com`)
- Simon → **Müller** (`simon.müller@hofmann-haus.com`) — mit Umlaut

**Annahme**: Bei Simon Müller wird die Umlaut-Adresse 1:1 in `profiles.email`
gespeichert. Falls Magic-Link nicht zustellbar ist, in OPEN_QUESTIONS klären.

## D-002 — Supabase Key-Format

Supabase verwendet die neuen Key-Prefixe (`sb_publishable_…` / `sb_secret_…`)
statt der alten JWT-basierten `anon`/`service_role`-Tokens. Funktional identisch.

**Entscheidung**: Variablennamen bleiben semantisch (`SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) — nur die Werte tragen die neuen Prefixe.
Der `@supabase/supabase-js`-Client akzeptiert beide Formate transparent.

## D-003 — TabBar mit 6 Tabs auf Mobile

Spec verlangt 6 Tabs. Statt einen zu verstecken (würde Auffindbarkeit zerstören)
ist die Bottom-Tabbar ab <640px horizontal scrollbar, ab ≥640px alle sichtbar.
Gegenüber Spec-Vorschlag "Aktivität ins Topbar-Menü" hat das den Vorteil, dass
Aktivitäts-Tab eine echte Liste ist (auf Baustelle wichtig: "Was war heute?")
und keine Menü-Auswahl rechtfertigt.

## D-004 — Realtime via Supabase Postgres Changes

Statt Broadcast-Channels nutzen wir `postgres_changes` auf `checklist_progress`,
`defects`, `tasks` mit Filter `project_id=eq.<id>`. Liefert konsistente Diffs
ohne Eigen-Logik.

## D-005 — Photo-Storage Pfade

Einheitliches Schema: `<bucket>/<project_id>/<entity>/<entity_id>/<photo_id>.jpg`
- `checklist-photos/<project_id>/<progress_id>/<photo_id>.jpg`
- `defect-photos/<project_id>/<defect_id>/<photo_id>.jpg`
- `plans/<project_id>/<plan_id>.pdf`
- `musterdetails/<project_id>/<image_id>.jpg`

## D-006 — Sheet-Komponente statt separater Routes

Editoren (Checklist-Item, Task, Defect) sind Bottom-Sheets, keine eigenen
Routen. URL-State für Tabs/Filter, aber Sheets sind ephemer (Svelte 5 `$state`).
Vorteil: kein Page-Flicker, kein Scroll-Verlust, identisches UX zum Prototype.

## D-007 — Working Days

`addWorkingDays`/`workingDaysBetween` skipped Sa+So. Keine Feiertage in v1
(Spec-decision). Baden-Württemberg-Feiertage könnten in Phase 5 als JSON-Liste
ergänzt werden.

## D-008 — Drizzle ORM mit Supabase

Wir nutzen Drizzle für Schema/Migrations und Queries. Der Supabase-Auth-Layer
bleibt aber im `auth`-Schema von Supabase (FK auf `auth.users`). Drizzle
greift via `postgres-js` Driver direkt zu (Service-Role im Server,
Anon mit RLS im Client wird via supabase-js eingeschränkt).

## D-009 — RLS-Policy-Template

Alle Projekt-bezogenen Tabellen erhalten:
```sql
USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()))
```
`gewerke` und `checklists`/`checklist_items` (Stammdaten) sind read-only für
alle authed Users.

## D-010 — PDF-Generation client-seitig

`pdf-lib` läuft im Browser. Vorteil: keine Server-Last, keine Storage-Round-Trip
nötig. Nachteil: bei vielen Fotos kurz CPU-Last auf Mobile. Für ≤30 Mängel ok.
Falls später schwerere Reports: Server-Action mit @sparticuz/chromium auf Vercel.

## D-011 — Mailto-Limitation transparent kommunizieren

`mailto:` kann keine Anhänge tragen. UX: PDF wird vor Öffnen heruntergeladen,
Toast erklärt: "PDF wurde gespeichert. In Outlook bitte anhängen." Kein Versuch,
das per JS-Hack zu umgehen.

## D-012 — Prototype-Daten als TS-Module statt SQL-Seeds

`CHECKLISTS` und `SAMPLE_GAISBACH` aus `prototype.html` werden als
`src/lib/seed/checklists.ts` und `src/lib/seed/gaisbach.ts` portiert. Vorteil:
typsicher, kein SQL-Quoting-Hell. Beim Seed-Run werden sie via Drizzle insertet.

## D-013 — RLS-Policies explizit pro Tabelle (kein dynamisches SQL)

Der erste Wurf von `0001_rls_and_triggers.sql` hatte einen `DO $$ FOREACH …`-
Block, der per `format()` Policy-SQL pro Tabelle generierte. Postgres validiert
Spalten-Referenzen aber schon beim PARSE (nicht erst beim runtime-`CASE`-Eval),
also fliegt z.B. `houses.house_id` (existiert nicht — `house_id` gehört zu
`apartments`) sofort raus.

**Entscheidung**: keine Policy-Generation-Loops mehr. Jede Tabelle bekommt ihr
eigenes explizites `CREATE POLICY`-Statement mit der korrekten USING-Klausel
basierend auf ihrem realen Schema (siehe `0000_…sql`). Für Tabellen ohne
direktes `project_id` (`apartments`, `checklist_photos`, `task_dependencies`,
`task_apartment_progress`, `defect_photos`, `defect_history`) wird via
`EXISTS (SELECT 1 FROM <parent>)`-Subquery auf die Membership des
übergeordneten Projekts geprüft.

Außerdem: Migration ist in `BEGIN;`/`COMMIT;` gewrapped, damit bei einem
Fehler nichts halb angelegt wird, und beginnt mit `DROP POLICY IF EXISTS`
für alle Policies, damit Re-Runs nach partial fail idempotent sind.

Auch 0002 (storage policies) wurde auf 4 explizite `CREATE POLICY`-Statements
umgeschrieben — vorher format-loop, jetzt eine Policy pro Bucket.
