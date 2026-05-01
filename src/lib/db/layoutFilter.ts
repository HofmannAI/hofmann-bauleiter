/**
 * Browser-safe Filter-Auswertung für Defect-Layouts.
 * Spec der Filter-JSON-Struktur (siehe Migration 0011 Default-Layouts):
 *
 *   { statusIn?: string[]
 *   , statusNotIn?: string[]
 *   , anStatusIn?: string[]
 *   , agStatusIn?: string[]
 *   , gewerkIdIn?: string[]
 *   , dueDateBefore?: 'today' | YYYY-MM-DD
 *   , dueDateOnOrAfter?: 'today' | YYYY-MM-DD
 *   , missingFields?: ('gewerkId'|'description'|'contactId'|'apartmentId')[]
 *   }
 */

export type DefectFilterJson = {
  statusIn?: string[];
  statusNotIn?: string[];
  anStatusIn?: string[];
  agStatusIn?: string[];
  gewerkIdIn?: string[];
  dueDateBefore?: string;
  dueDateOnOrAfter?: string;
  missingFields?: string[];
};

export type DefectListRow = {
  id: string;
  status: string;
  gewerkId: string | null;
  description?: string | null;
  contactId?: string | null;
  apartmentId?: string | null;
  dueDate?: string | null;
  deadline?: string | null;
};

export type VorgangAggregate = {
  defectId: string;
  anStatus: string | null;
  anTermin: string | null;
  agStatus: string | null;
};

function resolveDate(s: string): string {
  if (s === 'today') return new Date().toISOString().slice(0, 10);
  return s;
}

export function matchDefectFilter(
  d: DefectListRow,
  filter: DefectFilterJson,
  vorgangByDefect: Map<string, VorgangAggregate>
): boolean {
  if (filter.statusIn && filter.statusIn.length > 0 && !filter.statusIn.includes(d.status)) return false;
  if (filter.statusNotIn && filter.statusNotIn.includes(d.status)) return false;

  const v = vorgangByDefect.get(d.id);
  if (filter.anStatusIn && filter.anStatusIn.length > 0) {
    const cur = v?.anStatus ?? 'erfasst';
    if (!filter.anStatusIn.includes(cur)) return false;
  }
  if (filter.agStatusIn && filter.agStatusIn.length > 0) {
    if (!v?.agStatus || !filter.agStatusIn.includes(v.agStatus)) return false;
  }

  if (filter.gewerkIdIn && filter.gewerkIdIn.length > 0) {
    if (!d.gewerkId || !filter.gewerkIdIn.includes(d.gewerkId)) return false;
  }

  // Due-date kombiniert defects.dueDate (aus VOB-Workflow) ODER defects.deadline (alt)
  const due = d.dueDate ?? d.deadline ?? null;
  if (filter.dueDateBefore) {
    const ref = resolveDate(filter.dueDateBefore);
    if (!due || due >= ref) return false;
  }
  if (filter.dueDateOnOrAfter) {
    const ref = resolveDate(filter.dueDateOnOrAfter);
    if (!due || due < ref) return false;
  }

  if (filter.missingFields) {
    for (const f of filter.missingFields) {
      const k = f as keyof DefectListRow;
      const val = d[k];
      if (val !== null && val !== undefined && val !== '') return false;
    }
  }

  return true;
}

export type GroupKey = 'gewerk' | 'status' | 'frist' | 'firma';

export function groupDefects<T extends DefectListRow & { gewerkName?: string | null }>(
  rows: T[],
  group: GroupKey | null,
  vorgangByDefect: Map<string, VorgangAggregate>
): Array<{ key: string; label: string; rows: T[] }> {
  if (!group) return [{ key: 'all', label: '', rows }];
  const buckets = new Map<string, T[]>();
  for (const r of rows) {
    let key = 'andere';
    if (group === 'gewerk') key = r.gewerkName ?? 'Ohne Gewerk';
    else if (group === 'status') {
      const v = vorgangByDefect.get(r.id);
      key = v?.anStatus ?? r.status ?? 'unbekannt';
    } else if (group === 'frist') {
      const due = r.dueDate ?? r.deadline ?? null;
      const today = new Date().toISOString().slice(0, 10);
      if (!due) key = 'Ohne Frist';
      else if (due < today) key = 'Überfällig';
      else if (due === today) key = 'Heute';
      else key = 'In der Zukunft';
    }
    const arr = buckets.get(key) ?? [];
    arr.push(r);
    buckets.set(key, arr);
  }
  return Array.from(buckets.entries()).map(([key, rows]) => ({ key, label: key, rows }));
}
