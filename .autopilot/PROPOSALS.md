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

---

### V-001: Auto-Verknüpfung Mangel→Termin via Gewerk+Wohnung

**Was:** Wenn ein neuer Mangel erstellt wird und Gewerk + Wohnung gesetzt sind,
automatisch den passenden Termin vorschlagen (gleiche gewerkId, passender
Zeitraum). 1-Klick-Bestätigung statt manuelles Dropdown-Suchen.
**Wert für Bauleiter:** Eliminiert den manuellen Schritt der Termin-Zuordnung.
Bei 5-10 Mängeln/Tag spart das 2-3 Minuten pro Mangel.
**Aufwand:** S
**Migration nötig:** Nein
**Trade-offs / Risiken:** Falsche Auto-Zuordnung bei mehreren Terminen pro
Gewerk — deshalb nur Vorschlag, nicht automatisch setzen.
**Status:** Pending

---

### V-002: Mängel-Filter "nur Mängel die Termin X blockieren"

**Was:** Im Bauzeitenplan ein Klick auf einen rot-markierten Termin zeigt
direkt die gefilterte Mängel-Liste (nur Mängel mit taskId = diesen Termin).
Deep-Link vom Gantt-Tooltip in die Mängel-Liste mit vorgesetztem Filter.
**Wert für Bauleiter:** Direkter Sprung von "dieser Termin ist blockiert" zu
"das sind die konkreten Mängel die ich lösen muss".
**Aufwand:** S
**Migration nötig:** Nein
**Trade-offs / Risiken:** Keine nennenswerten. Rein clientseitige Filter-Logik.
**Status:** Pending

---

### V-003: Verzug-Benachrichtigung per Telegram-Bot

**Was:** Täglicher Cronjob prüft alle Termine mit endDate < heute UND offenen
Mängeln. Sendet Telegram-Push an Bauleiter: "3 Termine in Verzug wegen
Mängeln: Trockenbau Haus 1 (2 Tage), Elektro Haus 2 (5 Tage), ...".
**Wert für Bauleiter:** Proaktive Warnung statt reaktive Entdeckung.
Bauleiter weiß morgens VOR der Fahrt zur Baustelle was kritisch ist.
**Aufwand:** M
**Migration nötig:** Nein (nutzt bestehende Telegram-Infrastruktur)
**Trade-offs / Risiken:** Zu viele Benachrichtigungen könnten nerven.
Lösung: Schwellenwert (nur ab 2+ Tagen Verzug), Snooze-Funktion.
**Status:** Pending

---

### V-004: Mangel-Drag-to-Termin im Gantt-Chart

**Was:** Im Bauzeitenplan einen Mangel aus einer Seitenleiste auf einen
Gantt-Balken ziehen um die Verknüpfung herzustellen. Visuelles,
schnelles Zuordnen statt Dropdown-Suche im Mangel-Detail.
**Wert für Bauleiter:** Besonders bei Bulk-Zuordnung nach Baustellenbegehung
(10-20 Mängel einem Termin zuordnen) deutlich schneller als einzeln öffnen.
**Aufwand:** M
**Migration nötig:** Nein
**Trade-offs / Risiken:** Touch-DnD auf Mobile schwierig (kollidiert mit
Scroll). Desktop-only Feature oder Mobile-Alternative als Batch-Zuordnung.
**Status:** Pending

---

### V-005: Folgegewerk-Warnung bei Mangel-Erstellung

**Was:** Wenn ein Mangel einem Termin zugeordnet wird und dieser Termin
Nachfolger hat (task_dependencies), zeigt die App: "Achtung: Dieser Mangel
kann Folgegewerk [Maler] um bis zu X Tage verzögern." Basiert auf dem
Gantt-Engine-Propagationsalgorithmus.
**Wert für Bauleiter:** Sofortige Konsequenz-Transparenz. Bauleiter versteht
die Auswirkung eines Mangels auf die Gesamtplanung BEVOR er eskaliert.
**Aufwand:** M
**Migration nötig:** Nein (nutzt bestehende task_dependencies + engine.ts)
**Trade-offs / Risiken:** Kann übermäßig alarmierend wirken. Lösung:
nur bei Terminen die bereits >80% durch sind oder <7 Tage vor endDate.
**Status:** Pending

## Archiv

### H-001 — Termin-Mängel-Verknüpfung Phase 1
**Status**: Implementiert (PR #25)

### H-002 — Verzug-Ampel im Bauzeitenplan
**Status**: Implementiert (PR #26)

### H-003 — KPI verlorene Tage pro Gewerk
**Status**: Implementiert (PR #27)
