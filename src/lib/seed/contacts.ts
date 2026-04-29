/**
 * Default Handwerker-Kontakte (Dummies). Echte Kontakte:
 * `data/contacts.csv` editieren und `pnpm seed:contacts` ausführen.
 */
export type ContactSeed = {
  gewerk: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
};

export const CONTACTS_DUMMY: ContactSeed[] = [
  { gewerk: 'Tiefbau',         company: 'Mustermann Tiefbau GmbH',      contactName: 'Hans Müller',     email: 'info@mustermann-tiefbau.de',    phone: '+49 791 11111', address: 'Hauptstr 1, 74523 Schwäbisch Hall' },
  { gewerk: 'Rohbau',          company: 'Beispiel Rohbau GmbH',         contactName: 'Peter Beispiel',  email: 'kontakt@beispiel-rohbau.de',    phone: '+49 791 11112', address: 'Hauptstr 2, 74523 Schwäbisch Hall' },
  { gewerk: 'Maler',           company: 'Mustermann Maler GmbH',        contactName: 'Hans Mustermann', email: 'info@mustermann-maler.de',      phone: '+49 791 12345', address: 'Hauptstr 3, 74523 Schwäbisch Hall' },
  { gewerk: 'Elektro',         company: 'Beispiel Elektro GmbH',        contactName: 'Karl Beispiel',   email: 'info@beispiel-elektro.de',      phone: '+49 791 11114', address: 'Hauptstr 4, 74523 Schwäbisch Hall' },
  { gewerk: 'Sanitär/Heizung', company: 'Mustermann Sanitär GmbH',      contactName: 'Otto Mustermann', email: 'info@mustermann-sanitaer.de',   phone: '+49 791 11115', address: 'Hauptstr 5, 74523 Schwäbisch Hall' },
  { gewerk: 'Trockenbau',      company: 'Beispiel Trockenbau GmbH',     contactName: 'Anna Beispiel',   email: 'info@beispiel-trockenbau.de',   phone: '+49 791 11116', address: 'Hauptstr 6, 74523 Schwäbisch Hall' },
  { gewerk: 'Fliesenleger',    company: 'Mustermann Fliesen GmbH',      contactName: 'Sabine Müller',   email: 'info@mustermann-fliesen.de',    phone: '+49 791 11117', address: 'Hauptstr 7, 74523 Schwäbisch Hall' },
  { gewerk: 'Estrich',         company: 'Beispiel Estrich GmbH',        contactName: 'Klaus Beispiel',  email: 'info@beispiel-estrich.de',      phone: '+49 791 11118', address: 'Hauptstr 8, 74523 Schwäbisch Hall' },
  { gewerk: 'Parkett',         company: 'Mustermann Parkett GmbH',      contactName: 'Marlene Müller',  email: 'info@mustermann-parkett.de',    phone: '+49 791 11119', address: 'Hauptstr 9, 74523 Schwäbisch Hall' },
  { gewerk: 'Türen',           company: 'Beispiel Türen GmbH',          contactName: 'Frank Beispiel',  email: 'info@beispiel-tueren.de',       phone: '+49 791 11120', address: 'Hauptstr 10, 74523 Schwäbisch Hall' },
  { gewerk: 'Schreiner',       company: 'Mustermann Schreinerei',       contactName: 'Werner Müller',   email: 'info@mustermann-schreiner.de',  phone: '+49 791 11121', address: 'Hauptstr 11, 74523 Schwäbisch Hall' },
  { gewerk: 'Schlosser',       company: 'Beispiel Schlosserei',         contactName: 'Brigitte Bsp.',   email: 'info@beispiel-schlosser.de',    phone: '+49 791 11122', address: 'Hauptstr 12, 74523 Schwäbisch Hall' },
  { gewerk: 'Fenster',         company: 'Mustermann Fensterbau',        contactName: 'Heinz Müller',    email: 'info@mustermann-fenster.de',    phone: '+49 791 11123', address: 'Hauptstr 13, 74523 Schwäbisch Hall' },
  { gewerk: 'Dämmung',         company: 'Beispiel Dämmtechnik',         contactName: 'Inge Beispiel',   email: 'info@beispiel-daemmung.de',     phone: '+49 791 11124', address: 'Hauptstr 14, 74523 Schwäbisch Hall' },
  { gewerk: 'Gerüstbau',       company: 'Mustermann Gerüstbau',         contactName: 'Jürgen Müller',   email: 'info@mustermann-geruest.de',    phone: '+49 791 11125', address: 'Hauptstr 15, 74523 Schwäbisch Hall' },
  { gewerk: 'Flachdach',       company: 'Beispiel Dachbau',             contactName: 'Lothar Beispiel', email: 'info@beispiel-flachdach.de',    phone: '+49 791 11126', address: 'Hauptstr 16, 74523 Schwäbisch Hall' },
  { gewerk: 'Außenanlagen',    company: 'Mustermann GaLaBau',           contactName: 'Petra Müller',    email: 'info@mustermann-galabau.de',    phone: '+49 791 11127', address: 'Hauptstr 17, 74523 Schwäbisch Hall' },
  { gewerk: 'Pflasterarbeiten',company: 'Beispiel Pflasterbau',         contactName: 'Roland Beispiel', email: 'info@beispiel-pflaster.de',     phone: '+49 791 11128', address: 'Hauptstr 18, 74523 Schwäbisch Hall' },
  { gewerk: 'Gärtner',         company: 'Mustermann Gärtnerei',         contactName: 'Renate Müller',   email: 'info@mustermann-gaertner.de',   phone: '+49 791 11129', address: 'Hauptstr 19, 74523 Schwäbisch Hall' },
  { gewerk: 'Aufzug',          company: 'Beispiel Aufzugstechnik GmbH', contactName: 'Stefan Bsp.',     email: 'info@beispiel-aufzug.de',       phone: '+49 791 11130', address: 'Hauptstr 20, 74523 Schwäbisch Hall' }
];
