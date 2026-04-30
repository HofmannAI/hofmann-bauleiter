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

## OQ-015 — Musterdetails-Modul Tab-Position

Master-Prompt fragt explizit: eigener Tab „Musterdetails" oder Untermenü
unter „Übersicht"? Aktuell hat der Tabbar 6 Tabs (Übersicht, Checklisten,
Bauzeit, Aufgaben, Mängel, Aktivität) plus Topbar-Menü-Items für
Kontakte/Musterdetails/Gewerk-Checklisten.

Vorschlag: **Untermenü unter Übersicht** statt 7. Tab — die Musterdetails
sind ein Vor-Ort-Workflow, nicht etwas was Bauleiter alle 30s im Tabbar
tappen will. Das hält Mobile sauber.

Wenn anders gewünscht: kurz Bescheid geben, ich baue um in PR #10.

## OQ-016 — QR-Code-Freimeldung: HMAC-Secret-Strategie

Public-Route `/m/<id>?t=<token>` braucht einen Server-Secret zum HMAC-
signieren der Tokens. Optionen:

1. **Neue env-var `RESOLUTION_HMAC_SECRET`** (32+ Zeichen random) —
   einfach, aber muss in Vercel + lokalem .env hinterlegt werden, plus
   bei Rotation re-deploy nötig (alle alten Tokens werden invalid).
2. **Supabase signed-URL für eine 'token'-Spalte** — Supabase erzeugt
   und verifiziert für uns. Limit: max 1 Jahr Expiry, sehr lang hashed.
3. **Eigene Random-Tokens in `defects.resolution_token`** speichern
   (kein HMAC, nur Compare). Simpler, aber DB-Round-Trip pro Request
   — bei vielen Pings auf den Public-Link spürbar.

Empfehlung: Option 1. Aufwand ~1h für Migration + Endpunkt + Form.
Voraussetzung: User legt Secret an + Vercel-env-var.

Hat heute Stop-Condition getriggert (externe Credential), deshalb
PR #11 nicht angefangen.

## OQ-017 — Portfolio-Dashboard: Rolle „GF" ja/nein?

Master-Prompt fragt: rolle `profiles.role` neue Spalte für GF? Oder
„alle Mitglieder von >2 Projekten sehen Portfolio"?

Pragmatisch:
- `profiles.role` existiert schon mit Enum `'admin' | 'bauleiter'`
- **`role = 'admin'`-Profile sehen alle Projekte im Portfolio**, andere
  sehen nur ihre Memberships
- Default-Heuristik bei ambig: Laurenz ist Admin, Rest Bauleiter
- Über CLI/SQL kann das später angepasst werden

Alternative: separater `role = 'gf'` als drittes Enum. Aber Admin reicht.

Bestätigung gewünscht bevor PR #12 angefangen wird.
