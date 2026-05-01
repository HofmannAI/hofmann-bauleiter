# PROGRESS

**post-rc2 Session** (heute):
- PR #5 (gemerged): /checklisten FROM-clause-Fix
- PR #6 (gemerged): /checklisten/[id] empty-progress IN()-Fix
- PR #7 (offen, **Migration 0007**): Plan-Crop für Mängel — 400×300 JPEG
  beim Pin-Setzen, im PDF-Bericht oberhalb der Fotos
- PR #8 (gemerged, KEINE Migration): Gantt-Drag&Drop-Dependencies
  (MS-Project-Niveau, FS/SS/FF/SF, Mobile-Connector-Mode, Edit-Popover)
- PR #9 (gemerged): Design-Politur — EmptyState-Komponente, kontextspezifische
  Empty-States in Aufgaben + Mängel
- PR #11 (gemerged): CI pnpm version conflict fix

**Hotfix post-rc2 #2**: `/checklisten/<id>` 500er behoben — leeres
`progress[]` produzierte `IN ()`-Syntax-Fehler in `loadChecklistDetail`.
Fix: `inArray()` mit Length-Guard. Regression-Test eingebaut. (PR #6)

**Hotfix post-rc2 #1**: `/checklisten` 500er behoben — falsche FROM-clause
in 2 Aggregat-Queries (`listChecklistsWithProgress`). (PR #5)

**BUILD COMPLETE v1.0.0-rc2** — Migration-Fix, Premium-UX, DocMa-Features, Deploy-Ready.

Vorgänger: `v1.0.0-rc1` (alle 4 Phasen aus `MASTER_SPEC.md` umgesetzt).
Diese rc2 ist eine deutliche Hochstufung in UX-Politur und DocMa-MM-Niveau-Features.

---

## Was rc2 gegenüber rc1 bringt

### Migration-Fix (Phase A)

Schon in rc1 als PR #2 nachgereicht und gemerged. In rc2 zusätzlich:
- `0003_defect_photo_sort_order.sql` für Multi-Photo-Reihenfolge
- `0004_textbausteine.sql` für Standard-Mängel-Texte

Alle Migrations transaktional, idempotent, ohne dynamic-format-Loops.

### Premium-UX (Phase B, 3 Loops)

Loop 1: `docs/UX_AUDIT.md` mit per-page audit + Token-Vokabular.

Loop 2 — Implementation:
- Glass-Topbar + Glass-Tabbar (backdrop-blur 20px)
- Tab-Pill-Indicator (red-soft Hintergrund auf aktivem Tab)
- Sheet-Komponente (`Sheet.svelte`) mit Frosted-Top + Pointer-Drag-to-Close
- Spring-Easing-System (`motion.ts`) + Reduced-Motion-Support
- Toast jetzt Glass + scale-fade-Animation
- Plan-Viewer komplett neu: PinPreview-Card mit Foto + Quick-Status-Menu,
  drag-to-move-Pins, per-Gewerk Filter-Chips
- PhotoAnnotator (DocMa-killer): roter Kreis/Pfeil/Freihand/Stempel,
  Speichern als zusätzliches Foto neben Original
- Mängel-Liste mit sticky Status-Group-Headers + Overdue-Tint + Prio-1-Badge
- Aufgaben-Cards mit Overdue-Gradient + Priority-Hervorhebung
- Cmd+K Command-Palette + Vim-Chord-Shortcuts (g+d, g+c, …)
- `docs/SHORTCUTS.md` dokumentiert alle Bindings
- Universal-Press-State (scale 0.975) + Focus-Visible-Polish

Loop 3 — Self-Critique + nachgereicht:
- Hero-Progress-Ring animiert von 0→Target auf Mount
- Activity-Feed mit deterministisch-farbigen Initialen-Avataren
- Bauzeit Bar-Hover-Tooltip (Glass) + pulsierender Today-Dot + Wochenend-Hatch
- Skeleton-Komponente (universell verfügbar)

### DocMa-MM-Features (Phase C — 3 von 6 in rc2, 3 in Phase 5+)

Drinnen:
- **Voice-to-Text**: `VoiceInput.svelte` mit Web Speech API de-DE,
  Mikrofon-Button neben Mängel-Beschreibung
- **Multi-Photo-Sortierung**: `defect_photos.sort_order` (Migration 0003),
  Cover = erstes Foto
- **Textbausteine**: 30 VOB-typische Mängel-Texte pro Gewerk (Migration 0004 +
  Seed), Dropdown im Mängel-Editor mit optgroup pro Gewerk

Aufgeschoben (Phase 5+, in OPEN_QUESTIONS):
- Browser-Push-Notifications (OQ-012)
- Handwerker-Feedback-Public-Link (OQ-013)
- Email-Daily-Digest (OQ-014)
- Vollwertiges Step-Through-Abnahme-Protokoll (D-019: Filter-basierter
  Pfad deckt 80% des Use-cases via PDF-Report)

### Deploy-Vorbereitung (Phase D)

- `vercel.json` mit Frankfurt-Region + Security-Headers + Cache-Policy
- `.env.example` heavy-commented mit Quellenangaben pro Variable
- `docs/HANDOFF.md` ergänzt um **„Live-Schaltung in 10 Minuten"** —
  step-by-step Anleitung mit Screenshots-Anker, Env-Vars-Tabelle,
  Trouble-Shooting

---

## Tags

| Tag | Bedeutung |
|---|---|
| `phase-1-complete` | Phase 1 (Foundation) lokal abgeschlossen |
| `phase-2-complete` | Phase 2 (Engine + Aufgaben) lokal abgeschlossen |
| `phase-3-complete` | Phase 3 (Mängel-Modul) lokal abgeschlossen |
| `v1.0.0-rc1` | Erstes Release-Candidate aller 4 Phasen |
| `v1.0.0-rc2` | rc1 + Premium-UX + DocMa-Features + Deploy-Ready |

---

## Build-Health

- TypeScript strict: 0 errors (12 Svelte-state-warnings sind intentional initial-bindings)
- Vitest unit: 10/10 grün
- Build: @sveltejs/adapter-vercel OK, Frankfurt edge
- Bundle: noch nicht profiled, Lighthouse-Audit Phase 5+

---

## Falls die Build-Pipeline neu starten muss

```bash
pnpm install
# Migrations: 0000 → 0001_rls → 0002_storage → 0003 → 0004 (im SQL-Editor)
pnpm seed && pnpm seed:contacts
pnpm dev
```

Tests: `pnpm test` · Type-Check: `pnpm check` · Build: `pnpm build`

---

## Ende

`docs/HANDOFF.md` ist das Onboarding-Dokument. Alle ausstehenden
User-Entscheidungen stehen in `docs/OPEN_QUESTIONS.md` (14 Punkte).

**BUILD COMPLETE v1.0.0-rc2.**
