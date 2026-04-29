/**
 * Standard-Mängel-Textbausteine pro Gewerk (Phase C3).
 * Bauleiter wählt im Defect-Editor "Textbaustein einfügen" → Body wird in
 * description-Feld geschrieben.
 *
 * Quelle: gängige Mängel aus der VOB-Praxis. Anpassbar via DB oder Re-Seed.
 */
export type TextbausteinSeed = {
  gewerk: string; // matched against gewerke.name at seed-time
  label: string;
  body: string;
};

export const TEXTBAUSTEINE_SEED: TextbausteinSeed[] = [
  // Maler
  { gewerk: 'Maler', label: 'Putz nicht eben', body: 'Der Putz ist nicht eben aufgetragen — Wellenbildung sichtbar. Bitte abschleifen und neu beschichten.' },
  { gewerk: 'Maler', label: 'Anstrich ungleichmäßig', body: 'Anstrich deckt nicht gleichmäßig — Schattierungen / Streifen sichtbar. Bitte zweiten Anstrich auftragen.' },
  { gewerk: 'Maler', label: 'Farbspritzer', body: 'Farbspritzer auf Boden / Steckdose / Fenster. Bitte fachgerecht entfernen.' },
  { gewerk: 'Maler', label: 'Übergang Decke', body: 'Übergang Wand zu Decke nicht sauber gezogen — Linie wellig. Nachbessern.' },

  // Fliesenleger
  { gewerk: 'Fliesenleger', label: 'Fugenbild ungleichmäßig', body: 'Fugenbreite variiert deutlich. Fliesen aufnehmen und neu verlegen.' },
  { gewerk: 'Fliesenleger', label: 'Silikonfuge unsauber', body: 'Silikonfuge weist Risse / Lücken auf. Bitte vollständig erneuern.' },
  { gewerk: 'Fliesenleger', label: 'Fliese gebrochen', body: 'Fliese ist gebrochen / abgeplatzt. Austauschen.' },
  { gewerk: 'Fliesenleger', label: 'Bodenablauf nicht bündig', body: 'Bodenablauf liegt nicht bündig zur Fliesenoberkante — Wasserstau möglich. Korrigieren.' },

  // Elektro
  { gewerk: 'Elektro', label: 'Steckdose schief', body: 'Steckdose nicht waagerecht montiert. Bitte ausrichten.' },
  { gewerk: 'Elektro', label: 'FI fehlt / defekt', body: 'FI-Schutzschalter fehlt oder löst nicht aus. Prüfen und ersetzen, Prüfprotokoll mitliefern.' },
  { gewerk: 'Elektro', label: 'Lichtschalter ohne Funktion', body: 'Lichtschalter ohne Funktion. Verkabelung prüfen.' },
  { gewerk: 'Elektro', label: 'Kabelende nicht eingeführt', body: 'Kabelende lose / nicht in Dose eingeführt. Fertig anschließen.' },

  // Sanitär/Heizung
  { gewerk: 'Sanitär/Heizung', label: 'Mischer tropft', body: 'Mischbatterie tropft. Dichtung erneuern.' },
  { gewerk: 'Sanitär/Heizung', label: 'WC nicht fest', body: 'WC sitzt nicht fest am Boden. Befestigung nachziehen.' },
  { gewerk: 'Sanitär/Heizung', label: 'Heizkörper kalt', body: 'Heizkörper wird oben kalt. Entlüften und Funktion prüfen.' },
  { gewerk: 'Sanitär/Heizung', label: 'Ablauf riecht', body: 'Geruch aus Bodenablauf — Geruchsverschluss prüfen.' },

  // Trockenbau
  { gewerk: 'Trockenbau', label: 'Spachtelung sichtbar', body: 'Spachtelübergänge zwischen Platten klar sichtbar. Q3-Spachtelung erforderlich.' },
  { gewerk: 'Trockenbau', label: 'Wand nicht lotrecht', body: 'Trockenbauwand nicht lotrecht. Korrigieren.' },

  // Parkett
  { gewerk: 'Parkett', label: 'Sockelleiste lose', body: 'Sockelleiste löst sich von der Wand. Neu befestigen.' },
  { gewerk: 'Parkett', label: 'Dehnungsfuge fehlt', body: 'Keine Dehnungsfuge zur Wand erkennbar — bei Klima-Belastung Verformungsrisiko. Fuge anlegen.' },
  { gewerk: 'Parkett', label: 'Kratzer in Oberfläche', body: 'Tiefer Kratzer in Parkettoberfläche — vermutlich durch Folgegewerk. Schleifen + neu versiegeln.' },

  // Türen
  { gewerk: 'Türen', label: 'Tür schleift', body: 'Tür schleift am Boden / Zarge. Höhe einstellen oder Türblatt kürzen.' },
  { gewerk: 'Türen', label: 'Schließblech versetzt', body: 'Schließblech sitzt versetzt — Tür schließt nicht richtig. Justieren.' },
  { gewerk: 'Türen', label: 'Dichtung lose', body: 'Türdichtung löst sich umlaufend. Erneuern.' },

  // Fenster
  { gewerk: 'Fenster', label: 'Fugenanschluss undicht', body: 'Anschluss Fenster zu Mauerwerk nicht winddicht — Zugluft. Fugenband nacharbeiten.' },
  { gewerk: 'Fenster', label: 'Fenster schließt nicht', body: 'Fensterflügel schließt nicht spaltfrei. Beschlag justieren.' },

  // Rohbau
  { gewerk: 'Rohbau', label: 'Beton nicht eben', body: 'Bodenplatte / Decke weist Unebenheiten > 5mm auf. Spachteln oder abschleifen.' },
  { gewerk: 'Rohbau', label: 'Mauerwerksfuge offen', body: 'Mauerwerksfuge nicht vollständig vermörtelt. Verschließen.' },

  // Außenanlagen
  { gewerk: 'Außenanlagen', label: 'Pflaster lose', body: 'Pflasterstein liegt lose / wackelt. Neu setzen.' },
  { gewerk: 'Außenanlagen', label: 'Gefälle falsch', body: 'Pflasterfläche hat Gegengefälle — Wasser läuft zum Gebäude. Aufnehmen und neu verlegen.' }
];
