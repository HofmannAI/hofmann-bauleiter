# PROGRESS

**BUILD COMPLETE** — `v1.0.0-rc1` (alle Phasen aus `MASTER_SPEC.md`).
Siehe `docs/HANDOFF.md` für Übergabe an die Menschen.

---

## Phasen-Status

| Phase | Tag | Status |
|---|---|---|
| 1 — Foundation | `phase-1-complete` | ✅ |
| 2 — Bauzeitenplan-Engine + Aufgaben | `phase-2-complete` | ✅ |
| 3 — Mängel-Modul | `phase-3-complete` | ✅ |
| 4 — Polish + PWA + Deploy | `v1.0.0-rc1` | ✅ |

## Acceptance pro Phase

### Phase 1 — Acceptance ✅
- [x] Magic-Link → `/projects`
- [x] Setup Wizard → Projekt mit Gaisbach-Sample (150 Termine)
- [x] Checklisten-Module mit Foto-Upload
- [x] Logout/Login-Flow
- [x] Realtime-Sync (postgres_changes auf 4 Tabellen)
- [x] CI grün
- [x] Vercel-Adapter Build OK

### Phase 2 — Acceptance ✅
- [x] Drag-to-Move mit Diff-Vorschau
- [x] Critical-Path-Toggle
- [x] Per-Apartment Drill-Down
- [x] Aufgaben-Tab mit Filtern/Gruppierung
- [x] 10/10 Engine-Unit-Tests grün

### Phase 3 — Acceptance ✅
- [x] PDF-Plan-Upload + PDF.js-Viewer + Pin-Drop
- [x] Mangel-CRUD mit Auto-`M-###`
- [x] Foto-Upload + Verlauf
- [x] Filter (Status × Gewerk × Apt)
- [x] PDF-Mängelreport pro Gewerk + mailto
- [x] Status-Workflow + Verlauf
- [x] Aufgaben integriert Mängel mit Deadline
- [x] Gewerk-Checklisten je Wohnung (Bruders Punkt)
- [x] Musterdetails-Galerie

### Phase 4 — Acceptance ✅
- [x] Storage-Buckets-Migration mit RLS
- [x] PWA-Manifest + theme-color
- [x] README (Deutsch)
- [x] HANDOFF.md mit Setup-Anleitung
- [x] Tag `v1.0.0-rc1`

## Was hier nicht steht

Siehe `docs/OPEN_QUESTIONS.md` — Punkte, die nur ein Mensch entscheiden kann
(Email-Verifikation, Vercel-Account, AV-Vertrag, Push-Token).

## Falls die Build-Pipeline neu starten muss

```bash
pnpm install
pnpm db:migrate && pnpm seed && pnpm seed:contacts
pnpm dev
```

Tests: `pnpm test` (Unit) — Engine + Calendar.
Type-Check: `pnpm check` — 0 Errors, einige Svelte-State-Warnings (intentional).
Build: `pnpm build` — OK auf @sveltejs/adapter-vercel.

BUILD COMPLETE.
