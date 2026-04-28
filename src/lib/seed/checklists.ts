/**
 * Checklisten-Daten — ported 1:1 from reference/prototype.html (CHECKLISTS array).
 * Numerieren bleibt aus dem Original. `scope` definiert die Default-Ebene
 * (project / house / apartment).
 *
 * Wenn der User Items ergänzt: hier editieren und `pnpm seed:checklists` laufen lassen.
 * Migrationen passen das catalog auf neue/geänderte Items an (idempotent).
 */
export type ChecklistSection = {
  title?: string;
  items: string[];
};

export type ChecklistSeed = {
  id: string;
  num: string;
  title: string;
  scope: 'project' | 'house' | 'apartment';
  sections: ChecklistSection[];
};

export const CHECKLISTS: ChecklistSeed[] = [
  {
    id: "01", num: "1", title: "Vor Aushub", scope: "project",
    sections: [{ items: [
      "Eine Beweissicherung der Anliegerflächen, Bordsteine, Laternen, etc. wurde durchgeführt.",
      "Baugenehmigung liegt vor. (Roter Punkt)",
      "Die Kampfmittelfreiheit für das Baufeld ist gegeben.",
      "Eine Baugrunduntersuchung / Beprobung wurde durchgeführt — Geologisches Gutachten liegt vor.",
      "Sohle Baugrube und OK Planum wurden festgelegt. (Aushubplan vorhanden)",
      "Baugrube wurde vom Vermesser abgesteckt. Geofixpunkte für GPS-System angebracht (min. 3 Stück — Absprache mit Rohbauer) — Plan von Vermesser ablegen.",
      "Eine Lagerfläche für den Mutterboden wurde festgelegt.",
      "Eine Lagerfläche für den Baugrubenaushub wurde festgelegt — alles abfahren wo nicht benötigt wird!",
      "Die Baugrubensohle und Fundamente wurden vom Geologen abgenommen. Prüfbericht liegt vor.",
      "Die Baustelle wurde sauber für das Nachfolgegewerk hinterlassen. (Nachbegehung/Abnahme durchführen)",
      "Prüfstatik liegt vor."
    ]}]
  },
  {
    id: "02", num: "2", title: "Aushub", scope: "project",
    sections: [{ items: [
      "Vorleistungen (Wasser, Strom, etc.) wurden mit der ausführenden Firma abgestimmt.",
      "Bauvertrag wurde geprüft und mit Leistung abgeglichen — evtl. Nachträge vorab verhandelt und freigegeben.",
      "Genehmigung für Anker von Verbau von Nachbar liegt vor.",
      "Verbaustatik liegt vor.",
      "Alle Schnittstellen zu Nachgewerk (Tiefengründung am Verbaufuß, etc.) wurden vorab geklärt und kommuniziert. (Abstimmung Erdbau und Rohbau)",
      "Eine Absturzsicherung (Bauzaun) wurde angebracht und gegen Windeinwirkung gesichert.",
      "Der Verbau ist kraftschlüssig hinterfüllt — Nachweis von Verbaufirma vorhanden.",
      "Alle Bohrprotokolle und Ankerprotokolle liegen vor.",
      "Eine Lagerfläche für den Baugrubenaushub wurde festgelegt. Es ist zu klären, was für die Außenanlagen benötigt wird — alles abfahren wo nicht benötigt wird.",
      "Die Baugrubensohle wurde vom Geologen abgenommen (Fundamente auch).",
      "Es wurde eine Abnahme sowie eine Dokumentation durchgeführt (Böschungswinkel, Aushubkontur nach Aushubplan, Rampe, …)."
    ]}]
  },
  {
    id: "03", num: "3", title: "Rohbau", scope: "house",
    sections: [
      { title: "1. Gründung", items: [
        "Streifenfundament Gründungssohle (Abnahme Geologe). Größe Fundamente lt. Statik. (Bilder nummerieren und in PDF-Plan beschreiben)",
        "Unterbau fachgerecht eingebaut lt. Plan, Sauberkeitsschicht, Schottertragschicht.",
        "Erdung fachgerecht verlegt lt. Plan, Wanddurchführung für WU zugelassen. Erdungspunkte vorhanden.",
        "Erdung dokumentiert und geprüft. Dokumentation erhalten.",
        "Fugenblech oder Fugendichtband fachgerecht verlegt.",
        "Stärke der Bodenplatte geprüft.",
        "Vertikale Abdichtungsbänder vorhanden lt. Plan (bei weißer Wanne).",
        "Abdichtung der vertikalen und horizontalen Fugen von außen vorhanden.",
        "Fundamente unter Kragplatten im Arbeitsraum bis auf gewachsenen Boden gegründet.",
        "Horizontalsperre (Folie) unter Bodenplatte fachgerecht verlegt."
      ]},
      { title: "2. Entwässerung", items: [
        "Entwässerungssystem (Trenn- oder Mischsystem) laut Entwässerungsplan. Alle Abläufe im UG vorhanden und an der richtigen Stelle.",
        "Die Höhe des Kontrollschachts prüfen laut Plan — (Außenanlagen und Architekt vergleichen).",
        "Leitungen im richtigen Gefälle verlegt: Mindestgefälle 1%, keine 90°-Bögen (2× 45°), keine Unterbögen, Mindestdurchmesser DN 100.",
        "Dokumentation der verlegten Leitungen unter der Bodenplatte.",
        "RW, SW, Drainage an Kanal angeschlossen. Kanalbefahrung liegt vor. Druckprüfung von Schmutzwasserleitungen bis in Kanal liegt vor.",
        "Drainage fachgerecht verlegt — Gefälle ausreichend, Hochpunkt 20 cm unterhalb OK Betonsohle, Rohrscheitel unterhalb OK Betonsohle, Noppenbahn 3-lagig mit Gleitfolie zur Dämmung und Vlies zum Erdreich.",
        "Drainage gegen Rückstau gesichert und revisionsfähig. Drainagekontrollschächte an allen Richtungswechseln vorhanden.",
        "Für Entwässerung unter Bodenplatte Rohre durch Fundamente vorhanden lt. Plan.",
        "Drainagerohre in Filterschotter 8/16 verlegt. Um Filterschotter Geotextil verlegt.",
        "Hinterfüllung der Arbeitsräume fachgerecht verdichtet. Auffüllmaterial laut Vertrag. Verdichtungsnachweise vorhanden.",
        "GOK festgelegt (Höhe der Auffüllung vom Rohbauer) — laut Vertrag."
      ]},
      { title: "3. Versorgungsleitungen", items: [
        "Anträge in Absprache mit Fachplanern gestellt: Wasser, Strom, Medien (Glasfaser/Internet), Nah-/Fernwärme, Gas. Unterlagen/Anträge abgelegt.",
        "Einführungen passend zum Abdichtungssystem geprüft: Futterrohr bei Schwarzer Wanne, Kernbohrung oder KG-Rohr wo wieder ausgebaut wird.",
        "Hauseinführungen mit Versorgern und Tiefbaufirmen abgestimmt (Mehrsparte, Einzeleinführung, Abdichtung, Leerrohre, Lage, …).",
        "Versorgung zwischen den Häusern abgestimmt — Fachplaner, Rohbauer (Vertrag prüfen): Wasser, Strom, Medien, Nah-/Fernwärme, Gas.",
        "Werden weitere Leerrohre benötigt?"
      ]},
      { title: "4. Untergeschoss", items: [
        "Bewehrung UG Bodenplatte lt. Statik (Abnahme Statiker).",
        "Bewehrung TG-Decke lt. Statik (Abnahme Statiker).",
        "Stahlbetonwände ordentlich geschalt. Fuge Wand-Decke verspachtelt. Sockelbereich für Sockelbeschichtung vorbereitet. Dreikantleisten lt. Vertrag eingebaut.",
        "Maße/Anzahl/Lage Bauteilöffnungen, Decken- und Wandaussparungen, Wandschlitze geprüft.",
        "Sperrpappe unter Mauerwerk vorhanden.",
        "Dickbeschichtung fachgerecht ausgeführt: 2K-KMB 2-lagig, 3 mm Schichtdicke trocken, Hohlkehle nach DIN 18533. Ausführungsprotokoll mit Bildern.",
        "Versorgungsleitungen durch UG-Wand abgedichtet.",
        "Dickbeschichtung unter Fuge Wand/Decke TG fachgerecht bis 30 cm unter Fuge. Ergänzung Dickbeschichtung über Schweißbahn + 10 cm.",
        "Lichtschächte fachgerecht montiert. Höhe lt. Plan (Außenanlagen und Architekt). Entwässerung lt. Plan und Detail."
      ]},
      { title: "5. Außenmauerwerk", items: [
        "Fugenbild, Fugenausbildung geprüft (keine Kreuzfugen, Fugen >0,5 mm verschlossen).",
        "Steinqualität (Rohdichte) laut Statik/Schallschutz (Bild von Steinbeschriftung).",
        "Deckenrandauflager unter Stahlbetondecke laut Vertrag eingebaut (Kantenschutz Cipolon).",
        "Meterriss vorhanden in jeder Wohnung und am Aufzug, Höhen geprüft (mit Laser).",
        "Maße Bauteilöffnungen/Aussparungen geprüft.",
        "Mauerwerk lot-, winkel- und waagerecht. Fugen >5 mm mit Mörtel verschlossen. Gleichmäßiger Kleber-/Mörtelauftrag.",
        "Brüstungshöhen geprüft.",
        "Tür- und Fensterhöhen und -breiten kontrolliert."
      ]},
      { title: "6. Innenmauerwerk", items: [
        "Verzahnung mit Edelstahlankern.",
        "Steinqualität (Rohdichte) laut Statik/Schallschutz (Bild von Steinbeschriftung).",
        "Fuge zur Stahlbetondecke geschlossen (bei nichttragenden Wänden, keine kraftschlüssige Verbindung).",
        "Keine Betonüberstände an Deckenuntersicht.",
        "Keine Versätze in den Stahlbetondecken (Untersicht der Halbfertigteile).",
        "Fugenbild, Fugenausbildung okay."
      ]},
      { title: "7. Decken", items: [
        "Bewehrung Decke über EG abgenommen (Abnahme Statiker).",
        "Bewehrung Decke über 1.OG abgenommen (Abnahme Statiker).",
        "Ringgurte, Stürze, Auflager lt. Statik vorhanden.",
        "Einbauteile Aufzug bestellen — Rohbauer bestellt direkt.",
        "Durchbrüche geprüft.",
        "Bodenschlitze geprüft."
      ]},
      { title: "8. Betonfertigteiltreppen", items: [
        "Steigung Treppe prüfen, ob mit Podest übereinstimmt.",
        "Treppe auf Elastomerlager (Schöck Tronsole) gelagert.",
        "Schallentkopplung prüfen (keine Verbindung zu Auflager, Wand, etc.). Treppe muss komplett frei gelagert sein.",
        "Untersicht und Übergang zum Podest. Maximaler Überstand Kante Treppe — Decke Podest 5 mm.",
        "Treppe sitzt parallel zur Wand (Wandabstand prüfen laut Plan). Breite von Treppenauge prüfen (laut Plan)."
      ]},
      { title: "9. Giebelmauerwerk bei Satteldach", items: [
        "Ortstermin mit Zimmermann und Rohbauer vereinbaren und Höhen von Auflager prüfen.",
        "Dämmung auf Giebelwand prüfen.",
        "Nach Aufrichten sämtliche Wände hochgemauert (Brandschutz beachten). Auf Brandwand (Treppenhaus, Wohnungstrennwand) nichtbrennbare Dämmung verlegt.",
        "Stahlstützen untermörtelt.",
        "Ringgurte und Auflager betoniert (laut Statikplan)."
      ]}
    ]
  },
  {
    id: "04", num: "4", title: "Abdichtungsarbeiten", scope: "house",
    sections: [
      { title: "1. Abdichtung Dachflächen", items: [
        "Abstimmung zwischen Abdichter, Zimmerer, Gipser und Flaschner ist erfolgt — Schnittstellen besprochen.",
        "Gefälleplanung liegt vor und entspricht den Vorgaben aus der Bauphysik. Dämmstärke und Wärmeleitgruppe passen mit Bauphysik überein und wurden dokumentiert.",
        "Überlappungen (8 cm) der Schweißbahnen gem. Herstellerangaben ausgeführt — stichprobenartig geprüft.",
        "Alle Anschlüsse an Abläufen/Notabläufen geprüft und sauber ausgeführt. Gefälle der Notabläufe geprüft.",
        "Fertiggestellte Oberflächen auf Beschädigung, Blasenbildung, unsaubere Ausführung geprüft.",
        "Alle Abläufe geprüft. Anstaubleche (bei Notabläufen) und Abdeckungen angebracht.",
        "Sicherung der Dachflächen (Sekuranten) abgestimmt. Nachweis und Bestätigung der Durchführung erhalten.",
        "Alle Bauteile (Lüftung, Dachausstieg, Sekuranten, etc.) mit Flüssigkunststoff bis +15 cm über FFB eingedichtet.",
        "Fenster mit Flüssigkunststoff eingedichtet. Flüssigkunststoff von Fenster auf Beton geführt. Flüssigkunststoff zwischen Mauer und Fenster mind. 15 cm über FFB hochgeführt."
      ]},
      { title: "2. Dachbegrünung und -bekiesung", items: [
        "Belegung Kies/Begrünung abgestimmt. Belegung Dachflächen mit PV beachten. Kies ringsum und um alle Bauteile, –10 cm OK Blechattika, –15 cm zum Dachausstieg. Überdeckung mit Substrat geprüft.",
        "Bilddokumentation der begrünten und bekiesten Flächen durchgeführt.",
        "Lüfterhauben fest angeschraubt (auf Badlüftung montiert; Schmutzwasserentlüftung benötigt keine Hauben).",
        "Abläufe sind nicht verstopft und revisionierbar."
      ]},
      { title: "3. Abdichtung Dachterrassen, Balkone", items: [
        "Ausführung mit Abdichter laut Detail (Architekt) besprochen. Gefälleplanung besprochen.",
        "Betonuntergrund geprüft (keine Kiesnester, trocken, Temperatur). Eignet sich für Schweißbahn.",
        "Bit. Voranstrich und Dampfsperre vollflächig aufgebracht.",
        "Dämmstärken geprüft, stimmen mit Bauphysik überein.",
        "Ausreichendes Gefälle vorhanden (laut Plan).",
        "Hochzug der Abdichtung an aufgehenden Bauteilen mit 15 cm ü. FFB, mit Klemmleisten oder Flüssigkunststoff gesichert.",
        "Anschlüsse an Fenster und Hebe-Schiebe-Türen fachgerecht (15 cm ü. FFB). Korrekt an Rollladenschiene und unter Wetterschenkel.",
        "Anschlüsse an Abläufen geprüft, sauber/fachgerecht. Abläufe ohne Gegengefälle.",
        "Schweißbahnen (2-lagig) auf Beschädigung, Blasenbildung, unsaubere Ausführung geprüft.",
        "Abdichtung mit Bautenschutzmatten geschützt.",
        "Beschädigungen der Fenster/-rahmen (durch Schweißbrenner, Flüssigkunststoff) liegen nicht vor.",
        "Abläufe fachgerecht eingebaut, sauber und revisionierbar. Notabläufe sitzen über Ablauf und unter Schwelle Fenster/HST. (Bei einseitig offenem Balkon kein Notablauf nötig.)"
      ]},
      { title: "4. Abdichtung TG-Decke / Erdberührte Flächen", items: [
        "Betonuntergrund geprüft, geeignet für Schweißbahn.",
        "Ausreichendes Gefälle vorhanden.",
        "Bit. Voranstrich vollflächig aufgebracht.",
        "Schweißbahnen (2-lagig) für die darüberliegende Nutzung (Begrünung, Parkplatz, etc.) geeignet.",
        "Alle Überlappungen (8 cm) gem. Herstellerangaben.",
        "Anschlüsse an Abläufen geprüft, sauber/fachgerecht.",
        "Oberflächen auf Beschädigung, Blasenbildung, unsaubere Ausführung geprüft.",
        "Hochzug an aufgehenden Bauteilen mit +15 cm ü. FFB, mit Klemmleisten oder Flüssigkunststoff gesichert.",
        "Alle Abkantungen über die Fuge (TG-Decke/Kellerwand) geführt — min. 10 cm überlappend.",
        "Dämmstärken geprüft, stimmen mit Bauphysik überein, laut Plan eingebaut.",
        "Schutz der Abdichtung aufgebracht (Vlies 300 g + Bautenschutzmatte).",
        "Bilddokumentation der abgedichteten Flächen und Dämmung durchgeführt.",
        "Baustelle sauber hinterlassen.",
        "Sämtliche Revisionsunterlagen, Dokumentationen und Nachweise erhalten und abgelegt."
      ]}
    ]
  },
  {
    id: "05", num: "5", title: "Satteldach", scope: "house",
    sections: [{ items: [
      "Dachkonstruktion lt. Statik, Holzdimensionen, Befestigungsmittel, Holzqualität.",
      "Stellbretter, Dachschalung, Ortgangleisten, Unterspann sauber verlegt, Stöße verklebt, Durchdringungen verklebt, keine Beschädigungen, Konter- und Traglattung (S10) fachgerecht montiert.",
      "Dacheindeckung fachgerecht verlegt. Schneefanggitter vorhanden. Lüftungsziegel richtig montiert. Sturmklammern nach Vorschrift eingebaut, Dokumentation vorhanden.",
      "Einlauf in Rinne gewährleistet, Einlaufblech und Tropfblech vorhanden.",
      "Hinterlüftung gegeben und sauber.",
      "Lüfter (Abluft) vorhanden an richtiger Stelle (Abstimmung HLS).",
      "Sonderziegel (PV, Sat, Solar, etc.) vorhanden (wenn im Auftrag).",
      "Dachüberstand hergestellt nach Plan. Trennung Kamin Betondecken — Mauerwerk mit 3 cm Dämmung 1000° beständig. Kaminauswechslung ausbetoniert oder mittels Dachhalter gesichert.",
      "Dachflächenfenster nach Plan eingebaut (Höhe prüfen).",
      "Baustelle wurde ordentlich verlassen."
    ]}]
  },
  {
    id: "06", num: "6", title: "Flaschner", scope: "house",
    sections: [{ items: [
      "Abstimmung zwischen Abdichter, Zimmerer, Gipser und Flaschner erfolgt — Schnittstellen besprochen.",
      "Notwendige Regenrinnen mit ausreichend Gefälle montiert.",
      "Regenfallrohre lotrecht montiert.",
      "Fallrohre gegen Abrutschen gesichert.",
      "Rohrschellenabstand stimmt. Passende Abdeckkappen an Putz montiert (WDVS oder Mauerwerk), liegen ordentlich an.",
      "Standrohre UV-beständig ausgeführt. Bis 30 cm ü. FFB.",
      "Fallrohre und Rinne auf Beschädigungen geprüft.",
      "Flaschnerarbeiten fachgerecht ausgeführt (Kaminverwahrung, Seitenkehlen, Dachrinnen, Ortgangblech, etc.). Mit Vertrag abgeglichen.",
      "Attikablech mit Neigung Gefälle nach innen (laut Detail) ausgeführt.",
      "Überstand Attikablech über Fassade (abhängig von Gebäudehöhe — mind. 4 cm) durchgängig eingehalten.",
      "Alle Lötstellen sauber ausgeführt. Undichtigkeiten ausgeschlossen.",
      "Attika auf Schäden geprüft (Kratzer, Dellen, …).",
      "Dehnungsfugen eingehalten und ordentlich ausgeführt.",
      "Attikablech an allen Stellen fest (Halter prüfen).",
      "Alle Arbeiten nach Plan und Details ausgeführt.",
      "Farbe und Material stimmen mit Bemusterung überein."
    ]}]
  },
  {
    id: "07", num: "7", title: "Fenster", scope: "house",
    sections: [{ items: [
      "Gerüst und Kran mit Fensterbauer abgestimmt — siehe Vertrag.",
      "Details an Lichtschacht, HST, Rollladen abgestimmt.",
      "Ausführung des „Gewerkelochs“ abgestimmt — zwischen Gipser, Rolladenbauer, Fensterbauer.",
      "Simse im EG geprüft (Planung Außenanlagen wegen Höhen).",
      "Bodentiefe Fenster im EG / Terrassen / Balkone / Loggien: 5 cm Absatz + Festverglasung unten = Rinne; 15 cm Absatz + Festverglasung unten = nur Kies; bodeneben + überdacht = nur Rinne; bodeneben nicht überdacht = Rinne + beheizt.",
      "Fenster nach Herstellerangaben im Mauerwerk verschraubt. Spezielle Verankerung für VSG-Verglasung beachten.",
      "Fenster und HST nach Meterriss eingebaut.",
      "Fensterprofil innen und außen luftdicht mit Mauerwerk abgeklebt (RAL-Montage).",
      "Fenster vollständig (mit Griff, Anschlussprofilen, etc.) montiert.",
      "Funktion der Fenster (Schließfunktion, Dreh-Kipp, etc.) geprüft.",
      "Alle Fenster lotrecht montiert.",
      "Vorgaben der Bauphysik (Schallschutz, Wärmeschutz) der Scheiben mit LV und Bauteilaufbauten geprüft.",
      "Alle Fenster auf Schäden an Glas und Rahmen geprüft.",
      "Gefälle der Fensterbank mit 5° Neigung — kein Gegengefälle.",
      "Bei Holzbau 2. Dichtungsebene unter Sims ausgeführt.",
      "Mind. zwei Simshalter bei WDVS montiert.",
      "Antidröhnmatte unterseitig des Simses angebracht.",
      "Überstand über Putzoberfläche 4,5 cm. Holzfassade beachten und Überstand prüfen.",
      "Fensterbank waagerecht eingebaut. Lackoberflächen schadensfrei.",
      "Wird ein RWA-Fenster benötigt?",
      "2. Fluchtweg prüfen — (Lichter Durchgang, Notkurbel) Abgleich mit Brandschutzplan.",
      "Abnahme der Fenster durchgeführt.",
      "Ggf. Rahmenverbreiterungen verkleiden — Trockenbauer etc.",
      "Baustelle sauber verlassen."
    ]}]
  },
  {
    id: "08", num: "8", title: "Haustüre", scope: "house",
    sections: [{ items: [
      "Vorbereitungen seitens Elektriker erledigt.",
      "Ausführung laut Baubeschreibung und Bemusterung.",
      "Tür nach Meterriss eingebaut.",
      "Keine Beschädigungen an Lack und Glas.",
      "Funktion geprüft.",
      "Obertürschließer eingebaut, schließt ordentlich.",
      "Barrierefreiheit geprüft.",
      "Sicherheitsverriegelung mit Durchlaufzylinder (Panikschloss) verbaut.",
      "Bei Gewerbe Öffnungsrichtung prüfen wegen Fluchtweg.",
      "Baustelle sauber verlassen."
    ]}]
  },
  {
    id: "09", num: "9", title: "Schlosser", scope: "house",
    sections: [
      { title: "1. Geländer Balkone, Loggien, Dachterrassen, Außenanlagen", items: [
        "Geländerstatik und Ausführungsdetails vorhanden.",
        "Montage mit Kran etc. abgestimmt — laut Vertrag.",
        "Befestigungen gem. Vorgaben aus Statik. Thermostopp eingebaut unter Stahlwinkel bei gedämmter Loggia.",
        "Dokumentation der Befestigung (für Prüfstatik und Bauamt) erfolgt.",
        "Abstände zwischen den Geländerstäben sind kleiner 12 cm.",
        "Anschlüsse mit Stuckateur und Abdichter besprochen.",
        "Geländerhöhe bis 12 m: 90 cm über Belag, ab 12 m: 1,10 m. Geprüft.",
        "Oberflächen (Verzinkung, Beschichtung) fehlerfrei/ohne Beschädigung.",
        "Alle Geländer und Handläufe ausgeführt — Planung abgleichen (Außenanlagen).",
        "Werden Lüftungsgitter benötigt? (Lüftungsschächte TG, UG-Fenster, etc.) Ausführung nach Plan und Bemusterung.",
        "Müssen Lichtschachtgitter angepasst werden an Kamin, Pelletsbefüllung, etc.?"
      ]},
      { title: "2. Handläufe/Geländer, Estrichwinkel im Treppenhaus", items: [
        "Estrichwinkel nach Meterriss eingebaut.",
        "Ausführung Geländer nach Plan und Statik.",
        "Befestigung geprüft.",
        "Abstand zur Wand geprüft (min. 5 cm).",
        "Handlauf durchgängig und ordentlich verschweißt.",
        "Abstand zu anderem Handlauf (min. 5 cm) geprüft.",
        "Höhe Handlauf zwischen 80–115 cm (wenn nur Handlauf an Wand).",
        "Höhe Geländer (OK Handlauf) bis 12 m: 90 cm, ab 12 m: 1,10 m. Geprüft.",
        "Abstände zwischen Geländerstäben kleiner 12 cm.",
        "Lichte Durchgangshöhe zu Treppenpodest min. 200 cm.",
        "Abdeckgitter im UG an sämtlichen Schächten verbaut."
      ]}
    ]
  },
  {
    id: "10", num: "10", title: "Fensterabsturzsicherungen", scope: "house",
    sections: [{ items: [
      "Ausführung laut Bemusterung.",
      "Geländerstatik und Ausführungsdetails vorhanden.",
      "Abstimmung mit den betreffenden Firmen (Schlosser, Gipser, Fensterbauer, Rolladenbauer).",
      "Befestigungen gem. Vorgaben aus Statik.",
      "Thermische Trennung der Kopfplatten gegeben.",
      "Abstände zwischen Geländerstäben kleiner 12 cm.",
      "Geländerhöhe (90 cm über FFB/Fensterrahmen) gegeben/geprüft.",
      "Oberflächen (Verzinkung, Beschichtung) fehlerfrei/ohne Beschädigung.",
      "Baustelle sauber hinterlassen."
    ]}]
  },
  {
    id: "11", num: "11", title: "Fassade", scope: "house",
    sections: [
      { title: "WDVS / Putz ohne Dämmung", items: [
        "Ausführung laut Bemusterung — Farben, Putze, sonstige Elemente.",
        "Sockelhöhe umlaufend festgelegt — gemäß Außenanlagenplan.",
        "Fensterbänke waagerecht eingebaut, Überstand über Putz mind. 4 cm.",
        "APU-Leisten bis auf Sims geführt — kein Spalt sichtbar.",
        "Hohlräume unter Fensterbänken vollständig ausgedämmt.",
        "Fassadenanstrich 2× aufgebracht (an 2 Tagen wegen Trocknungszeit).",
        "Sockelputz und Sockelputzabschluss fachgerecht. Sockelabdichtung über Sockelputz geführt. Höhe min. 5 cm ü. FFB und auf WDVS gezogen. Gewebespachtelung/Oberputz nicht bis zur Terrassen-/Balkonplatte/TG-Decke. Nur 3–5 cm unter FFB. Dämmplatte Sockel als XPS — laut Detail.",
        "Sockelabdichtung hinter Dämmung mind. 30 cm über FFB.",
        "Zwischen Fenster und Dämmung komplett ausgedämmt.",
        "Anschluss an Rollladenschiene schlagregendicht.",
        "Putzgrund auf Tragfähigkeit/Verschmutzungen geprüft. Standzeit Grundputz eingehalten.",
        "WDVS-Platten sauber verlegt, keine Kreuzfugen, Fugen mit Schaum ausgespritzt. Kompribänder an Fenstersimsen, Geländereinbindungen, Lüftungen, Dachgesims richtig angebracht. Abnahme mit Hersteller.",
        "Gewebespachtelung fachgerecht aufgebracht und überlappt, Stärke >6 mm. Abnahme mit Hersteller.",
        "Dehnfugen an Materialwechseln ausgeführt.",
        "Anschlüsse an Bleche, Lüfter, etc. fachgerecht abgedichtet und getrennt.",
        "Oberputz fachgerecht aufgebracht, Struktur durchgängig.",
        "Dokumentation von Dämmung (Stärke, WLG), Grundputz und fertiger Fassade durchgeführt.",
        "Lackoberflächen der Fensterbänke schadensfrei. Fensterrahmen und -scheibe schadensfrei. Gerüst gereinigt.",
        "Baustelle aufgeräumt. Putzreste und Farbrückstände entfernt. Erdreich um das Haus gesäubert."
      ]},
      { title: "Holzfassade", items: [
        "Dichtungsebene durchgehend an Fenster, Sims, Leibungen, etc.",
        "2. Dichtungsebene unter Fenstersims vorhanden — liefert Fensterbauer.",
        "Hinterlüftung überall gewährleistet.",
        "Sichtprüfung von Material gemacht (keine größeren Risse, Abplatzungen, etc.).",
        "Edelstahlschrauben verwendet.",
        "Abnahme der Fassade erfolgt."
      ]}
    ]
  },
  {
    id: "12", num: "12", title: "Terrassen- und Balkonbeläge", scope: "apartment",
    sections: [{ items: [
      "Abgedichtete Flächen vor Beginn der Arbeiten gereinigt.",
      "Bautenschutzmatte vor Montage der Unterkonstruktion verlegt.",
      "Auswahl der Platten nach Bemusterung und Baubeschreibung.",
      "Unterkonstruktion fachgerecht montiert (auch unter Rinne).",
      "Keramikplatten liegen vollflächig auf, schallentkoppelt verlegt.",
      "Keramikplatten auf Beschädigungen und Verunreinigungen geprüft. Schnittkanten ordentlich.",
      "Einteilung der Platten sinnvoll — keine kleinen Abschnitte.",
      "Umrandung ordentlich ausgeführt — OK Belag bündig. Bei Kies muss Noppenbahn 2 cm ü. FFB. Randeinfassung nach Detail und Vertrag.",
      "Rinnenrost so gesetzt, dass herausnehmbar. Stoß an Rollladenschiene.",
      "Platten liegen satt auf und wackeln nicht (Randbereich und Übergang an Rinne).",
      "Baustelle sauber hinterlassen — keine Metallspäne auf Belag, etc."
    ]}]
  },
  {
    id: "13", num: "13", title: "Dämmung UG / TG", scope: "house",
    sections: [
      { title: "Dämmung TG", items: [
        "Dämmung entspricht Vorgaben der Bauphysik (Bauteilkatalog) und dem Vertrag.",
        "Brandschutz beachten (Baustoffklasse).",
        "Gedämmte Flächen gem. Planung hergestellt.",
        "An Durchführungen mit BS-Manschette wurde 10 cm Dämmung um DD/WD ausgespart.",
        "Oberflächen sauber ausgeführt.",
        "Hinter Sockeldämmung abgedichtet. Sockeldämmplatte vorhanden.",
        "Nachweise für KfW vorhanden.",
        "Baustelle sauber hinterlassen."
      ]},
      { title: "Dämmung UG-Räume", items: [
        "Dämmung entspricht Vorgaben der Bauphysik (Bauteilkatalog) und dem Vertrag.",
        "Sockeldämmplatte vorhanden.",
        "Brandschutz beachten (Baustoffklasse).",
        "Gedämmte Flächen gem. Planung hergestellt.",
        "Nachweise für KfW vorhanden.",
        "An Türlaibungen schräg gedämmt. Obertürschließer berücksichtigt."
      ]}
    ]
  },
  {
    id: "14", num: "14", title: "Beschichtung TG", scope: "project",
    sections: [
      { title: "Tiefgarage WU", items: [
        "Material geprüft und dokumentiert.",
        "Hohlkehlen ausgeführt (schwimmend/starr).",
        "Oberfläche geprüft / Körnung.",
        "Bei Rampe Anschlüsse an Rinne geprüft.",
        "OK Sockelabdichtung = 50 cm über FFB.",
        "Markierungen Parkplätze laut Teilungsplan und Vertrieb."
      ]},
      { title: "Tiefgarage gepflastert — Fundamente/Stützen/Wände", items: [
        "Material geprüft und dokumentiert.",
        "Betonqualität von Fundamentbeton prüfen (Beschichtung notwendig oder nicht?).",
        "Hohlkehle an Stütze vorhanden. 15 cm auf Waagrechte beschichtet. OK Sockelabdichtung = 50 cm über FFB."
      ]}
    ]
  },
  {
    id: "15", num: "15", title: "Pflaster Tiefgarage", scope: "project",
    sections: [{ items: [
      "Pflasterunterbau stimmt mit Vorgaben aus Planung bzw. geol. Gutachten überein.",
      "Notwendige Abdichtung von Betonbauteilen (z.B. OS 5b) angebracht. OK Sockelabdichtung = 50 cm über Pflasterbelag.",
      "Alle Rinnen und Abläufe an Grundleitungen angeschlossen.",
      "Noppen an Wandanschluss min. 2 cm ü. FFB.",
      "Ausreichendes Gefälle (2,5 %) im Pflasterbelag.",
      "Pflasterbelag auf Beschädigungen und Verunreinigungen geprüft.",
      "Belag abgerüttelt und gesandet. Alle Fugen vollständig mit Sand gefüllt.",
      "Baustelle sauber verlassen."
    ]}]
  },
  {
    id: "16", num: "16", title: "Maler", scope: "house",
    sections: [
      { title: "Maler UG + TG", items: [
        "Oberflächen geprüft und deckend gestrichen.",
        "Maler hat aktuelle Bemusterung bekommen.",
        "Arbeiten vollständig laut Vertrag erledigt.",
        "Stellplatznummern und Markierungen angebracht.",
        "Brandschutzmanschetten etc. nicht überstrichen.",
        "Stahltüren lackiert wo notwendig.",
        "Große Fugen und Lunker verspachtelt (Decke-Wandfuge, Sockelbereich, etc.).",
        "Baustelle sauber, alle Farbrückstände und Abdeckfolien entfernt."
      ]},
      { title: "Maler Wohnungen", items: [
        "Putzflächen und Deckenstöße auf Ebenheit geprüft. Oberflächen entsprechen Q2 — Vorbegehung mit Gipser 2 Wochen vor Beginn.",
        "Stöße und Anschlüsse der Tapete sauber ausgeführt.",
        "Oberflächen vollständig deckend gestrichen.",
        "Alle Sonderwünsche gem. Kundenbemusterung ausgeführt.",
        "Randdämmstreifen 2 cm über Estrichbelag zurückgeschnitten.",
        "Türzargen abgefugt (auch oben). FBH-Verteiler abgefugt.",
        "Evtl. Sockelleisten abfugen wenn Spalt zu groß.",
        "Bäder wo halbhoch gefliest tapeziert laut Bemusterung. Fuge Decke-Wand abgefugt (auch wenn Wand gefliest).",
        "Arbeiten vollständig laut Vertrag erledigt.",
        "Baustelle sauber, alle Farbrückstände entfernt (Türzargen, Türblätter, Fenster, …)."
      ]},
      { title: "Maler Treppenhaus", items: [
        "Putzflächen und Deckenstöße auf Ebenheit geprüft. Oberflächen entsprechen Q2.",
        "Stöße und Anschlüsse der Tapete an Decken und Treppenuntersichten sauber ausgeführt.",
        "Oberflächen vollständig deckend gestrichen, auch Putzoberfläche.",
        "Alle Dehnfugen / Entkopplungsfugen mit Sollbruchstelle / Kellenschnitt. Übergang Wand-Decke mit Gewebe ohne Dehnfuge.",
        "Sämtliche Fugen an Podest und Treppenlauf mit PU-Material ausgefugt.",
        "Treppenstirnkanten verspachtelt und gestrichen vor Montage Treppengeländer — Abstimmung mit Schlosser.",
        "Ggf. Aufzugstüren lackiert — Baubeschreibung und Bemusterung prüfen.",
        "Treppengeländer und Estrichwinkel lackiert laut Bemusterung. Keine Lunker.",
        "Sockel und Türrahmen abgefugt. Fenstersimse eingeputzt.",
        "Oberlichter ordentlich verkleidet, tapeziert und gestrichen (Rahmen hat 5 mm Überstand über Laibung).",
        "Arbeiten vollständig laut Vertrag erledigt."
      ]}
    ]
  },
  {
    id: "17", num: "17", title: "Tor Tiefgarage", scope: "project",
    sections: [{ items: [
      "Einbausituation (Maße, Lage, Höhe Sturz, etc.) mit Torbauer abgestimmt und geprüft.",
      "Vorarbeiten des Elektrikers abgestimmt und vorbereitet.",
      "Positionen von Ampel, Sensoren und Schlüsselschalter/Zugschalter innen definiert — Zylinder bestellt.",
      "Notwendiger Lüftungsquerschnitt eingehalten.",
      "TG-Tor ohne Beschädigungen (Lack) montiert."
    ]}]
  },
  {
    id: "18", num: "18", title: "Dachdämmung Schrägdach", scope: "house",
    sections: [{ items: [
      "Dämmung vollflächig und fachgerecht verlegt.",
      "Dämmung entspricht Vorgaben aus der Bauphysik.",
      "Dampfbremse/-sperre fachgerecht angebracht, luftdicht verklebt.",
      "Blower-Door-Test kann ausgeführt werden inkl. Leckageortung.",
      "Gipskartondecken fachgerecht montiert und verspachtelt.",
      "Hinter Trempelwand gedämmt. Über Aufzug gedämmt. Dachvorsprung gedämmt.",
      "Folienanschluss an Wand passend für Gipser — Absprache mit Gipser.",
      "GKB an DFF senkrecht und waagerecht ausgeführt.",
      "Baustelle sauber verlassen.",
      "Brandschutz an Treppenhaus und Wohnungstrennwänden (Satteldach) geprüft und dokumentiert — 1 m Brandüberschlag."
    ]}]
  },
  {
    id: "19", num: "19", title: "Trockenbauwände und -decken", scope: "house",
    sections: [
      { title: "Wände", items: [
        "Abstimmung zwischen HLS, Elektro und Trockenbau erfolgt.",
        "Schienen an Durchbrüchen ausgespart, ordentlich ausbetonierbar (Brandschutz).",
        "Sämtliche Nischen eingebaut — Kundenwünsche geprüft (Dusche, Waschbecken/Spiegel, etc.).",
        "Schallentkopplung Decke, Boden, Wand ausgeführt.",
        "UA-Profile verbaut und mit Winkel befestigt an: Türen; WC wo Vorwand raumhoch (ansonsten WC an Wand befestigen).",
        "Aussparung FBH-Verteiler nach Rücksprache mit HLS ausgewechselt. Aussparung Elektroverteiler nach Rücksprache mit Elektro ausgewechselt.",
        "Zwischenraumdämmung vollständig eingebaut.",
        "Trennbänder an Wand- und Deckenanschlüssen angebracht.",
        "GK-Platten ausreichend verschraubt.",
        "Eckschienen gesetzt und ordentlich verspachtelt.",
        "Oberfläche entsprechend Vertrag vorbereitet (Q2, Q3, für Fliesen, etc.).",
        "Übergang Trockenbau auf Putz (Dehnfuge) sauber und tapezierfähig — Breite ca. 2–3 mm.",
        "Ebenheit und Lotrechtigkeit der GK-Wände geprüft — Ortstermin mit Maler und Fliesenleger vereinbaren.",
        "Alle Raumabmessungen mit Werkplanung geprüft. Sonderwünsche beachten. Rechte Winkel geprüft.",
        "Baustelle sauber für Nachgewerke hinterlassen."
      ]},
      { title: "Decken", items: [
        "Alle Abhangdecken und Öffnungen nach Plan und Kundenwunsch ausgeführt.",
        "Revision beachten wo Leitungen HLS verbaut sind.",
        "Stockwerkshöhe in Schleusen beachten.",
        "Brandschutzanforderungen in Schleusen, Treppenhaus etc. beachten."
      ]}
    ]
  },
  {
    id: "20", num: "20", title: "Brandschutz", scope: "project",
    sections: [{ items: [
      "Alle Brandschotts eingebaut mit ausreichend (10 cm) Abstand zur Dämmung an Decke und Wand.",
      "Trockenleitung notwendig?",
      "Aufzug auf Brandschutzanforderungen geprüft.",
      "Abnahme mit Brandschutzgutachter bevor Wände geschlossen werden. Alle Schotts und Conlitschalungen abgenommen und dokumentiert (mit docma).",
      "RWA-Anlagen verbaut und in Betrieb genommen. Dokumentation vorhanden.",
      "Brandschutz an Treppenhaus und Wohnungstrennwänden (Satteldach) geprüft und dokumentiert — 1 m Brandüberschlag.",
      "Sind Feuerlöscher nach Plan verbaut?",
      "Feuerwehrpläne erforderlich?",
      "Beleuchtung TG und Fluchtwege nach Brandschutzgutachten.",
      "Ausführung gem. Planung/Gutachten hergestellt (Türen, Aufzug, RWA, Fluchtweg, etc.).",
      "Errichterbestätigungen/Prüfberichte/Unterlagen von HLS, Trockenbau, Schreiner UG-Türen, Elektro, WDVS, Aufzug, Rohbau vorhanden.",
      "Konformitätserklärung von Brandschutzgutachter erhalten."
    ]}]
  },
  {
    id: "21", num: "21", title: "Innenputz", scope: "house",
    sections: [{ items: [
      "Begehung mit Gipser. Begutachtung Vorgewerke — 2 Wochen vor Beginn — Protokoll erstellt.",
      "Aufzug eingebaut. Haustürrahmen eingebaut.",
      "Stahltüren im UG eingebaut.",
      "Im UG sind alle Wanddurchbrüche geschlossen.",
      "Vorwände fertiggestellt. Rohinstallation Elektro und HLS fertig.",
      "Kellenschnitt am Übergang zur Decke und anderen Bauteilen gezogen.",
      "Dehnfugen an Materialwechseln fachgerecht ausgeführt. Breite ca. 2–3 mm.",
      "Laibungen und Ecken rechtwinklig ausgeführt, Prüfung erfolgt.",
      "Putz fachgerecht aufgebracht in Q2-Qualität — Begehung mit Maler und Gipser erfolgt — Protokoll erstellt.",
      "Waagrechte Dehnfugen im Treppenhaus mit Gewebe überputzt.",
      "Baustelle sauber verlassen. Begehung mit Estrichleger erfolgt wegen Müll."
    ]}]
  },
  {
    id: "22", num: "22", title: "Estrich", scope: "house",
    sections: [{ items: [
      "Betondecken trocken und besenrein.",
      "Abnahme Vorgewerke mit Estrichleger — Protokoll erstellt (2 Wochen vor Beginn).",
      "Estrichaufbau besprochen.",
      "Rinnenhöhen in Dusche prüfen und protokollieren — min. 2 % Gefälle.",
      "Estrichhöhen an Übergängen zum Bad besprochen. Anschlusshöhen zu bodentiefen Fenstern (HST — 5 mm Absatz von FFB zu OK Schwelle), Treppen, Aufzug, Haustüre geprüft. Höhen Treppenhaus zu Wohnungen geprüft.",
      "Randdämmstreifen fachgerecht angebracht, Tackerklammern über Estrich. Ausreichend befestigt und mit Dämmplatte verklebt.",
      "Dämmung vollflächig (keine Hohlräume), nicht in Kreuzfugen verlegt. Stöße zwischen Dämmplatten verklebt.",
      "An Wohnungseingangstüren (Brandabschnitt) Mineralwolledämmung eingebaut. Randstreifen bei WET zwischen Estrich Wohnung und Estrich Treppenhaus eingebaut.",
      "Vorgaben aus Bauphysik (Trittschalldämmung + U-Werte + Stärke) geprüft und dokumentiert.",
      "Dehnfugen an Türen und Übergängen nach Estricheinbringung offen. Alle Dehnfugen richtig positioniert (Aufschlagrichtung Tür beachten).",
      "Estrichhöhen mit Laser geprüft (kein Absatz zu Bad und Bodenbeläge berücksichtigt).",
      "Ebenheit der Oberflächen geprüft, für Nachfolgegewerk in Ordnung (ggf. mit Parkettleger/Fliesenleger prüfen).",
      "Estrich angeschliffen.",
      "Estrichtrocknung nach Aufheizprotokoll, ausreichend gelüftet, Estrichfeuchte vor Verlegung der Böden bei 0,3 %. Protokoll vorhanden.",
      "Baustelle sauber verlassen."
    ]}]
  },
  {
    id: "23", num: "23", title: "Treppenhausbelag", scope: "house",
    sections: [{ items: [
      "Vorbegehung mit Treppenbauer — Protokoll erstellt.",
      "Schallbrücken zur Wand und Decke ausgeschlossen.",
      "Höhen zwischen Wohnungen, Aufzug, Estrichwinkel, Haustüre und Treppenhaus geprüft.",
      "Evtl. Gefälle in Schleusen UG prüfen ob nach Plan hergestellt.",
      "Höhen von Türen im UG prüfen.",
      "Fugen vollständig gefüllt.",
      "Tritt- und Setzstufen geprüft (durchgängig gleiches Maß).",
      "Oberflächen sauber ausgeführt. Verfärbungen und Unregelmäßigkeiten ausgeschlossen.",
      "Alle Silikonfugen vollständig ausgeführt.",
      "Abstand zur Wand kleiner 6 cm.",
      "Belagsanschluss vor Haustüre (0-Schwelle) abstimmen (Höhe Belag).",
      "Baustelle sauber verlassen."
    ]}]
  },
  {
    id: "24", num: "24", title: "Fliesen", scope: "apartment",
    sections: [{ items: [
      "Oberflächen (Estrich, Innenputz, Trockenbau) in WC und Bad geprüft. Vorbegehung der Gewerke (2 Wochen vorher) Protokoll erstellt.",
      "Fliesenleger hat aktuelle Bemusterung bekommen.",
      "Einteilung der Fliese besprochen (ggf. mit Kunde klären).",
      "Abdichtungsanschlüsse an Dusche, Badewanne, Boden und Türbereich mit Dichtbändern (inkl. Falte in Dehnfuge) ausgeführt. Türlaibungen vor Einbau Türzargen abgedichtet. Unter Badewanne abgedichtet.",
      "Bilddokumentation der Abdichtung durchgeführt.",
      "Dehnungsfugen zwischen Wand-/Sockelfliese und Bodenfliese mind. 0,5 cm + Einbau von Rundschnur.",
      "Übergang am Belagswechsel (Höhe Abschlussschiene) mit Fliesenleger und Parkettleger abgestimmt (Dichtband mit Kleber überzogen).",
      "Fugenmaterial vor dem Silikonieren entfernt. Schallbrücken ausgeschlossen.",
      "Fliesen, Fugenmaterial und Silikon nach Bemusterung eingebaut.",
      "Sanitärgegenstände abgefugt.",
      "Nischen/Ablagen nach Plan und Bemusterung eingebaut.",
      "Steckdosen, Schalter, HLS-Anschlüsse nicht zu groß ausgeschnitten.",
      "Duschgefälle geprüft — min. 2 %.",
      "Eckschienen nicht verkratzt. Stöße der Eckschienen ordentlich.",
      "Keine Versätze in der Fläche.",
      "Baustelle sauber verlassen."
    ]}]
  },
  {
    id: "25", num: "25", title: "Bodenbeläge Parkett, Vinyl", scope: "apartment",
    sections: [{ items: [
      "Vorbegehung mit Bodenleger hat stattgefunden. Estrichflächen auf Ebenheit geprüft.",
      "Bodenleger hat aktuelle Bemusterung bekommen.",
      "Dehnfugen besprochen.",
      "Türrahmenhöhe geprüft.",
      "Übergang zu Treppenhausbelag geprüft.",
      "CM-Messung mit Parkettleger durchgeführt. Estrich ausreichend ausgetrocknet, kann belegt werden.",
      "Randdämmstreifen 1 cm über Estrichbelag zurückgeschnitten.",
      "Bodenbelag nach Bemusterung eingebaut.",
      "Belag steht nicht an der Wand an — min. 5 mm Abstand.",
      "Übergänge am Belagswechsel sauber ausgeführt.",
      "Alle Türen vollständig abgefugt.",
      "Fertige Oberfläche auf optische Mängel (Kratzer, Unebenheit, Risse) geprüft.",
      "Sockelleisten ordentlich verlegt (Schallschutz geprüft). Gehrungsschnitte ordentlich.",
      "Baustelle sauber, Lack- und Kleberückstände entfernt. Kein Restmaterial mehr auf der Baustelle.",
      "Dehnfuge Estrich an Eingangstür übernommen und Dehnfuge in Boden eingebaut."
    ]}]
  },
  {
    id: "26", num: "26", title: "Schreiner", scope: "house",
    sections: [
      { title: "Innentüren Wohnungen", items: [
        "Anschlüsse zur Wand sauber ausgeführt. Bei großen Fugen (Wand/Zarge) prüfen, wie diese geschlossen werden.",
        "Tür streift nicht. Unterschnitt ca. 5 mm.",
        "Funktion geprüft. Türen leicht zu öffnen und zu schließen (fällt nicht zu).",
        "Oberflächen (Lack) auf Schäden geprüft.",
        "Öffnungsrichtungen stimmen mit Planung (ggf. Sonderwünsche beachten).",
        "Schalldichtung der Wohnungseingangstüren eingestellt, schließt dicht.",
        "Lüftungsgitter nach Plan eingebaut — Schrauben stehen nicht raus.",
        "Sonderwünsche beachtet (Türspion, Griffe, etc.).",
        "Baustelle sauber verlassen."
      ]},
      { title: "UG-Türen", items: [
        "Türen bestellt (Lieferzeit beachten).",
        "Höhen prüfen (Meterriss).",
        "Brandschutz nach Plan eingebaut.",
        "Bei RS-Türen Dichtungen eingebaut.",
        "Einbau nach Herstellerangaben (Rahmen ausgeschäumt — Brandschutz).",
        "Schließen alle Türen ordnungsgemäß."
      ]},
      { title: "Badmöbel", items: [
        "Sonderwünsche geprüft.",
        "Sonderwünsche bestellt."
      ]}
    ]
  },
  {
    id: "27", num: "27", title: "Kellertrennwände", scope: "project",
    sections: [{ items: [
      "Arbeiten nach Plan ausgeführt.",
      "Stabilität geprüft. Befestigungen an Wand und Decke ausreichend.",
      "Elemente lotrecht montiert.",
      "Türen schließen ordentlich.",
      "Boden nicht verkratzt.",
      "Nummerierung passt nach Aufteilungsplan.",
      "Baustelle sauber verlassen."
    ]}]
  },
  {
    id: "28", num: "28", title: "Gerüst", scope: "house",
    sections: [{ items: [
      "Vorbegehung mit Gerüstbauer erfolgt. Abstimmung mit Rohbauer.",
      "Gerüst wird erst gestellt, wenn Rohbauer komplett aufgefüllt hat und EG fertig ist (Terrassen, Versorgungsleitungen, Lichtschächte, Lichthöfe, Erdplanum, TG fertig, …).",
      "Abstimmung Gerüst mit Fensterbauer, Gipser, Abdichter.",
      "Abstand zur Fassade abgestimmt. Konsolen notwendig?!",
      "Standsicherheit des Gerüstes gegeben und mit Schein bestätigt.",
      "Kamin, Balkone, Terrassen, Versorgungsleitungen, Brandschutzleiter berücksichtigt.",
      "Auf TG Füße möglichst weit nach oben drehen. Erste Lage Abdichtung vorab hergestellt.",
      "Dachterrassen, Balkone etc. erste Lage Abdichtung hergestellt.",
      "Treppentürme beachten — Lage festlegen.",
      "Bei Satteldach genügend Abstand zu Ortgang und Traufe — ggf. Abstimmung mit Zimmermann.",
      "Alle Arbeiten wo Gerüst benötigt wird sind erledigt: Fassade, Lüfter in der Fassade, Flachdach (Begrünung und Flaschner), Fenster, Balkongeländer, Kamin, Photovoltaik."
    ]}]
  },
  {
    id: "29", num: "29", title: "HLS (Heizung/Lüftung/Sanitär)", scope: "house",
    sections: [
      { title: "Sanitär", items: [
        "Leitungsführung nach Planung vollständig und fachgerecht ausgeführt.",
        "Abwasserleitung schallisoliert.",
        "Rohrleitungen senkrecht und waagerecht gedämmt: 100 % Dämmung vom Rohrinnendurchmesser im UG bis zu den Wasseruhren; Wohnung 50 % Dämmung; Tiefgarage 200 % Dämmung. Bilddokumentation.",
        "Gefälle min. 1,5 % bei horizontalen Schmutzwasserleitungen.",
        "Konsolen / Befestigungen schallentkoppelt.",
        "Unterkonstruktion WC und WB ausreichend befestigt (UA-Profil oder rückseitig Wand).",
        "Steigleitungen ausreichend befestigt.",
        "Bei Fallrichtungswechsel 2× 45° Bogen oder flacher. Keine 90°-Bögen.",
        "Brandschutzmanschetten SW-Leitungen vollständig und fachgerecht angebracht. Conlitschalungen fachgerecht angebracht — Drahtumwicklungen nach Brandschutz.",
        "FBH-Verteiler auf richtiger Höhe gesetzt.",
        "Leitungen abgedrückt.",
        "Richtige Unterputzkörper nach Bemusterung verbaut.",
        "WCs auf richtige Höhe gesetzt — Standardhöhe OK Porzellan 43 cm. Sonderwünsche prüfen.",
        "Duscharmatur mittig gesetzt — fluchtgerecht mit Rinneneinlauf, Fliesenfuge, Regendusche etc. Sonderwünsche prüfen.",
        "Anschlüsse Küche auf Rigipsplatte, wenn gemauerte oder betonierte Wand.",
        "Gewindestangen an Waschbecken und WCs vorhanden und fest.",
        "Revisionsöffnungen im UG vorhanden."
      ]},
      { title: "Heizung", items: [
        "Fernwärmestation von HLS bestellt und mit Stadtwerken abgestimmt. Abruf bei Stadtwerken erfolgt — Einbau mit HLS und Elektriker abgestimmt.",
        "Heizungsanlage (Pellets oder Wärmepumpe) mit HLS und Elektriker besprochen, Einbau abgestimmt. Pellets bestellt zum Aufheizen von Estrich.",
        "Heizung in Betrieb genommen. Dokumentation vorhanden.",
        "Heizung geerdet.",
        "Notschalter außerhalb von Heizraum angebracht.",
        "Prüfliste von Gutachter abgearbeitet.",
        "FBH dokumentieren (Bilder mit Whg und Raum beschriften)."
      ]},
      { title: "Lüftung", items: [
        "Leitungsführung nach Planung vollständig und fachgerecht ausgeführt.",
        "Höhe Lüftungsstränge prüfen — min. 2,00 m von FFB im UG.",
        "Brandschutzklappen an Decken und Wanddurchdringungen vollständig und fachgerecht. Brandabschnitte prüfen. Dokumentation vorhanden.",
        "Lüftungsstrang ausreichend befestigt → schallentkoppelt — Vibration ausgeschlossen.",
        "Mit Trockenbauer Montage/Befestigung der UP-Kästen in WCs für Lüfter abgestimmt.",
        "Notwendige elektrische Zuleitung mit Elektriker abgestimmt.",
        "Regelung/Steuerung mit HLS und Elektro besprochen."
      ]}
    ]
  },
  {
    id: "30", num: "30", title: "Elektro", scope: "house",
    sections: [{ items: [
      "Hausanschluss beauftragt und ausgeführt. Stromzähler beantragt.",
      "Verkabelung der Lüfter im Bad und WC mit Elektriker und Sanitärinstallateur abgestimmt.",
      "Leitungen in Wänden senkrecht oder waagerecht verlegt nach Planung.",
      "Durchdringungen durch Außenwände luftdicht und wasserdicht verschlossen.",
      "Rohinstallation geprüft (Position Steckdosen, Schalter, Sonderwünsche).",
      "Rohinstallation der Küchen nach Küchenplan ausgeführt.",
      "Brandschottung zwischen Brandabschnitten durchgeführt und dokumentiert.",
      "Zählerschrank und Sicherungskasten vollständig maschinell beschriftet. PE-Schiene beschriftet.",
      "Technikraum/Heizraum vollständig verkabelt — laut Vertrag. Erdung der HLS-Anlage erstellt.",
      "Einführungen Kabel in Schaltschrank staubdicht verschlossen.",
      "Höhe Kabelkanal prüfen — min. 2,00 m ü. FFB. In TG 2,10 m. Kreuzungspunkte mit HLS abgestimmt.",
      "Beleuchtung TG nach Brandschutzgutachten. BW so eingestellt, dass überall erkennbar.",
      "Schleusen/Notausgänge Beleuchtung nach Brandschutzgutachten.",
      "Funktionsprüfung vor Übergabe durchgeführt und dokumentiert.",
      "Wohnraumlüftung verkabelt und angeschlossen.",
      "Internet, TV, etc. abgestimmt (Anbieter, Glasfaser, …). Übergabepunkte geklärt.",
      "Treppenhausbeleuchtung, RWA, Aufzug abgestimmt.",
      "Liste von Gutachter abgearbeitet.",
      "Außenbeleuchtung angebracht. Wegbeleuchtung nach Plan verbaut.",
      "Position Briefkastenanlage / Sprechanlage abgestimmt. Notwendige Aussparungen im WDVS vorgesehen.",
      "Position Video abgestimmt.",
      "Elektrische Anschlüsse Video, Sprechanlage, Haustüre abgestimmt.",
      "Funktionsprüfung des E-Öffners und Sprechanlage vor Übergabe durchgeführt.",
      "Beschädigungen an Briefkastenanlage und Sprechanlage nicht ersichtlich."
    ]}]
  },
  {
    id: "31", num: "31", title: "Aufzug", scope: "house",
    sections: [{ items: [
      "Aufmaß seitens der Aufzugsfirma erfolgt.",
      "Vorbereitende Maßnahmen erfüllt (Meterriss, Zugänglichkeit Baustelle, Lagerplatz Aufzug, etc.).",
      "Vorarbeit seitens des Elektrikers vollständig.",
      "Oberflächen geprüft und unbeschädigt.",
      "Abnahme mit dem TÜV terminiert.",
      "Schlüsseltresor gesetzt.",
      "Schachtentlüftung in das Treppenhaus eingebaut.",
      "Konformität/Abnahme liegt vor.",
      "Aufzug betriebsbereit für Kunde."
    ]}]
  }
];
