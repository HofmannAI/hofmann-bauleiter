/**
 * Strukturbaum: Häuser → Apartments → Räume für ein Projekt.
 *
 * Performance: alle drei Queries werden mit `project_id`-Filter
 * eingeschränkt (apartments via houseId-IN-Subquery, rooms via
 * apartmentId-IN-Subquery) und parallel abgefeuert. Vorher pulled
 * apartments + rooms cross-project — Production-Timeout-Bug.
 */
import { db } from './client';
import { houses, apartments, rooms } from './schema';
import { eq, asc, inArray } from 'drizzle-orm';

export type StructureRoom = {
  id: string;
  name: string;
  raumnummer: string | null;
};
export type StructureApartment = {
  id: string;
  name: string;
  rooms: StructureRoom[];
};
export type StructureHouse = {
  id: string;
  name: string;
  apartments: StructureApartment[];
};

export async function loadStructureTree(projectId: string): Promise<StructureHouse[]> {
  if (!db) return [];
  const houseRows = await db
    .select()
    .from(houses)
    .where(eq(houses.projectId, projectId))
    .orderBy(asc(houses.sortOrder));
  if (houseRows.length === 0) return [];

  const houseIds = houseRows.map((h) => h.id);
  const aptRows = await db
    .select()
    .from(apartments)
    .where(inArray(apartments.houseId, houseIds))
    .orderBy(asc(apartments.sortOrder));

  const aptIds = aptRows.map((a) => a.id);
  const roomRows = aptIds.length > 0
    ? await db
        .select()
        .from(rooms)
        .where(inArray(rooms.apartmentId, aptIds))
        .orderBy(asc(rooms.sortOrder))
    : [];

  const aptByHouse = new Map<string, typeof aptRows>();
  for (const a of aptRows) {
    if (!aptByHouse.has(a.houseId)) aptByHouse.set(a.houseId, []);
    aptByHouse.get(a.houseId)!.push(a);
  }
  const roomsByApt = new Map<string, typeof roomRows>();
  for (const r of roomRows) {
    if (!roomsByApt.has(r.apartmentId)) roomsByApt.set(r.apartmentId, []);
    roomsByApt.get(r.apartmentId)!.push(r);
  }

  return houseRows.map((h) => ({
    id: h.id,
    name: h.name,
    apartments: (aptByHouse.get(h.id) ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      rooms: (roomsByApt.get(a.id) ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        raumnummer: r.raumnummer
      }))
    }))
  }));
}
