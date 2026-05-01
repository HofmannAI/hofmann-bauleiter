# OPEN QUESTIONS

Dinge, die nur ein Mensch beantworten kann. Bitte nach Build-Ende durchgehen.

---

## OQ-001 — Echte Email-Adressen verifizieren

Vom User initial bestätigt, aber bei einigen Bauleitern war der Nachname unklar.
Folgende Adressen sind **angenommen** (Pattern `vorname.nachname@hofmann-haus.com`)
und müssen real funktionieren, sonst kommt der Magic-Link nicht an:

- **Jonas**: `jonas.hofmann@hofmann-haus.com` — angenommen "Hofmann"
- **Marc**: `marc.langer@hofmann-haus.com` — angenommen "Langer"
- **Dorian**: `dorian.hartmann@hofmann-haus.com` — angenommen "Hartmann"
- **Simon**: `simon.müller@hofmann-haus.com` — Umlaut, evtl. nicht zustellbar

**Aktion**: Vor dem Live-Schalten kurz mit jedem Bauleiter testen
(`/login` → magic-link). Falls zurückkommt, Adresse in `seed/profiles.ts`
korrigieren und neu seeden.

## OQ-002 — Simon Müller Umlaut-Adresse

Local-Part einer Email mit Umlaut (`simon.müller@…`) ist RFC-6531 konform,
aber nicht alle SMTP-Server akzeptieren das. Wenn Simon einen Alias
`simon.mueller@hofmann-haus.com` hat → diesen verwenden.

## OQ-003 — Vercel Account / Deploy-Target

Wer hat den Vercel-Account? Wird das Projekt unter `hofmann-haus.vercel.app`
gehostet oder unter Custom Domain (z.B. `bauleiter.hofmann-haus.com`)?
Erforderlich für DNS-Eintrag bzw. Custom-Domain-Verifizierung.

## OQ-004 — Email-Domain-Allowlist in Supabase Auth

Supabase Auth lässt per Default jede Email zu. Für Production sollte es eine
Allowlist auf `*@hofmann-haus.com` geben. Aktuell als seeded `profiles`-Eintrag
gelöst (nur die 7 Emails); aber ohne harte Sperre könnte sich theoretisch
ein Externer mit `random@example.com` anmelden (würde aber kein Projekt sehen
wegen RLS). Härter sperren? → Supabase Edge-Function `before_user_created` Hook.

## OQ-005 — Echte Handwerker-Kontakte

`data/contacts.csv` enthält Dummies (`Mustermann Maler GmbH`). User soll
echte Kontakte (Maler, Fliesenleger, Elektriker, Sanitär, etc.) eintragen
und `pnpm seed:contacts` laufen lassen. CSV-Format ist in README dokumentiert.

## OQ-006 — Hofmann-Haus-Logo als SVG

Wir haben das rote Frame-Logo aus dem Prototype als CSS-Recreation. Für PDFs
und PWA-Icon brauchen wir entweder ein offizielles SVG vom User oder die
CSS-Variante als optimiertes SVG nachgebaut (aktuell letzteres umgesetzt).
Falls offizielles Logo gewünscht, in `static/logo.svg` ersetzen.

## OQ-007 — Bauphysik / Rohbau / Statik-Spezifika

Der Checklisten-Inhalt aus dem Prototype ist Hofmann-spezifisch und sehr
detailliert. Falls einzelne Items nicht mehr aktuell sind oder neue dazu
müssen → CHECKLISTS in `src/lib/seed/checklists.ts` editieren und
`pnpm seed:checklists` laufen lassen.

## OQ-008 — Microsoft Graph API für Auto-Mail-Versand

`mailto:` kann keine Anhänge tragen → PDF muss manuell an Outlook angehängt
werden. Phase 5 könnte M365 Graph API integrieren (Tenant-Admin-Consent
nötig). Wer ist Tenant-Admin? Welche Permissions sind ok?

## OQ-009 — Backup-Strategie Production

Supabase-Free-Tier macht nightly Backups mit 7 Tagen Retention. Reicht das?
Sonst: Pro-Tier ($25/mo) für 30 Tage. User-Entscheidung.

## OQ-011 — GitHub-Push-Permission

Der lokale Build-Container kann nicht auf den Remote pushen:

```
remote: Permission to HofmannAI/hofmann-bauleiter.git denied to HofmannAI.
fatal: ... 403
```

Auch die GitHub-MCP-Integration hat nur Read-Scope (`create_branch` → 403
"Resource not accessible by integration"). Der gesamte Branch
`claude/setup-docs-secrets-WMSDP` ist lokal commitet (alle Phasen 1, 2 und
große Teile Phase 3) — er muss vom User selbst gepusht werden:

```bash
git fetch  # holt nichts neues, da nur lokaler State existiert
git push -u origin claude/setup-docs-secrets-WMSDP
```

oder via Repository-Owner mit Write-Token. Anschließend kann der Draft-PR
gegen `main` geöffnet werden mit Titel "Phase 1+2: Foundation, Checklisten,
Bauzeitenplan-Engine, Aufgaben" — Body-Vorschlag siehe `docs/PROGRESS.md`.

## OQ-010 — DSGVO / AV-Vertrag mit Supabase

Frankfurt-Region ist DSGVO-konform, aber AV-Vertrag (Auftragsverarbeitung)
muss noch unterzeichnet werden (Supabase Dashboard → Settings → Compliance).

## OQ-012 — Browser-Push-Notifications

In Phase 5+: Service-Worker mit `push`-Event, VAPID-Keys generieren
(`web-push` library), Backend-Endpunkt für Subscriptions speichern + bei
relevanten Events (Mangel ändert sich, Daily-Digest) push schicken.

Frage an User: Welche Events sollen pushen? Vorschlag (per Bauleiter
opt-in Settings):
- "Wenn ein Mangel mit ich = Created-By Status ändert"
- "Wenn Aufgabe heute fällig ist"
- "Wenn jemand mich in Notiz erwähnt" (Phase 5+)

## OQ-013 — Handwerker-Feedback via Public-Token-Link

Workflow: Bauleiter sendet PDF (heute), Handwerker bekommt extra einen
Magic-Link mit Limited-Token. Klickt Link → sieht eigene Mängel als Liste
mit "Erledigt"-Button + Foto-Upload. Bauleiter sieht in App: "Hans Mustermann
hat M-001 als erledigt markiert + Foto gesendet."

Fragen:
- Wie viele Tokens pro Mangel? Einmal-Use oder gleicher Link für alle Mängel?
- Soll Handwerker auch kommentieren können oder nur erledigt-markieren?
- Token-Lifetime (1 Woche? 30 Tage? bis manuell widerrufen?)

Phase 5+. Komplette anonyme-Auth-Säule mit eigener RLS-Schicht.

## OQ-014 — Email-Versand für Notifications

Wenn in-App-Notifications und Push reichen → keine Email nötig.
Sonst: SMTP (Postmark, SendGrid) oder M365 Graph. Daily-Digest um 7:00
mit allen offenen Mängeln/Aufgaben. → Cron via Vercel Cron-Jobs oder
Supabase Edge-Functions.

Aufwand ~1 Tag. Phase 5+.

## OQ-021 — QR-Freimeldung Public-Web-Link (Migration 0012 reserviert)

In Runde 3 vorgesehen als PR „QR-Freimeldung". Wurde übersprungen
weil Voraussetzungen fehlten:

1. **`RESOLUTION_HMAC_SECRET`** ENV-Variable für signierte Tokens.
   Setzen mit `openssl rand -hex 32`. Vercel Settings → Environment
   Variables (Production + Preview).
2. **Rate-Limiter-Infrastruktur**: Upstash Redis oder eigene
   `rate_limit`-Tabelle in Supabase. Pragmatischer Ansatz für
   den Anfang: in-memory rate limit pro Server-Instanz mit
   Hinweis dass das pro Vercel-Edge-Region zurückgesetzt wird.
3. **`PUBLIC_APP_URL`** ENV-Variable für QR-Code-Generierung
   (Default `https://hofmann-bauleiter.vercel.app`).

Migration-Nummer **0012** ist explizit freigelassen für diesen Zweck.
Postgres akzeptiert Lücken in der Migrations-Numerierung problemlos.

Spec siehe Master-Prompt Runde 3, PR #19. Kurz:
- Public-Route `/m/{token}` ohne Login
- Token-Format: `base64url(payload).base64url(hmac_sha256(payload))`,
  Payload `{contact_id, project_id, exp}`, Default-Expiry 90 Tage
- Liste aller offenen Mängel pro contact × project
- Status wählen (freigemeldet / abgelehnt / klärung) + optional Foto
- Submit erzeugt Vorgang AN, wird im Bauleiter-UI sichtbar

Aufwand ~1 Tag, in Phase 5+.

## OQ-022 — Mangel-Detail Tab-Layout

In Runde 3 vorgesehen als PR „Mangel-Detail UX-Politur". Übersprungen.
PR #17 (VOB-Vorgänge) hat zwei Vorgangs-Timelines unterhalb der Liste
eingebaut → wichtigster Use-Case abgedeckt.

Vollständiger Tab-Layout-Refactor (Beschreibung / Fotos / Vorgänge AN /
Vorgänge AG / Anhänge / Verlauf) wäre risky:
- große Diff über die zentrale Detail-Seite
- hoher Regression-Risk auf inline-edit, Foto-Annotation, neuer
  Mängelrüge-Sheet
- begrenzter UX-Gewinn (Page ist heute schon scroll-bar)

Wenn das in Phase 5+ angegangen wird: vorher Screenshots der heutigen
Seite anfertigen, alle existierenden Funktionen als Test-Plan
auflisten, dann inkrementell Tab-für-Tab portieren.

## OQ-023 — Räume-Editor (Strukturbaum)

PR #19 fügt `rooms`-Tabelle hinzu, aber kein UI zum Anlegen/Editieren.
Heute nur per SQL Editor (siehe SESSION_SUMMARY für Snippet).

Phase 5+ Empfehlung: Settings-Tab pro Apartment mit Räume-Liste +
Inline-Edit, plus Bulk-Insert „Standard-Räume für alle Apartments
übernehmen".

## OQ-024 — Briefkopf-Settings-Editor

PR #17 fügt `firma_settings`-Tabelle mit Default Hofmann hinzu.
Editor unter `/[projectId]/einstellungen` oder global unter
`/admin/firma` fehlt.

Felder: name, strasse, plz_ort, telefon, email, web, geschäftsführer,
ust_id, bank/iban/bic, logo (storage upload), unterzeichner1/2.

Aufwand: 1 Tab + Form + Server-Action. ~3h.
