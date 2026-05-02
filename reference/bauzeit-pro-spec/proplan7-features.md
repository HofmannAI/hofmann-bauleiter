# pro-Plan 7 — Feature-Spec (Inspirationsquelle)

Dies ist die Feature-Übersicht des Profi-Bauzeit-Tools "pro-Plan 7" 
(älter als 10 Jahre, deutscher Markt). Dient als Inspirationsquelle für
die Hofmann Bauleiter App — KEIN Pflichtenheft. Features die nicht zur
Mission "Bauzeit + Mängel + Verknüpfung" passen, ignorieren.

## Plananlage und Grundbedienung

Neue Pläne werden über Symbol, Strg+N oder den Start-Assistenten 
angelegt. Beim Anlegen werden Projektnummer, Projekttitel, Profil, 
Bundesland-Kalender, Projektzeitraum und Bearbeiter festgelegt; optional
dient ein bestehender Plan als Vorlage, der automatisch auf das aktuelle
Datum übertragen wird. Vorgänge und Balken können per Strg+C/Strg+V 
innerhalb eines Plans oder zwischen geöffneten Plänen kopiert werden.

## Vorgangsbalken erzeugen und bearbeiten

Vorgangsbalken entstehen mit der Maus durch Aufziehen im Kalender oder 
über die Eingabe von Dauer/Start/Ende in der Tabelle. Änderungen am 
Startdatum verschieben den Vorgang, Änderungen am Ende verlängern bzw. 
verkürzen ihn. Balken lassen sich per Drag-and-Drop verschieben, am Rand
mit der Maus verlängern/verkürzen, einzeln oder mehrfach (Rechteck mit 
Shift) markieren. Tastatur-Navigation: Tab, Pfeiltasten, Enter im 
Editier/Auswahl-Modus, Strg+Enter für Sprung in dieselbe Spalte.

## Balkentypen

- Standard-Vorgangsbalken — einzelne Arbeitsphasen
- Sammelbalken — gruppieren untergeordnete Vorgänge unter einem Dach 
  (bis zu 9 Ebenen verschachtelbar, auf-/zuklappbar)
- Multi-Balken — mehrere Vorgänge in einer Zeile (parallele/überlappende
  Arbeiten)
- Segmentbalken — Balken mit Unterbrechungen (Alt+Klick erzeugt Pause)
- Meilensteine — Dauer 0, ggf. als fixierter Meilenstein für kritische
  Pfade

Per Kontextmenü Vorgänge in Sammel- oder Multivorgänge ein- und 
ausgliedern.

## Texte, Farben, Formatierung

Balkentexte können links, rechts, über, unter oder im Balken 
positioniert werden — als freier Text oder verknüpft mit einem 
Tabellenfeld (Vorgangsname, Startdatum, etc.). Eine globale 
Balkentextverknüpfung lässt sich im Profil festlegen. Farben auf 
Balken, Sammelbalken, ganze Zeilen, einzelne Tabellenzellen oder 
Textpassagen anwendbar. Schriftart, -größe, -farbe über 
Formatierungsleiste änderbar; Standardschrift global einstellbar.

## Stilverwaltung

In der Stilverwaltung lassen sich wiederverwendbare Vorgangsformate 
(Balkenfarbe, Schraffur, Balkentyp, Tabellenvorbelegungen) als Stile 
speichern und in Stilgruppen organisieren (bis zu 999 Stile pro Gruppe).
pro-Plan liefert eine Stilbibliothek mit Gewerken aus Tiefbau, Rohbau, 
Ausbau, Architektur, Freianlagen, Elektrotechnik, Heizung/Sanitär, 
Gleisbau und Aufzug/Fördertechnik. Stile per Doppelklick auf markierte 
Zeilen oder leere Zeilen anwendbar.

## Verknüpfungen und Terminlogik

Verknüpfungen werden mit der Maus durch Ziehen vom Vorgängerende zum 
Nachfolger erzeugt — mit Strg gehalten ohne automatisches Verschieben. 
Möglich sind Ende-Anfang (EA), Anfang-Anfang (AA), Ende-Ende (EE) und 
Anfang-Ende (AE) mit positiver oder negativer Wartezeit (in 
Arbeits- oder Kalendertagen). Pufferzeiten werden automatisch berechnet
und angezeigt. Verknüpfungen über Eigenschaften-Register, Vorgängerfeld
(Vorgangsnummer + Kürzel wie EA) oder Verknüpfungsanzeige bearbeitbar. 
"Verknüpfte hervorheben" zeigt alle abhängigen Vorgänge eines 
markierten Balkens.

## Kalenderfunktionen

Der Kalender steuert Arbeitstage, Feiertage, Urlaub, Sperrungen und 
Sonderregeln. Im Kalenderdialog: Bundesland, Tagestypen, Arbeitszeiten 
einstellbar. Ausnahmen erlauben einzelne Tage umzuwidmen (Samstag als 
Arbeitstag oder umgekehrt), mehrere Tage über Shift-Auswahl als 
Urlaub/Sperrung markierbar. 6-Tage-Woche durch Aktivieren der Samstage. 
Eingebettete Kalender wirken nur im aktuellen Plan.

## Notizen und Infoboxen

Zu jedem Vorgang beliebig viele Notizen mit Termin, Bearbeiter und 
Erledigungsvermerk; Datum und Uhrzeit der Erstellung automatisch. 
Notizen pro Vorgang, projektweit oder einzeln druckbar (auch als PDF). 
Infoboxen sind frei platzierbare Textfenster im Kalender mit 
Überschrift, mehrzeiligem formatierbarem Text, 
Hintergrundfarbe/Füllmuster und Druckoption; einem Vorgang zugeordnet 
(mit verschoben) oder frei platziert.

## Soll-Ist-Vergleich, kritischer Pfad und Statuslinien

Über Rückmeldedialog: tatsächlicher Start, Fortschritt in Prozent, 
Rückmeldedatum erfassbar. Soll-Ist-Darstellung zeigt oben den Soll-, 
unten den Ist-Balken (gestrichelt für Prognose). Kritischer Pfad über 
Ansicht aktiviert: Vorgangsketten ohne Puffer rot umrandet; mehrere 
kritische Pfade über fixierte Meilensteine möglich. Statuslinien 
(Prognose, Rückmeldung, Abweichung, max. Abweichung) als platzsparende 
Alternative — grüne Punkte für termingerecht, rote für negative 
Prognose.

## Layer- und Hintergrundverwaltung

Layertechnik erlaubt verschiedene Ebenen innerhalb einer Projektdatei 
anzulegen, ein-/auszublenden und zu aktivieren. Historylayer speichern 
nicht-editierbare Momentaufnahmen eines Planungsstands. 
Hintergrundverwaltung erlaubt beliebige Rechteckbereiche im Kalender 
farblich zu hinterlegen — mit Bezeichnung, Farbe, 
Vorder-/Hintergrund-Anzeige, Zeilen- und Datumsbereich, optionaler 
Überschrift.

## Lesezeichen und Änderungsanzeige

Lesezeichen markieren ganze Zeilen (horizontal über Infospalte) oder 
einzelne Tage im Kalender (vertikal). Verschiebbar, farblich anpassbar,
über Lesezeichen-Verwaltung organisiert. Änderungsanzeige protokolliert
beim Verschieben verknüpfter Vorgänge die Auswirkungen auf alle 
abhängigen Vorgänge — inklusive Visualisierung mit Phantom-Balken vor 
und Vollbalken nach der Verschiebung.

## Drucken, PDF und E-Mail

Druck und Vorschau über Drucksymbol oder Strg+P. Einstellbar: Drucker, 
Formular, Papierformat (A4/A3, Hoch/Querformat), Zeitbereich (alles, 
optimal, optimal pro Seite, dynamisch ab heute, manuelle Daten) und 
Darstellungsoptionen (Layer, Lesezeichen, Faltmarken, Linien, 
Spaltenbreite, heutiger Tag). PDFs direkt aus Vorschau erzeugbar — 
öffnen oder per E-Mail versenden mit automatisch vorgeschlagenen 
Empfängern aus den Unternehmern. Grafiken aus anderen Programmen oder 
dem Browser per Strg+C/Strg+V in die Druckvorschau einfügbar.

## Profile, Formulare, Legenden

Profile definieren Tabellenstruktur (Spalten, Datentypen, Position, 
Sichtbarkeit, Datenverknüpfung mit Balken, Hinweistext). Global 
gespeichert oder in der Projektdatei eingebettet. Profiltypen: 
Bauzeitenplan, SiGe-Plan, SiGe-Unterlage, Projektplan, MS-Project, 
Zeit-Wege-Planung, benutzerspezifisch. Formulare innerhalb eines 
Profils steuern Ausdruck (Felder links/rechts vom Balkenplan, 
Seitenränder, Kopf-/Fußzeilen, Adresse, Logo, Legende). Legenden 
erklären Farben und Symbole, gedruckt am unteren Plan-Rand, in der 
Vorschau verschiebbar und skalierbar.

## Logo, Adressen, Archivierung

Firmenlogo (JPEG, BMP, PNG) hinterlegbar, automatisch auf Ausdrucken. 
Empfohlene Breiten: ~30mm hoch, 40mm quadratisch, 50-60mm quer. 
Archivierung speichert Planstände innerhalb der Projektdatei statt 
vieler "Plan_v3_final.xyz"-Dateien: temporärer Stand beim Öffnen 
automatisch, manuelle Archivierungen über "Speichern unter — Plan 
hinzufügen" mit Kommentar. Archivstände nicht editierbar, aber druckbar.

## Schnittstellen

MS-Project-Schnittstelle (kostenpflichtig in pro-Plan): Import 
(Öffnen-Dialog mit Umwandlungsfenster) und Export (Speichern unter — 
MS-Project-Format). Adressen und Unternehmer per Drag-and-Drop aus 
Outlook, pro-Report oder interner Adressverwaltung auf Vorgänge 
ziehbar. SiGe-Positionen an pro-SiGe übergebbar.

## Wichtige Neuerungen in pro-Plan 7

- Projektende-Linie (zeigt am weitesten rechts liegenden Balken)
- Horizontale Orientierungslinien
- Projektweite Markierungs-Sichtbarkeit
- Office-angelehntes Datei-Overlay
- Toggle-Buttons statt Checkboxen
- Standardmäßig rechts angeordnete Seitenmenüs
- Platzsparende Balkentexte
- Individualisierbare Termin-Erinnerungen
- Vorgangsspaltenoverlay (zeigt beim horizontalen Navigieren die 
  Vorgangsbezeichnung im Kalender)
- Schräge Verknüpfungslinien als Alternative zu orthogonalen
- Versionsanzeige in Kopfzeile
- Automatischer Bearbeiter aus Windows-Benutzernamen
- Windows-Jump-List der zuletzt geöffneten Projekte
- Sauberes vertikales Verschieben ohne Leerzeilen
- Multi-Select und Drag-and-Drop von Stilen
