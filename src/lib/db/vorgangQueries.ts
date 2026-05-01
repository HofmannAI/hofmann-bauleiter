/**
 * VOB-Vorgangs-Historie pro Mangel. Server-only — importiert Drizzle/Postgres.
 * Browser-Code nutzt `vorgangTypes.ts` für Labels/Types.
 */
import { db } from './client';
import { defectVorgaenge, briefVorlagen, firmaSettings, defects } from './schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
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
 * Eine einzige DB-Query mit DISTINCT ON — liefert pro (defect_id, partei)
 * nur den neuesten Vorgang. Nutzt Index dv_defect_partei_idx auf
 * (defect_id, partei, created_at DESC).
 */
export async function vorgaengeByProject(projectId: string): Promise<
  Map<string, { AN: VorgangRow | null; AG: VorgangRow | null }>
> {
  const out = new Map<string, { AN: VorgangRow | null; AG: VorgangRow | null }>();
  if (!db) return out;
  // DISTINCT ON gibt pro Gruppe nur die erste Row zurück → mit
  // ORDER BY created_at DESC ist das die neueste pro (defect, partei).
  // Drastisch weniger Daten als "alle Vorgänge des Projekts".
  const rows = await db.execute<VorgangRow>(sql`
    SELECT DISTINCT ON (v.defect_id, v.partei)
      v.id, v.defect_id AS "defectId", v.partei, v.status,
      v.beschreibung, v.termin, v.termin_antwort AS "terminAntwort",
      v.document_id AS "documentId", v.document_url AS "documentUrl",
      v.created_by AS "createdBy", v.created_at AS "createdAt"
    FROM defect_vorgaenge v
    INNER JOIN defects d ON d.id = v.defect_id
    WHERE d.project_id = ${projectId}
    ORDER BY v.defect_id, v.partei, v.created_at DESC
  `);
  for (const v of rows) {
    const cur = out.get(v.defectId) ?? { AN: null, AG: null };
    if (v.partei === 'AN') cur.AN = v;
    else if (v.partei === 'AG') cur.AG = v;
    out.set(v.defectId, cur);
  }
  return out;
}
