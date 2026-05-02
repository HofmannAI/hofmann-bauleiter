# PROPOSALS.md — Bauzeit-Pro Roadmap

Vollständige Feature-Roadmap basierend auf pro-Plan 7 Spec-Analyse.
Priorisierung nach Wert für mobile Bauleiter × Machbarkeit in Web-App.

---

## P1 — Heute Nacht implementieren

### BP-01: Meilensteine im Gantt-Chart
**Quelle:** Spec "Balkentypen — Meilensteine"
**Was:** Tasks mit Dauer 0 (durationAt=0 oder startDate=endDate) als
Diamant-Symbol rendern statt als 8px-Mini-Balken. Klickbar, verschiebbar,
in Dependencies nutzbar. Kein neues DB-Feld nötig — rein visuelle
Erkennung über startDate===endDate.
**Wert für Bauleiter:** Abnahme-Termine, Behörden-Freigaben, Übergabe-
Deadlines sind im Plan sofort als fixe Punkte erkennbar. Aktuell gehen
sie unter den normalen Balken unter.
**Aufwand:** S (2-3h)
**Migration nötig:** Nein
**Mobile:** Ja — Diamant ist auch auf 375px gut erkennbar
**Out of Scope:** Nein
**Priorität:** P1

---

### BP-02: Bundesland-Kalender (Feiertage BW)
**Quelle:** Spec "Kalenderfunktionen"
**Was:** Baden-Württemberg Feiertage in calendar.ts einbauen. isWeekend()
wird zu isNonWorkday() mit Feiertags-Check. Gantt rendert Feiertage
visuell wie Wochenenden. Alle Datumsberechnungen (addWorkingDays,
workingDaysBetween, Gantt-Engine propagate) respektieren Feiertage.
**Wert für Bauleiter:** KORREKTHEIT. Ohne Feiertage sind alle
Terminberechnungen falsch. Heiligabend, Karfreitag, Fronleichnam —
der Plan sagt "3 AT" aber real sind es 4 wegen Feiertag.
**Aufwand:** M (3-4h)
**Migration nötig:** Nein (rein clientseitige Logik)
**Mobile:** Ja
**Out of Scope:** Nein
**Priorität:** P1

---

### BP-03: Balken-Resize per Drag (Dauer ändern)
**Quelle:** Spec "Vorgangsbalken — am Rand verlängern/verkürzen"
**Was:** Rechte Balkenkante per Drag ziehen um endDate zu ändern. Linke
Kante um startDate zu ändern (Dauer bleibt gleich = Move). Bereits
vorhanden: Drag-to-Move (ganze Bar). Neu: Resize-Handles an den Enden
(6px Hitzone). Touch: Long-Press aktiviert Resize-Mode analog zu Move.
**Wert für Bauleiter:** "Elektro dauert 2 Tage länger" — aktuell muss
man ins Detail-View navigieren, Datum manuell eingeben, zurück. Mit
Resize: direkt im Gantt die Dauer anpassen. Spart ~30sec pro Änderung,
bei 5 Änderungen/Tag = 2.5 Min.
**Aufwand:** M (3-4h)
**Migration nötig:** Nein
**Mobile:** Eingeschränkt (Touch-Resize braucht präzise Finger-Platzierung,
aber Long-Press-Mode macht es nutzbar)
**Out of Scope:** Nein
**Priorität:** P1

---

### BP-04: Inline-Termin-Erstellung im Gantt
**Quelle:** Spec "Vorgangsbalken — Aufziehen im Kalender"
**Was:** Doppelklick/Long-Press auf leeren Bereich im Gantt-Chart öffnet
Quick-Create-Sheet: Name, Gewerk, Start, Ende. Termin wird sofort
erstellt und als Balken sichtbar. Touch: Long-Press auf leere Zeile.
**Wert für Bauleiter:** Termine direkt im Gantt anlegen statt über
separaten Dialog oder Sample-Import. "Estrich Haus 2 — nächste Woche
Montag bis Freitag" direkt einzeichnen.
**Aufwand:** M (3-4h)
**Migration nötig:** Nein (nutzt bestehende tasks-Tabelle)
**Mobile:** Ja — Sheet-basiertes Quick-Create passt gut
**Out of Scope:** Nein
**Priorität:** P1

---

### BP-05: Pufferzeit-Anzeige (Float/Slack)
**Quelle:** Spec "Verknüpfungen — Pufferzeiten automatisch berechnet"
**Was:** Für jeden Task den "Total Float" berechnen: wie viele Tage kann
der Task sich verspäten ohne das Projektende zu gefährden? Anzeige als
dünne gestrichelte Linie am Balkenende, Zahl im Tooltip ("Puffer: 3 AT").
Kritischer Pfad = Tasks mit Float 0.
**Wert für Bauleiter:** "Kann ich Estrich 2 Tage nach hinten schieben
ohne dass das Gesamtprojekt leidet?" — aktuell muss man das im Kopf
rechnen. Mit Puffer-Anzeige: sofort sichtbar.
**Aufwand:** M (2-3h für Engine-Erweiterung + UI)
**Migration nötig:** Nein
**Mobile:** Ja — Tooltip-Info reicht, dünne Linie optional
**Out of Scope:** Nein
**Priorität:** P1

---

### BP-06: Sticky Vorgangsspalte beim Horizontalen Scrollen
**Quelle:** Spec "Neuerungen — Vorgangsspaltenoverlay"
**Was:** Beim horizontalen Scrollen im Gantt-Timeline-Bereich bleibt die
Vorgangsliste (Name-Spalte links) sichtbar. Aktuell: man scrollt nach
rechts und verliert die Zuordnung "welcher Balken gehört zu welchem
Termin?". Fix: CSS position:sticky oder synchronized scroll.
**Wert für Bauleiter:** Fundamentale UX-Verbesserung. Ohne sticky Spalte
ist die Gantt-Ansicht bei >20 Terminen nur eingeschränkt nutzbar.
**Aufwand:** S (1-2h)
**Migration nötig:** Nein
**Mobile:** Ja — besonders wichtig auf schmalem Viewport
**Out of Scope:** Nein
**Priorität:** P1

---

### BP-07: Bauzeitenplan PDF-Export
**Quelle:** Spec "Drucken, PDF und E-Mail"
**Was:** Button "PDF Export" generiert einen A4-Landscape oder A3 PDF
des aktuellen Gantt-Ausschnitts. Enthält: Projekt-Header, Firmenlogo
(aus firma_settings), Vorgangsliste + Gantt-Bars, Legende mit Gewerk-
Farben, Datum "Stand: heute". Nutzt bestehende pdfjs-Infrastruktur
oder canvas-basierte Generierung.
**Wert für Bauleiter:** "Hier der aktuelle Plan" — an Handwerker mailen,
in der Baustellenbesprechung ausdrucken, dem Bauherrn zeigen. Aktuell
nur Screenshot möglich.
**Aufwand:** L (4-6h)
**Migration nötig:** Nein
**Mobile:** Eingeschränkt (PDF-Download auf Mobile, kein Print-Dialog)
**Out of Scope:** Nein
**Priorität:** P1

---

## P2 — Nächste Iteration

### BP-08: Soll-Ist Dual-Balken-Darstellung
**Quelle:** Spec "Soll-Ist-Vergleich"
**Was:** Statt nur gestrichelter Baseline-Linie: oben Soll-Balken (dünn,
Baseline), unten Ist-Balken (normal). Fortschritts-Prognose als
gestrichelter Verlängerung des Ist-Balkens.
**Wert:** Sofort sichtbar ob Termin vor/hinter Plan
**Aufwand:** M | **Migration:** Nein | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P2

---

### BP-09: Statuslinien (kompakte Fortschritts-Indikatoren)
**Quelle:** Spec "Statuslinien"
**Was:** Vertikale Linie im Gantt die pro Zeile einen grünen (OK) oder
roten (Verzug) Punkt zeigt. Platzsparender als farbige Balken.
**Wert:** Auf einen Blick den Projekt-Health-Status sehen
**Aufwand:** M | **Migration:** Nein | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P2

---

### BP-10: Rückmeldung: Tatsächlicher Start + Fortschritt
**Quelle:** Spec "Rückmeldedialog"
**Was:** Pro Task: actualStartDate, actualEndDate, progressPct. Dialog
zum schnellen Rückmelden. Differenz zu Plan-Daten berechnen.
**Wert:** Ist-Tracking für Bauherren-Berichte
**Aufwand:** M | **Migration:** Ja (ADD COLUMN actual_start, actual_end)
**Mobile:** Ja | **OoS:** Nein
**Priorität:** P2

---

### BP-11: Kalender-Ausnahmen (Urlaub, Betriebsferien, Sperrung)
**Quelle:** Spec "Kalenderfunktionen — Ausnahmen"
**Was:** Projekt-spezifische Nicht-Arbeitstage definieren (z.B.
Betriebsferien 23.12-06.01). In calendar.ts berücksichtigen.
**Wert:** Realistische Terminplanung über Weihnachten/Ostern
**Aufwand:** M | **Migration:** Ja (neue Tabelle calendar_exceptions)
**Mobile:** Ja | **OoS:** Nein
**Priorität:** P2

---

### BP-12: Segmentbalken (Unterbrechungen)
**Quelle:** Spec "Balkentypen — Segmentbalken"
**Was:** Balken mit visuellen Lücken für geplante Unterbrechungen
(z.B. "Estrich gießen — 5 Tage trocknen — Estrich schleifen").
**Wert:** Realistischere Darstellung von Gewerken mit Trocknungszeiten
**Aufwand:** L | **Migration:** Ja (segments JSON auf tasks)
**Mobile:** Eingeschränkt | **OoS:** Nein
**Priorität:** P2

---

### BP-13: Hintergrundbereiche (Bauphasen)
**Quelle:** Spec "Hintergrundverwaltung"
**Was:** Farbige Bereiche im Gantt-Hintergrund: "Rohbau" (blau),
"Ausbau" (grün), "Außenanlagen" (orange) als visuelle Phasen-Marker.
**Wert:** Orientierung im Plan — "wir sind gerade in der Ausbauphase"
**Aufwand:** M | **Migration:** Ja (Tabelle gantt_backgrounds)
**Mobile:** Ja | **OoS:** Nein
**Priorität:** P2

---

### BP-14: Projektende-Linie
**Quelle:** Spec "Neuerungen — Projektende-Linie"
**Was:** Vertikale Linie am spätesten Termin-Ende. Analog zur
Heute-Linie aber für das Projekt-Ende.
**Wert:** "Wie weit sind wir vom Ziel?" auf einen Blick
**Aufwand:** S | **Migration:** Nein | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P2

---

### BP-15: "Verknüpfte hervorheben"
**Quelle:** Spec "Verknüpfungen — Verknüpfte hervorheben"
**Was:** Klick auf einen Balken hebt alle direkt und transitiv
verknüpften Vorgänge hervor (andere werden gedimmt).
**Wert:** "Was hängt an diesem Termin?" — Impact-Analyse
**Aufwand:** S | **Migration:** Nein | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P2

---

### BP-16: Änderungsanzeige mit Ghost-Bars
**Quelle:** Spec "Änderungsanzeige"
**Was:** Beim Drag-Move: transparenter "Ghost" des Balkens an der
alten Position. Visuell sehen wo der Balken herkam.
**Wert:** Besseres Gefühl bei Verschiebungen
**Aufwand:** S | **Migration:** Nein | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P2

---

### BP-17: Balkentext-Positionen
**Quelle:** Spec "Texte, Farben, Formatierung"
**Was:** Option pro Balken: Text links, rechts, über, unter oder im
Balken. Web-Variante: globale Einstellung mit 3 Modi
(innen/rechts/aus).
**Wert:** Bei schmalen Balken ist der Text abgeschnitten.
Rechts-Positionierung löst das.
**Aufwand:** S | **Migration:** Nein | **Mobile:** Eingeschränkt
**OoS:** Nein
**Priorität:** P2

---

## P3 — Später

### BP-18: Multi-Balken (mehrere Vorgänge pro Zeile)
**Quelle:** Spec "Balkentypen — Multi-Balken"
**Was:** Parallele Arbeiten in einer Zeile anzeigen.
**Wert:** Kompaktere Darstellung bei überlappenden Gewerken
**Aufwand:** L | **Migration:** Nein (UI-only) | **Mobile:** Eingeschränkt
**OoS:** Nein
**Priorität:** P3

---

### BP-19: Lesezeichen (Zeilen- und Datums-Marker)
**Quelle:** Spec "Lesezeichen"
**Was:** Farbige Marker auf bestimmten Zeilen oder Kalendertagen.
**Wert:** "Hier muss ich nochmal draufschauen"
**Aufwand:** M | **Migration:** Ja | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P3

---

### BP-20: Infoboxen im Kalender
**Quelle:** Spec "Infoboxen"
**Was:** Frei platzierbare Textboxen im Gantt-Bereich.
**Wert:** Kommentare direkt im Plan statt nur in Notizen
**Aufwand:** L | **Migration:** Ja | **Mobile:** Eingeschränkt
**OoS:** Nein
**Priorität:** P3

---

### BP-21: Erweiterte Notizen mit Termin + Erledigung
**Quelle:** Spec "Notizen"
**Was:** Strukturierte Notizen pro Task mit Fälligkeitstermin,
Bearbeiter-Zuweisung, Erledigt-Toggle.
**Wert:** Task-bezogene Aufgaben direkt im Plan tracken
**Aufwand:** M | **Migration:** Ja | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P3

---

### BP-22: Layer-System (über Filter hinaus)
**Quelle:** Spec "Layer- und Hintergrundverwaltung"
**Was:** Benannte Layer mit Tasks die ein-/ausgeblendet werden können.
Web-Variante: erweiterte Filter-Presets mit "View-Speicherung".
**Wert:** Verschiedene Perspektiven auf denselben Plan
**Aufwand:** M | **Migration:** Ja | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P3

---

### BP-23: Plan-Archivierung mit Kommentaren
**Quelle:** Spec "Archivierung"
**Was:** Baselines erweitern: nicht nur Datum-Snapshots sondern
vollständige Plan-Stände mit Kommentar, druckbar.
**Wert:** "Zeig mir den Plan von vor 3 Wochen" für Bauherren
**Aufwand:** M | **Migration:** Nein (Baselines reichen, ggf. extend)
**Mobile:** Ja | **OoS:** Nein
**Priorität:** P3

---

### BP-24: Legende/Farberklärung im Ausdruck
**Quelle:** Spec "Legenden"
**Was:** Automatisch generierte Legende unter dem Gantt-PDF:
Gewerk-Farbe + Name Zuordnung.
**Wert:** Handwerker verstehen den Plan ohne Erklärung
**Aufwand:** S (Teil von BP-07 PDF) | **Migration:** Nein
**Mobile:** N/A (nur PDF) | **OoS:** Nein
**Priorität:** P3 (mit BP-07 zusammen)

---

### BP-25: Logo auf Ausdrucken
**Quelle:** Spec "Logo"
**Was:** Firmenlogo aus firma_settings auf PDF-Exports.
**Wert:** Professionelle Optik bei Bauherren-Berichten
**Aufwand:** S (Teil von BP-07 PDF) | **Migration:** Nein
**Mobile:** N/A | **OoS:** Nein
**Priorität:** P3 (mit BP-07 zusammen)

---

### BP-26: Gewerk-Style-Picker (Quick-Apply)
**Quelle:** Spec "Stilverwaltung"
**Was:** Beim Anlegen eines Termins: Gewerk wählen → Farbe, Name-
Prefix, defaultPerApartment automatisch gesetzt.
Web-Variante: 20 Hofmann-Gewerke als Quick-Select statt 999 Stile.
**Wert:** Konsistente Farben im Plan, weniger Tipparbeit
**Aufwand:** S | **Migration:** Nein | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P3

---

### BP-27: Horizontale Orientierungslinien
**Quelle:** Spec "Neuerungen — Horizontale Orientierungslinien"
**Was:** Dünnere oder dickere Trennlinien zwischen Gewerk-Gruppen.
**Wert:** Visuelles Strukturelement für große Pläne
**Aufwand:** S | **Migration:** Nein | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P3

---

### BP-28: Termin-Erinnerungen
**Quelle:** Spec "Neuerungen — Individualisierbare Termin-Erinnerungen"
**Was:** Push-Benachrichtigungen N Tage vor Terminende.
**Wert:** Nicht verpassen wenn ein Termin bald fällig ist
**Aufwand:** M | **Migration:** Ja | **Mobile:** Ja | **OoS:** Nein
**Priorität:** P3

---

## P4 — Verworfen / Out of Scope

### BP-29: MS-Project Import/Export
**Quelle:** Spec "Schnittstellen — MS-Project"
**Begründung:** Explizit ausgeschlossen in CLAUDE.md ("Externe
Integrationen NICHT ohne explizite Aufforderung"). Zudem: Hofmann
nutzt kein MS-Project, der Import-Aufwand steht in keinem Verhältnis.
**Priorität:** P4 — verworfen

---

### BP-30: Outlook Drag-and-Drop / Kontakte
**Quelle:** Spec "Schnittstellen — Adressen aus Outlook"
**Begründung:** CLAUDE.md schließt Outlook-Integration explizit aus.
Kontakte sind bereits im Kontakte-Modul gepflegt.
**Priorität:** P4 — verworfen

---

### BP-31: Windows Jump-List
**Quelle:** Spec "Neuerungen — Windows-Jump-List"
**Begründung:** Web-irrelevant. PWA-Shortcuts wären Äquivalent aber
zu niedriger Wert für den Aufwand.
**Priorität:** P4 — verworfen

---

### BP-32: SiGe-Plan / SiGe-Unterlage
**Quelle:** Spec "Profile — SiGe-Plan, SiGe-Unterlage"
**Begründung:** Arbeitssicherheitsplanung ist ein separates Tool.
Nicht Mission-relevant (Bauzeit + Mängel + Verknüpfung).
**Priorität:** P4 — verworfen

---

### BP-33: 999 Stile + Stilgruppen
**Quelle:** Spec "Stilverwaltung — 999 Stile"
**Begründung:** Overkill. 20 Gewerke mit fester Farbe reichen.
Web-Variante: Gewerk = Stil. Custom-Farbe pro Task bereits vorhanden.
**Priorität:** P4 — verworfen

---

### BP-34: Druckvorschau mit Grafik-Einfügen
**Quelle:** Spec "Drucken — Grafiken per Strg+V einfügbar"
**Begründung:** Desktop-Paradigma. Web: PDF ist final, keine
interaktive Vorschau mit Clipboard-Paste.
**Priorität:** P4 — verworfen

---

### BP-35: Zeit-Wege-Planung
**Quelle:** Spec "Profile — Zeit-Wege-Planung"
**Begründung:** Spezialisiertes Diagramm für Linienbaustellen
(Straßen, Tunnel). Nicht relevant für Hofmann Wohnungsbau.
**Priorität:** P4 — verworfen

---

## Zusammenfassung

| Prio | Anzahl | Items |
|------|--------|-------|
| P1   | 7      | BP-01 bis BP-07 |
| P2   | 10     | BP-08 bis BP-17 |
| P3   | 11     | BP-18 bis BP-28 |
| P4   | 7      | BP-29 bis BP-35 (verworfen) |
| **Gesamt** | **35** | |

---

## Archiv — Vorherige Session

### H-001 — Termin-Mängel-Verknüpfung Phase 1
**Status**: Implementiert (PR #25)

### H-002 — Verzug-Ampel im Bauzeitenplan
**Status**: Implementiert (PR #26/29)

### H-003 — KPI verlorene Tage pro Gewerk
**Status**: Implementiert (PR #27/29)

### V-001 bis V-005 — Bauzeit-Mängel-Vertiefung
**Status**: Pending (nach Bauzeit-Pro Roadmap)
