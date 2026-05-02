# Session Summary — Nacht-Schicht 2026-05-02

## Bilanz

| Item | PR | Status | Migration | Tests |
|------|-----|--------|-----------|-------|
| Termin-Mängel-Verknüpfung Phase 1 | #25 | CI grün, wartet auf Review-Approval | 0015 (deployed) | 6 |
| Verzug-Ampel im Bauzeitenplan | #26 | CI pending, basiert auf #25 | keine | 5 |
| KPI verlorene Tage pro Gewerk | #27 | CI pending, basiert auf #26 | keine | 5 |

**Gesamt**: 3 PRs, 1 Migration (deployed), 16 Unit-Tests, 0 neue Fehler.

## Merge-Reihenfolge

1. PR #25 mergen (braucht 1 Review-Approval wegen Branch Protection)
2. PR #26 rebased auf main nach #25-Merge
3. PR #27 rebased auf main nach #26-Merge

## Technische Details

### PR #25: Termin-Mängel-Verknüpfung
- Migration 0015: `defects.task_id` FK + Index (bereits auf Supabase deployed)
- Schema, Backend-Queries, Task-Detail UI (Mängel-Liste), Mangel-Detail UI (Termin-Dropdown + Link)
- Gewerk-basierte Vorsortierung im Termin-Dropdown

### PR #26: Verzug-Ampel
- Gantt-Bar rot + Puls wenn überfällig + offene Mängel
- Gantt-Bar grün wenn alle Mängel erledigt
- Tooltip mit Mängel-Zähler

### PR #27: KPI verlorene Tage
- Neuer Bar-Chart im Statistik-Dashboard
- Server-seitiger JOIN tasks+defects mit GROUP BY
- Live-Verzug für offene Mängel (zählt bis heute)

## Blockierer

- Branch Protection erfordert 1 Review-Approval. Self-Approval nicht möglich.
- Laurenz muss PR #25 approven, dann können #26 und #27 folgen.
