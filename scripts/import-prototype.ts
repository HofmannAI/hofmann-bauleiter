/**
 * Import a JSON backup exported from the prototype's "Backup exportieren" feature.
 * Creates a new project + members + houses + apartments + tasks (+ checklist_progress
 * with notes/dates; photos must be re-uploaded — IndexedDB blobs aren't portable).
 *
 * Usage: pnpm import:prototype <path-to-backup.json> <user-email>
 *
 * The user-email must match an existing profile (i.e. that user has signed in once
 * via magic-link). The new project becomes their owner-membership.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import {
  profiles,
  projects,
  projectMembers,
  houses,
  apartments,
  tasks,
  checklistProgress,
  checklistItems,
  checklistSections,
  checklists
} from '../src/lib/db/schema';

const [, , filePath, ownerEmail] = process.argv;
if (!filePath || !ownerEmail) {
  console.error('Usage: pnpm import:prototype <backup.json> <owner-email>');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const client = postgres(url, { max: 1 });
const db = drizzle(client);

type ProtoBackup = {
  projects?: ProtoProject[];
  // legacy single-project root
  config?: ProtoProject['config'];
  items?: ProtoProject['items'];
  activity?: unknown[];
  schedule?: ProtoProject['schedule'];
  name?: string;
};
type ProtoProject = {
  id?: string;
  name?: string;
  config: { project: string; an?: string; bauleiter?: string; houses: { id: number; name: string; apartments: { id: number; name: string }[] }[] };
  items: Record<string, { done?: boolean; date?: string; notes?: string; photos?: { id: string; w?: number; h?: number }[] }>;
  schedule?: { tasks?: { id: string; num: string; name: string; duration?: number; start: string; end: string; parent: string | null; color: string; depth: number }[] };
};

const backup = JSON.parse(readFileSync(filePath, 'utf-8')) as ProtoBackup;
const projects_ = backup.projects ?? (backup.config ? [{ name: backup.name ?? backup.config.project, config: backup.config, items: backup.items ?? {}, schedule: backup.schedule } as ProtoProject] : []);
console.log(`[import] found ${projects_.length} project(s) in backup`);

const [owner] = await db.select().from(profiles).where(eq(profiles.email, ownerEmail.toLowerCase())).limit(1);
if (!owner) {
  console.error(`Owner profile for ${ownerEmail} not found. The user must sign in once before importing.`);
  process.exit(1);
}

for (const p of projects_) {
  console.log(`[import] importing "${p.config.project}" …`);
  const [proj] = await db
    .insert(projects)
    .values({ name: p.config.project || p.name || 'Importiertes Projekt', an: p.config.an ?? 'Hofmann Haus', createdBy: owner.id })
    .returning({ id: projects.id });

  await db.insert(projectMembers).values({ projectId: proj.id, userId: owner.id, role: 'owner' });

  // Houses + apartments — keep prototype's numeric ids as sortOrder
  const houseIdMap = new Map<number, string>();
  const aptIdMap = new Map<string, string>();
  for (const h of p.config.houses) {
    const [hRow] = await db
      .insert(houses)
      .values({ projectId: proj.id, name: h.name, sortOrder: h.id })
      .returning({ id: houses.id });
    houseIdMap.set(h.id, hRow.id);
    for (const a of h.apartments) {
      const [aRow] = await db
        .insert(apartments)
        .values({ houseId: hRow.id, name: a.name, sortOrder: a.id })
        .returning({ id: apartments.id });
      aptIdMap.set(`${h.id}:${a.id}`, aRow.id);
    }
  }

  // Tasks
  const taskIdMap = new Map<string, string>();
  for (const t of p.schedule?.tasks ?? []) {
    const [tRow] = await db
      .insert(tasks)
      .values({
        projectId: proj.id,
        num: t.num,
        name: t.name,
        startDate: t.start,
        endDate: t.end,
        durationAt: t.duration ?? null,
        color: t.color ?? null,
        depth: t.depth ?? 0,
        sortOrder: taskIdMap.size,
        parentId: null
      })
      .returning({ id: tasks.id });
    taskIdMap.set(t.id, tRow.id);
  }
  for (const t of p.schedule?.tasks ?? []) {
    if (!t.parent) continue;
    const child = taskIdMap.get(t.id);
    const par = taskIdMap.get(t.parent);
    if (child && par) await db.execute(`UPDATE tasks SET parent_id = '${par}' WHERE id = '${child}'`);
  }

  // Checklist progress
  // Item key in prototype: "{checklistId}|{sectionIdx}|{itemIdx}|{scopeKey}"
  // We need to map that to checklist_items.id by its catalog seed.
  const allItems = await db
    .select({
      id: checklistItems.id,
      sectionId: checklistItems.sectionId,
      sortOrder: checklistItems.sortOrder,
      checklistId: checklists.id,
      checklistSortOrder: checklists.sortOrder,
      sectionSortOrder: checklistSections.sortOrder
    })
    .from(checklistItems)
    .innerJoin(checklistSections, eq(checklistSections.id, checklistItems.sectionId))
    .innerJoin(checklists, eq(checklists.id, checklistSections.checklistId));

  let imported = 0, skipped = 0;
  for (const [key, value] of Object.entries(p.items ?? {})) {
    const parts = key.split('|');
    if (parts.length !== 4) { skipped++; continue; }
    const [protoCl, sIdxStr, iIdxStr, scopeKeyRaw] = parts;
    const sIdx = parseInt(sIdxStr, 10);
    const iIdx = parseInt(iIdxStr, 10);
    const clNum = parseInt(protoCl, 10);

    const item = allItems.find(
      (x) =>
        x.checklistSortOrder === clNum &&
        x.sectionSortOrder === sIdx &&
        x.sortOrder === iIdx
    );
    if (!item) { skipped++; continue; }

    // Translate scopeKey: prototype uses h:<id>:a:<id> with prototype's house/apt numeric ids
    let scopeKey = scopeKeyRaw;
    const m = scopeKeyRaw.match(/^h:(\d+)(?::a:(\d+))?$/);
    if (m) {
      const hId = parseInt(m[1], 10);
      const aId = m[2] ? parseInt(m[2], 10) : null;
      const realHouseId = houseIdMap.get(hId);
      if (!realHouseId) { skipped++; continue; }
      scopeKey = aId
        ? `h:${realHouseId}:a:${aptIdMap.get(`${hId}:${aId}`) ?? ''}`
        : `h:${realHouseId}`;
    }

    await db.insert(checklistProgress).values({
      projectId: proj.id,
      itemId: item.id,
      scopeKey,
      done: !!value.done,
      doneDate: value.date || null,
      doneBy: value.done ? owner.id : null,
      notes: value.notes || null
    });
    imported++;
  }
  console.log(`[import] checklist_progress: imported ${imported}, skipped ${skipped}`);
  console.log(`[import] project "${p.config.project}" done — id ${proj.id}`);
}

await client.end();
console.log('[import] all done.');
