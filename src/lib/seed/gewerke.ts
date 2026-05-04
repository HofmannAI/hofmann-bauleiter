/**
 * Gewerke seed catalog. Colors mirror prototype's TASK_COLORS plus extras.
 * `defaultPerApartment`: true for trades that work apartment-by-apartment
 * (Maler, Fliesenleger, Elektro, Sanitär, Parkett, Türen).
 */
export const GEWERKE_SEED = [
  { name: 'Tiefbau', color: '#E8833A', defaultPerApartment: false, sortOrder: 1 },
  { name: 'Rohbau', color: '#3B6CC4', defaultPerApartment: false, sortOrder: 2 },
  { name: 'Flachdach', color: '#3FAA60', defaultPerApartment: false, sortOrder: 3 },
  { name: 'Dämmung', color: '#D4A22A', defaultPerApartment: false, sortOrder: 4 },
  { name: 'Gerüstbau', color: '#7A7570', defaultPerApartment: false, sortOrder: 5 },
  { name: 'Fenster', color: '#C9482F', defaultPerApartment: false, sortOrder: 6 },
  { name: 'Maler', color: '#9F4EAB', defaultPerApartment: true, sortOrder: 7 },
  { name: 'Elektro', color: '#F4B400', defaultPerApartment: true, sortOrder: 8 },
  { name: 'Sanitär/Heizung', color: '#1E96A8', defaultPerApartment: true, sortOrder: 9 },
  { name: 'Trockenbau', color: '#8C7B70', defaultPerApartment: true, sortOrder: 10 },
  { name: 'Fliesenleger', color: '#3F8AB5', defaultPerApartment: true, sortOrder: 11 },
  { name: 'Estrich', color: '#A38B5C', defaultPerApartment: false, sortOrder: 12 },
  { name: 'Parkett', color: '#8B5A2B', defaultPerApartment: true, sortOrder: 13 },
  { name: 'Türen', color: '#5C4A3A', defaultPerApartment: true, sortOrder: 14 },
  { name: 'Schreiner', color: '#7CB246', defaultPerApartment: false, sortOrder: 15 },
  { name: 'Schlosser', color: '#5B6770', defaultPerApartment: false, sortOrder: 16 },
  { name: 'Außenanlagen', color: '#7CB246', defaultPerApartment: false, sortOrder: 17 },
  { name: 'Pflasterarbeiten', color: '#9C7B65', defaultPerApartment: false, sortOrder: 18 },
  { name: 'Gärtner', color: '#5C8C3F', defaultPerApartment: false, sortOrder: 19 },
  { name: 'Aufzug', color: '#445C70', defaultPerApartment: false, sortOrder: 20 },
  { name: 'Abdichtung', color: '#2196F3', defaultPerApartment: false, sortOrder: 21 },
  { name: 'Putzer', color: '#FF9800', defaultPerApartment: true, sortOrder: 22 },
  { name: 'Fußbodenheizung', color: '#00BCD4', defaultPerApartment: true, sortOrder: 23 },
  { name: 'Reinigung', color: '#607D8B', defaultPerApartment: false, sortOrder: 24 },
  { name: 'Flaschner', color: '#795548', defaultPerApartment: false, sortOrder: 25 },
  { name: 'Treppenhaus', color: '#9E9E9E', defaultPerApartment: false, sortOrder: 26 },
  { name: 'Steigleitungen', color: '#00897B', defaultPerApartment: false, sortOrder: 27 },
  { name: 'Toreinbau', color: '#546E7A', defaultPerApartment: false, sortOrder: 28 },
  { name: 'Haustüren', color: '#8D6E63', defaultPerApartment: false, sortOrder: 29 }
] as const;

export type GewerkSeed = (typeof GEWERKE_SEED)[number];
