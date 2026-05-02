# PROPOSALS.md

Diese Datei sammelt Vorschläge des Autopilots, wenn TODO_AUTOPILOT.md leer wird.
Pro Vorschlag wird zusätzlich ein GitHub-Issue erstellt mit Reaktion-Buttons.

## Format

### V-XXX: <Titel>
**Was:** <2-3 Sätze>
**Wert für Bauleiter:** <konkret>
**Aufwand:** S / M / L (S=<4h, M=4-12h, L=>12h)
**Migration nötig:** Ja / Nein
**Trade-offs / Risiken:** <ehrlich>
**Status:** Pending / Approved / Rejected

## Aktive Vorschlaege

### H-001: Termin-Mängel-Verknüpfung Phase 1

**Hypothese**: Bauleiter Marc fährt zur Abnahme Trockenbau Haus 1. Er will
wissen: "Welche Mängel gehören zu DIESEM Termin?" Heute: Bauzeitenplan öffnen
→ Termin sehen → zu Mängel-Tab wechseln → Gewerk Trockenbau filtern → auf
Datum scrollen → vergleichen. Das sind 6-8 Klicks und ca. 2-3 Minuten pro
Termin-Check. Bei 5 Terminen/Tag = 10-15 Min/Tag verschwendet.
Umgekehrt: Ein Mangel zeigt nicht welcher Termin davon blockiert wird.
Bauleiter muss manuell im Kopf zuordnen — fehleranfällig.

**Lösung**: `defects.task_id` als FK auf `tasks.id`. Jeder Mangel kann einem
Termin zugeordnet werden (über gemeinsames Gewerk automatisch vorgeschlagen).
Task-Detail zeigt verlinkte Mängel-Liste. Mangel-Detail zeigt zugehörigen
Termin mit Plan-Ende-Datum.

**Erfolgsmessung**: "Welche Mängel hat dieser Termin?" von 6-8 Klicks auf
1 Klick (Termin öffnen → Liste da). Mangel-Detail zeigt Termin-Kontext
ohne Recherche. Eliminiert Doppel-Recherche bei Mängel-Bearbeitung.

**Status**: In Arbeit

---

### H-002: Verzug-Ampel im Bauzeitenplan

**Hypothese**: Bauleiter sieht im Gantt-Chart nur Balken ohne Kontext zu
Mängeln. Er muss sich merken oder manuell nachschlagen welche Termine durch
offene Mängel blockiert sind. Bei 150 Terminen pro Projekt ist das unmöglich
— Verzug wird erst erkannt wenn es zu spät ist.

**Lösung**: Gantt-Bar wird rot wenn Termin überfällig UND offene Mängel hat.
Grün wenn alle Mängel erledigt. Tooltip zeigt "N offene Mängel blockieren
Folgegewerk Y".

**Erfolgsmessung**: Verzug-Erkennung von "manuelles Nachschlagen pro Termin"
(~5 Min) auf sofortige visuelle Erkennung (0 Klicks). Bauleiter sieht auf
einen Blick welche Termine Probleme haben.

**Status**: Pending (nach Item 1)

---

### H-003: KPI "Wegen Mängeln verlorene Tage pro Gewerk"

**Hypothese**: Bauleiter und Projektleiter haben keine Übersicht welche
Gewerke den Bauzeitenplan am meisten verzögern. Entscheidungen über
Nachunternehmer-Wechsel oder Vertragsstrafen basieren auf Bauchgefühl statt
Daten.

**Lösung**: Neuer Bar-Chart im Statistik-Dashboard: Differenz zwischen
Plan-Ende des Termins und tatsächlichem Erledigt-Datum aller zugeordneten
Mängel, aggregiert pro Gewerk.

**Erfolgsmessung**: Datenbasierte Aussage "Gewerk X hat Y Tage Verzug
verursacht" ohne manuelles Zusammenrechnen. Grundlage für Nachunternehmer-
Gespräche und VOB-Maßnahmen.

**Status**: Pending (nach Item 2)

## Archiv

(Vergangene Vorschlaege mit Approval-Status.)
