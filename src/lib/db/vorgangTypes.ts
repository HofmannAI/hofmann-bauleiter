/**
 * VOB-Vorgang-Typen + Labels — DB-frei, browser-safe.
 * `vorgangQueries.ts` re-exportiert dieselben Konstanten für SSR-Code.
 */
export type VorgangPartei = 'AN' | 'AG';
export type VorgangStatus =
  | 'erfasst'
  | 'angezeigt'
  | 'nachfrist'
  | 'klaerung'
  | 'freigemeldet_NU'
  | 'abgelehnt_NU'
  | 'kontrolle_AG'
  | 'erledigt'
  | 'ersatzvornahme'
  | 'notiz';

export const VORGANG_STATUS_LABEL: Record<VorgangStatus, string> = {
  erfasst: 'Erfasst',
  angezeigt: 'Angezeigt',
  nachfrist: 'Nachfrist',
  klaerung: 'Klärung',
  freigemeldet_NU: 'Freigemeldet (NU)',
  abgelehnt_NU: 'Abgelehnt (NU)',
  kontrolle_AG: 'Kontrolle (AG)',
  erledigt: 'Erledigt',
  ersatzvornahme: 'Ersatzvornahme',
  notiz: 'Notiz'
};

export const VORGANG_STATUS_TINT: Record<VorgangStatus, string> = {
  erfasst: 'grey',
  angezeigt: 'amber',
  nachfrist: 'red',
  klaerung: 'blue',
  freigemeldet_NU: 'green',
  abgelehnt_NU: 'red',
  kontrolle_AG: 'amber',
  erledigt: 'green',
  ersatzvornahme: 'red',
  notiz: 'grey'
};
