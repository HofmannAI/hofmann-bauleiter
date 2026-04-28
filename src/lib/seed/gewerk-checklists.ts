/**
 * Per-Gewerk-Checklisten je Wohnung (Bruders Punkt aus Spec §5.11).
 * Bauleiter hakt diese Items pro Wohnung ab — z.B. wenn Maler in Wohnung 3
 * fertig ist, prüft er die 8 Maler-Items und schießt Fotos.
 */
export type GewerkChecklistTemplateSeed = {
  gewerk: string;
  item: string;
  requiresPhoto: boolean;
};

export const GEWERK_CHECKLIST_TEMPLATES: GewerkChecklistTemplateSeed[] = [
  // Maler
  { gewerk: 'Maler', item: 'Wände gleichmäßig gespachtelt, keine Ausbrüche', requiresPhoto: true },
  { gewerk: 'Maler', item: 'Schleifstaub vollständig entfernt', requiresPhoto: false },
  { gewerk: 'Maler', item: 'Anstrich deckend, gleichmäßig (zwei Anstriche)', requiresPhoto: true },
  { gewerk: 'Maler', item: 'Übergänge zu Decke und Boden sauber', requiresPhoto: true },
  { gewerk: 'Maler', item: 'Kein Farbspritzer auf Steckdosen, Türen, Fenster', requiresPhoto: false },
  { gewerk: 'Maler', item: 'Heizungsnischen lackiert', requiresPhoto: false },
  { gewerk: 'Maler', item: 'Decken-Anstrich ohne Schattierungen', requiresPhoto: true },
  { gewerk: 'Maler', item: 'Türzargen lackiert / verkleidet', requiresPhoto: false },

  // Fliesenleger
  { gewerk: 'Fliesenleger', item: 'Fliesen lot- und winkelgerecht', requiresPhoto: true },
  { gewerk: 'Fliesenleger', item: 'Fugenbild gleichmäßig, ohne Versatz', requiresPhoto: true },
  { gewerk: 'Fliesenleger', item: 'Silikonfugen sauber, kein Schimmelnährboden', requiresPhoto: true },
  { gewerk: 'Fliesenleger', item: 'Eckfliesen ohne Brüche', requiresPhoto: false },
  { gewerk: 'Fliesenleger', item: 'Bodenabläufe bündig, mit Gefälle', requiresPhoto: true },
  { gewerk: 'Fliesenleger', item: 'Wandanschluss zu Estrich abgedichtet', requiresPhoto: false },
  { gewerk: 'Fliesenleger', item: 'Übergang Dusche / Badewanne dicht', requiresPhoto: true },
  { gewerk: 'Fliesenleger', item: 'Reststaub entfernt, Fliesen gereinigt', requiresPhoto: false },

  // Elektro
  { gewerk: 'Elektro', item: 'Alle Steckdosen funktionsfähig (FI getestet)', requiresPhoto: false },
  { gewerk: 'Elektro', item: 'Schalter beschriftet im Sicherungskasten', requiresPhoto: true },
  { gewerk: 'Elektro', item: 'Lichtschalter waagerecht montiert', requiresPhoto: false },
  { gewerk: 'Elektro', item: 'LAN/TV-Dosen vorhanden lt. Plan', requiresPhoto: false },
  { gewerk: 'Elektro', item: 'Rauchmelder installiert und getestet', requiresPhoto: true },
  { gewerk: 'Elektro', item: 'Klingel + Türöffner funktionsfähig', requiresPhoto: false },
  { gewerk: 'Elektro', item: 'Herdanschluss nach VDE', requiresPhoto: false },

  // Sanitär/Heizung
  { gewerk: 'Sanitär/Heizung', item: 'Heizkörper / FBH funktionsfähig, kein Lufteinschluss', requiresPhoto: false },
  { gewerk: 'Sanitär/Heizung', item: 'Wasserzähler abgelesen und protokolliert', requiresPhoto: true },
  { gewerk: 'Sanitär/Heizung', item: 'Mischbatterien dicht, kein Tropfen', requiresPhoto: false },
  { gewerk: 'Sanitär/Heizung', item: 'WC sicher montiert, Spülung dicht', requiresPhoto: true },
  { gewerk: 'Sanitär/Heizung', item: 'Dusche/Wanne Ablauf frei, kein Geruch', requiresPhoto: false },
  { gewerk: 'Sanitär/Heizung', item: 'Übergabeprotokoll Heizung unterschrieben', requiresPhoto: true },

  // Parkett
  { gewerk: 'Parkett', item: 'Verlegerichtung abgestimmt mit Bauleiter', requiresPhoto: false },
  { gewerk: 'Parkett', item: 'Dehnungsfugen an Wänden vorhanden (8-10 mm)', requiresPhoto: true },
  { gewerk: 'Parkett', item: 'Sockelleisten sauber montiert', requiresPhoto: true },
  { gewerk: 'Parkett', item: 'Übergangsschienen (Bad/Diele) bündig', requiresPhoto: false },
  { gewerk: 'Parkett', item: 'Oberfläche kratzerfrei, Versiegelung gleichmäßig', requiresPhoto: true },

  // Türen
  { gewerk: 'Türen', item: 'Türzarge lot- und winkelrecht', requiresPhoto: false },
  { gewerk: 'Türen', item: 'Türblatt schließt ohne Schleifen', requiresPhoto: false },
  { gewerk: 'Türen', item: 'Drücker fest, Schließblech ausgerichtet', requiresPhoto: false },
  { gewerk: 'Türen', item: 'Dichtung umlaufend, Tür schließt dicht', requiresPhoto: false }
];
