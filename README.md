# Hofmann Bauleiter-Cockpit

Multi-User Baustellen-Management für **Hofmann Haus GmbH**, Schwäbisch Hall.
Mobile-first PWA mit Checklisten, Bauzeitenplan, Aufgaben, Mängel-Modul.

> Build-Status: **v1.0.0-rc1**. Alle vier Phasen aus `MASTER_SPEC.md` umgesetzt.
> Siehe `docs/CHANGELOG.md` für Feature-Liste.

---

## Was ist das?

Eine Web-App, mit der die Bauleiter von Hofmann Haus auf der Baustelle:
- Hofmann-Checklisten je Projekt/Haus/Wohnung abhaken (mit Foto-Beweis)
- Den Bauzeitenplan einsehen, verschieben (mit Constraint-Propagation), kritischen Pfad sehen
- Termine pro Wohnung tracken (Maler/Elektro/Fliesenleger pro Wohnung)
- Mängel mit Pin auf Plan markieren, an Handwerker als PDF senden (via Outlook)
- Kontakte verwalten und Musterdetails ablegen

Alle Daten leben in Supabase (Postgres + Auth + Storage + Realtime), Frankfurt-Region.

## Wer hat Zugriff?

Aktuell hardcoded auf 7 Bauleiter (siehe `docs/SECRETS.md`):
- Jonas Hofmann · Laurenz Hofmann · Marc Langer · Dorian Hartmann
- Johannes Wagner · Simon Müller · Dietmar Hofmann

Login per Magic-Link an `vorname.nachname@hofmann-haus.com`.

## Erstanmeldung

1. App öffnen: `https://<app-domain>/login`
2. Eigene Email-Adresse eingeben → "Magic-Link senden"
3. Email öffnen → Link klicken → Du landest direkt im Projekt-Picker

Der erste Login legt automatisch dein Profil an (DB-Trigger `handle_new_user`).
Bis dich Laurenz oder ein anderer Owner als Mitglied zu einem Projekt hinzufügt,
siehst du noch keine Projekte (RLS).

## Funktionen pro Tab

| Tab | Was du tust |
|---|---|
| **Übersicht** | Hero mit Projekt-Stats; Schnellzugriff auf alle Module; Aktivitäts-Feed |
| **Checklisten** | Hofmann-Standard-Checklisten je Projekt/Haus/Wohnung abhaken, Notizen, Fotos |
| **Bauzeit** | Gantt mit Zoom (Tag/Woche/Monat), Termine per Drag verschieben, Diff-Vorschau, Kritischer Pfad |
| **Aufgaben** | Was ist offen / überfällig? Filter nach Heute / Diese Woche / 14 Tage |
| **Mängel** | Pin-on-Plan Mängel, Status-Workflow, Foto-Doku, PDF-Report pro Gewerk + mailto-Versand |
| **Aktivität** | Was haben die anderen Bauleiter heute getan? Realtime-Stream |

Über das Topbar-Menü erreichst du außerdem:
- **Kontakte** (`/[projectId]/kontakte`)
- **Musterdetails** (`/[projectId]/musterdetails`)
- **Gewerk-Checklisten je Wohnung** (`/[projectId]/gewerk-checklisten`)

## Sample-Projekt "Gaisbach 13"

Beim Anlegen eines Projekts kannst du das Template "Gaisbach 13" wählen → erstellt
2 Häuser × 8 Wohnungen + 150 Bauzeiten-Termine. Praktisch zum Testen.

## Backup / Export

Im Frontend noch nicht eingebaut. Manuell via Supabase:
- Datenbank: Supabase Dashboard → Database → Backups (täglich, 7 Tage Retention)
- Photos: Storage → Bucket Download (siehe `OQ-009` für Pro-Tier-Empfehlung)

## Kontakte austauschen

Die mitgelieferten "Mustermann"-Dummies sollen ersetzt werden:

```bash
# data/contacts.csv editieren — UTF-8, eine Zeile pro Kontakt
# Header: gewerk,company,contact_name,email,phone,address
pnpm seed:contacts
```

Achtung: Das ersetzt **alle globalen Kontakte** (project_id NULL).
Projekt-spezifische Kontakte (im UI über `/[projectId]/kontakte` angelegt)
bleiben unberührt.

## Bei Problemen

→ an **Laurenz** wenden. Vorher prüfen:
- Bug-Reports + Status: `docs/PROGRESS.md` und `docs/OPEN_QUESTIONS.md`
- Architektur-Entscheidungen: `docs/DECISIONS.md`
- Vergangene Änderungen: `docs/CHANGELOG.md`
- Spec, an die wir uns gehalten haben: `MASTER_SPEC.md`
- UX-Bibel (Original-Prototype): `reference/prototype.html`

---

## Tech Stack (kurz)

| Layer | Stack |
|---|---|
| Frontend | SvelteKit 2 + Svelte 5 (Runes) + TypeScript strict |
| Styling | Tailwind 3 + Design-Tokens aus prototype.html |
| DB / Auth / Storage | Supabase (Postgres, Magic-Link, Buckets, Realtime) |
| ORM | Drizzle (typsicher, leichte Migrations) |
| PDF | `pdf-lib` (Generierung), `pdfjs-dist` (Plan-Viewer) |
| Tests | Vitest (Engine-Unit-Tests), Playwright (E2E geplant) |
| Deploy | Vercel (Frankfurt-Edge) |

Node 20 LTS, pnpm 9.

## Lokale Entwicklung

```bash
git clone <repo>
cd hofmann-bauleiter
pnpm install

# .env aus docs/SECRETS.md anlegen (NIEMALS committen)
cp .env.example .env
# Werte aus docs/SECRETS.md eintragen

pnpm db:migrate     # erste Tabellen + RLS
pnpm seed           # gewerke, checklisten, gewerk-templates, dummy-kontakte
pnpm seed:contacts  # echte Kontakte aus data/contacts.csv

pnpm dev            # http://localhost:5173
```

Magic-Link funktioniert lokal nur, wenn die App-URL bei Supabase
in `Authentication → URL Configuration → Site URL` als zulässig eingetragen ist
(z.B. `http://localhost:5173`). Sonst kommt der Link mit falscher Redirect-URL.

## Tests

```bash
pnpm test       # Vitest unit (Gantt-Engine, Calendar)
pnpm check      # TypeScript + Svelte
pnpm build      # Production-Build (Vercel-Adapter)
```

CI: GitHub Actions führt typecheck + test + build bei jedem PR.

## Deploy

```bash
vercel link
vercel --prod
```

Produktions-Env-Vars im Vercel-Dashboard setzen — entsprechen denen aus
`.env`. **`SUPABASE_SERVICE_ROLE_KEY` ist server-only**, niemals als
PUBLIC_-Variable.

## Lizenz / Rechte

Hofmann Haus GmbH intern. Nicht öffentlich.
