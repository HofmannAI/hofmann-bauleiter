/**
 * Idempotent seeder. Run after `pnpm db:migrate`.
 *
 * Seeds:
 * - profiles (7 bauleiter — only if auth.users entries exist for them; otherwise skip)
 * - gewerke catalog (~20)
 * - checklists / checklist_sections / checklist_items
 * - gewerk_checklist_templates
 * - global contacts (gewerk dummies — see data/contacts.csv for production)
 *
 * Note: profiles are linked to auth.users via FK. To create an auth.users entry,
 * use Supabase Auth (magic-link signup). On first magic-link login of a new
 * bauleiter, a `handle_new_user` trigger (see RLS migration) will auto-create
 * the profile row.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql, eq } from 'drizzle-orm';
import {
  gewerke,
  checklists,
  checklistSections,
  checklistItems,
  gewerkChecklistTemplates,
  contacts
} from '../src/lib/db/schema';
import { GEWERKE_SEED } from '../src/lib/seed/gewerke';
import { CHECKLISTS } from '../src/lib/seed/checklists';
import { GEWERK_CHECKLIST_TEMPLATES } from '../src/lib/seed/gewerk-checklists';
import { CONTACTS_DUMMY } from '../src/lib/seed/contacts';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[seed] DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

async function seedGewerke() {
  console.log('[seed] gewerke …');
  for (const g of GEWERKE_SEED) {
    await db
      .insert(gewerke)
      .values({
        name: g.name,
        color: g.color,
        defaultPerApartment: g.defaultPerApartment,
        sortOrder: g.sortOrder
      })
      .onConflictDoUpdate({
        target: gewerke.name,
        set: { color: g.color, defaultPerApartment: g.defaultPerApartment, sortOrder: g.sortOrder }
      });
  }
}

async function seedChecklists() {
  console.log('[seed] checklists …');
  // Strategy: wipe + reinsert. Catalog tables are not project-scoped and
  // checklist_progress.itemId references checklist_items (cascades on delete).
  // To preserve progress, we'd need stable ids — not in v1.
  await db.execute(sql`DELETE FROM checklist_items`);
  await db.execute(sql`DELETE FROM checklist_sections`);
  await db.execute(sql`DELETE FROM checklists`);

  for (const cl of CHECKLISTS) {
    const [insertedCl] = await db
      .insert(checklists)
      .values({
        num: parseInt(cl.num, 10) || 0,
        title: cl.title,
        scope: cl.scope,
        sortOrder: parseInt(cl.id, 10) || 0
      })
      .returning({ id: checklists.id });

    for (let si = 0; si < cl.sections.length; si++) {
      const sec = cl.sections[si];
      const [insertedSec] = await db
        .insert(checklistSections)
        .values({ checklistId: insertedCl.id, title: sec.title ?? null, sortOrder: si })
        .returning({ id: checklistSections.id });

      for (let ii = 0; ii < sec.items.length; ii++) {
        await db
          .insert(checklistItems)
          .values({ sectionId: insertedSec.id, text: sec.items[ii], sortOrder: ii });
      }
    }
  }
}

async function seedGewerkChecklistTemplates() {
  console.log('[seed] gewerk_checklist_templates …');
  await db.execute(sql`DELETE FROM gewerk_checklist_templates`);
  // Build name -> id map
  const allGewerke = await db.select().from(gewerke);
  const byName = new Map(allGewerke.map((g) => [g.name, g.id]));

  for (let i = 0; i < GEWERK_CHECKLIST_TEMPLATES.length; i++) {
    const tmpl = GEWERK_CHECKLIST_TEMPLATES[i];
    const gid = byName.get(tmpl.gewerk);
    if (!gid) {
      console.warn(`[seed] unknown gewerk in template: ${tmpl.gewerk} — skipped`);
      continue;
    }
    await db.insert(gewerkChecklistTemplates).values({
      gewerkId: gid,
      item: tmpl.item,
      requiresPhoto: tmpl.requiresPhoto,
      sortOrder: i
    });
  }
}

async function seedGlobalContacts() {
  console.log('[seed] contacts (global dummies) …');
  // Only insert dummies if no global contact exists yet — don't overwrite real ones.
  const existing = await db.select().from(contacts).where(sql`project_id IS NULL`).limit(1);
  if (existing.length > 0) {
    console.log('[seed] global contacts already present — skipping');
    return;
  }
  const allGewerke = await db.select().from(gewerke);
  const byName = new Map(allGewerke.map((g) => [g.name, g.id]));

  for (const c of CONTACTS_DUMMY) {
    const gid = byName.get(c.gewerk);
    if (!gid) continue;
    await db.insert(contacts).values({
      projectId: null,
      gewerkId: gid,
      company: c.company,
      contactName: c.contactName,
      email: c.email,
      phone: c.phone,
      address: c.address
    });
  }
}

await seedGewerke();
await seedChecklists();
await seedGewerkChecklistTemplates();
await seedGlobalContacts();
console.log('[seed] done.');
await client.end();
