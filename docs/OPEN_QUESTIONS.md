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

## OQ-010 — DSGVO / AV-Vertrag mit Supabase

Frankfurt-Region ist DSGVO-konform, aber AV-Vertrag (Auftragsverarbeitung)
muss noch unterzeichnet werden (Supabase Dashboard → Settings → Compliance).
