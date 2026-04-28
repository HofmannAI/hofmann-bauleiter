# PROGRESS

Single source of truth fürs Resumen. Erste Aktion jeder Session: diese Datei lesen. Letzte Aktion: aktualisieren.

---

## Aktueller Stand

**Phase**: Phase 1 — Foundation
**Datum**: 2026-04-28

### Erledigt
- [x] `MASTER_SPEC.md` und `reference/prototype.html` gelesen
- [x] Branch `claude/setup-docs-secrets-WMSDP` erstellt
- [x] `docs/SECRETS.md` angelegt (gitignored) — Supabase-Keys + 7 Bauleiter-Emails
- [x] `docs/DECISIONS.md` mit 12 Entscheidungen
- [x] `docs/OPEN_QUESTIONS.md` mit 10 offenen Fragen
- [x] `.gitignore` (inkl. `docs/SECRETS.md`)

### Nächster konkreter Schritt
Phase 1.1 — SvelteKit + Tailwind + Drizzle Scaffold:
1. `package.json`, `svelte.config.js`, `tailwind.config.ts`, `tsconfig.json`
2. Tailwind-Theme aus Prototype-Tokens (red, ink, paper, …)
3. `src/lib/db/schema.ts` (Drizzle)
4. `src/app.html` mit Fonts (Archivo, Inter, JetBrains Mono)
5. `.env.example`
6. CI: `.github/workflows/ci.yml`
7. Erstes Commit: `chore: initial scaffold`

### Kontext für nächste Session
- Branch: `claude/setup-docs-secrets-WMSDP`
- Supabase Projekt: `prauunvyjkjvyzizhoqm.supabase.co` (siehe SECRETS)
- 7 Bauleiter-Emails sind seedbar (siehe SECRETS)
- Prototype-Datenstrukturen zu portieren:
  - `CHECKLISTS` → `src/lib/seed/checklists.ts` (Zeile 348-1099 in prototype.html)
  - `SAMPLE_GAISBACH` → `src/lib/seed/gaisbach.ts` (Zeile 1100-1260)
  - `TASK_COLORS` → Tailwind-Theme + `gewerke.color`
