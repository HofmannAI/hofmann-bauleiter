/**
 * German-language relative time utility, ported from the prototype's `timeAgo`.
 */
export function timeAgo(ts: Date | string | number): string {
  const t = typeof ts === 'object' ? ts.getTime() : new Date(ts).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'gerade eben';
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
  return new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateDe(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
