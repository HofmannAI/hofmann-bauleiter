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

## D-014 — Deutsche Bauspezifika

In der UI durchgängig deutsche Fachsprache, ohne Anglizismen:
- "Mängel" (nicht "Defects") — nur in Code-Variablen + DB-Spalten
- "Wiedervorlage" für Follow-up-Datum
- "Abnahme" für formelles Sign-off-Verfahren (Phase 5+ als eigener Workflow)
- "Mängelrüge" als Synonym für Mangelmeldung — in PDF-Cover-Page-Titel
- "Bauleiter" für Site Manager (durchgängig)
- "Gewerk" für Trade — UI-Label überall
- "Wohnung" für Apartment — DB heißt `apartments`, UI immer "Wohnung"
- "Haus" für Building — DB `houses`, UI "Haus" mit Roman-Zahlen oder Buchstaben
- "Termin" für Task — UI "Termin" oder "Bauzeiten-Termin", DB `tasks`
- "Stand: <Datum>" auf PDF-Cover (nicht "Status:" oder "As-of:")
- "VOB-konform" — wird nicht beworben, da kein Anwalts-Sign-off; Phase 5+

Einzige englische Kürzel im UI:
- "AT" für Arbeitstage in Bauzeit (Standard-Abkürzung in DE-Bauplänen)
- Status-Codes intern: `open`, `sent`, `acknowledged`, `resolved`, `accepted`,
  `rejected`, `reopened` — UI mappt auf "Offen", "Gesendet", "Bestätigt",
  "Erledigt", "Akzeptiert", "Abgelehnt", "Wiedereröffnet"

## D-015 — Voice-to-Text via Web Speech API (kein Server-Roundtrip)

Spracheingabe in der Mangel-Beschreibung (Phase C1). Web Speech API ist in
Chrome/Edge auf Mobile zuverlässig, in Safari iOS ab 14.5. Deutsche Sprache
`de-DE`. Live-Transcript wird ins Textarea geschrieben.

Fallback: Komponente versteckt sich, wenn der Browser kein `SpeechRecognition`
oder `webkitSpeechRecognition` exposes. Kein OpenAI-Whisper-Server, kein
Cloud-Roundtrip — privacy-by-default. Phase 5+ könnte Whisper-API anbinden für
bessere Qualität bei lauten Baustellen.

## D-016 — Multi-Photo-Sortierung via sort_order Spalte

`defect_photos` bekommt `sort_order int default 0` (Migration 0003). Beim
Anzeigen: ORDER BY sort_order, created_at. Drag-to-Reorder im UI sendet einen
Batch-Update mit neuen Indizes — Cover ist erstes Foto.

## D-017 — Textbausteine als Catalog-Tabelle

`textbausteine` (Migration 0004) ist global per Gewerk, nicht projekt-scoped.
Begründung: VOB-typische Mängel ("Putz nicht eben", "Fugenbild ungleichmäßig")
sind branchenweit standardisiert. Read-only für authed; Pflege via Seed.

## D-018 — Notifications + Handwerker-Feedback in Phase 5+

Aus dem Phase-C-Auftrag bewusst aufgeschoben:

- **Browser-Push-Notifications** brauchen Service-Worker + Backend-Endpunkt
  für VAPID-Keys/Subscriptions. Schlechtes Push-UX ist schlimmer als kein
  Push. → OPEN_QUESTIONS OQ-012.
- **Handwerker-Feedback-Link** mit Token + Limited-View braucht eine
  eigene anonyme-Auth-Säule. → OQ-013.
- **Daily-Digest-Email** braucht SMTP + Cron. → OQ-014.

Fokus stattdessen auf drei DocMa-MM-Features mit sofortigem Mehrwert:
Voice-to-Text, Multi-Photo-Sortierung, Textbausteine.

## D-019 — Abnahme-Protokoll als Sub-Feature des Mängel-Reports

Aus dem Phase-C-Auftrag: "Abnahme starten → Step-by-Step → PDF Abnahmeprotokoll
Wohnung X". Umsetzung: bestehender Mängel-Liste-Filter (Status='resolved' oder
'accepted', Apartment='X') liefert die exakte Filtermenge; "An Handwerker
senden"-Endpoint nutzt jetzt einen alternativen PDF-Cover-Titel "Abnahme-
protokoll" wenn alle ausgewählten Mängel resolved/accepted sind.

Vollwertiger Step-Through-Workflow (jeder Mangel einzeln durchgehen,
Notiz pro Mangel, finale Bestätigungs-Unterschrift) ist Phase 5+ — der
einfache Filter+Report-Pfad deckt 80% des Use-cases.
