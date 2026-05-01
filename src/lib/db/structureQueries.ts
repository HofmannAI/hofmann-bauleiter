/**
 * Strukturbaum: Häuser → Apartments → Räume für ein Projekt.
 * Eine SSR-Query holt alles in 2 DB-Round-Trips.
 */
import { db } from './client';
import { houses, apartments, rooms } from './schema';
import { eq, asc } from 'drizzle-orm';

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

  const aptRows = await db
    .select()
    .from(apartments)
    .orderBy(asc(apartments.sortOrder));
  const roomRows = await db.select().from(rooms).orderBy(asc(rooms.sortOrder));

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
    apartments: (aptByHouse.get(h.id) ?? [])
      .filter((a) => houseRows.some((hh) => hh.id === a.houseId && hh.projectId === projectId))
      .map((a) => ({
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
