/**
 * VOB-Vorgangs-Historie pro Mangel. Server-only — importiert Drizzle/Postgres.
 * Browser-Code nutzt `vorgangTypes.ts` für Labels/Types.
 */
import { db } from './client';
import { defectVorgaenge, briefVorlagen, firmaSettings, defects } from './schema';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import type { VorgangPartei, VorgangStatus } from './vorgangTypes';
export type { VorgangPartei, VorgangStatus } from './vorgangTypes';
export { VORGANG_STATUS_LABEL, VORGANG_STATUS_TINT } from './vorgangTypes';

export type VorgangRow = typeof defectVorgaenge.$inferSelect;

export async function listVorgaenge(defectId: string): Promise<VorgangRow[]> {
  if (!db) return [];
  return await db
    .select()
    .from(defectVorgaenge)
    .where(eq(defectVorgaenge.defectId, defectId))
    .orderBy(desc(defectVorgaenge.createdAt));
}

/**
 * Liefert den letzten Eintrag pro Spur — nutzbar in Listen-Aggregaten ohne
 * separate Round-Trips pro Mangel.
 */
export async function lastVorgangPerPartei(defectId: string): Promise<{
  AN: VorgangRow | null;
  AG: VorgangRow | null;
}> {
  if (!db) return { AN: null, AG: null };
  const rows = await db
    .select()
    .from(defectVorgaenge)
    .where(eq(defectVorgaenge.defectId, defectId))
    .orderBy(desc(defectVorgaenge.createdAt));
  return {
    AN: rows.find((r) => r.partei === 'AN') ?? null,
    AG: rows.find((r) => r.partei === 'AG') ?? null
  };
}

export type AddVorgangInput = {
  defectId: string;
  partei: VorgangPartei;
  status: VorgangStatus;
  beschreibung?: string | null;
  termin?: string | null;
  terminAntwort?: string | null;
  documentId?: string | null;
  documentUrl?: string | null;
  createdBy: string;
};

export async function addVorgang(input: AddVorgangInput): Promise<VorgangRow | null> {
  if (!db) return null;
  const [row] = await db.insert(defectVorgaenge).values({
    defectId: input.defectId,
    partei: input.partei,
    status: input.status,
    beschreibung: input.beschreibung ?? null,
    termin: input.termin ?? null,
    terminAntwort: input.terminAntwort ?? null,
    documentId: input.documentId ?? null,
    documentUrl: input.documentUrl ?? null,
    createdBy: input.createdBy
  }).returning();
  return row;
}

export async function listBriefVorlagen(projectId: string | null) {
  if (!db) return [];
  if (projectId) {
    return await db
      .select()
      .from(briefVorlagen)
      .where(sql`${briefVorlagen.projectId} IS NULL OR ${briefVorlagen.projectId} = ${projectId}`)
      .orderBy(asc(briefVorlagen.typ), asc(briefVorlagen.name));
  }
  return await db.select().from(briefVorlagen).orderBy(asc(briefVorlagen.typ), asc(briefVorlagen.name));
}

export async function getFirmaSettings() {
  if (!db) return null;
  const [row] = await db.select().from(firmaSettings).limit(1);
  return row ?? null;
}

/**
 * Aggregiert für die Mängel-Liste: ein Map defectId → letzter AN/AG-Status.
 *
 * Strategie: Zuerst die defect_ids des Projekts holen (via defects-Tabelle,
 * die bereits RLS-gefiltert ist), dann Vorgänge direkt per defect_id IN (...)
 * laden. Das vermeidet den JOIN durch RLS auf defect_vorgaenge.
 *
 * Falls keine Defects: early return (kein DB-Hit auf vorgaenge).
 */
export async function vorgaengeByProject(projectId: string): Promise<
  Map<string, { AN: VorgangRow | null; AG: VorgangRow | null }>
> {
  const out = new Map<string, { AN: VorgangRow | null; AG: VorgangRow | null }>();
  if (!db) return out;

  // Schritt 1: Defect-IDs des Projekts (RLS auf defects greift hier)
  const defectRows = await db
    .select({ id: defects.id })
    .from(defects)
    .where(eq(defects.projectId, projectId));

  if (defectRows.length === 0) return out;
  const defectIds = defectRows.map(d => d.id);

  // Schritt 2: Vorgänge per defect_id IN (...) — nutzt dv_defect_partei_idx
  // In Batches falls >500 Defects (vermeidet zu langen IN-Ausdruck)
  const BATCH = 500;
  const allVorgaenge: VorgangRow[] = [];
  for (let i = 0; i < defectIds.length; i += BATCH) {
    const batch = defectIds.slice(i, i + BATCH);
    const rows = await db
      .select()
      .from(defectVorgaenge)
      .where(inArray(defectVorgaenge.defectId, batch))
      .orderBy(desc(defectVorgaenge.createdAt));
    allVorgaenge.push(...rows);
  }

  // Schritt 3: Pro (defect_id, partei) nur den neuesten behalten
  for (const v of allVorgaenge) {
    const cur = out.get(v.defectId) ?? { AN: null, AG: null };
    if (v.partei === 'AN' && !cur.AN) cur.AN = v;
    else if (v.partei === 'AG' && !cur.AG) cur.AG = v;
    out.set(v.defectId, cur);
  }
  return out;
}
