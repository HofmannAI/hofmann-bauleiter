/**
 * REST-API-basierter Seeder.
 *
 * Wird genutzt, wenn der direkte Postgres-Pool nicht erreichbar ist (z.B.
 * aus restricted-egress-Containern, die nur HTTPS rauslassen). Verwendet
 * @supabase/supabase-js mit Service-Role-Key — bypasst RLS.
 *
 * Idempotent: nutzt upsert wo möglich; Catalog-Tabellen werden zuerst
 * geleert.
 *
 * Aufruf: pnpm seed (wechselt automatisch hierauf, wenn Postgres-Pool
 * timeout), oder explizit: tsx scripts/seed-rest.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GEWERKE_SEED } from '../src/lib/seed/gewerke';
import { CHECKLISTS } from '../src/lib/seed/checklists';
import { GEWERK_CHECKLIST_TEMPLATES } from '../src/lib/seed/gewerk-checklists';
import { CONTACTS_DUMMY } from '../src/lib/seed/contacts';
import { TEXTBAUSTEINE_SEED } from '../src/lib/seed/textbausteine';

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('[seed-rest] PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function check<T>(label: string, p: PromiseLike<{ error: unknown; data?: T }>): Promise<T | null> {
  const r = await p;
  if (r.error) {
    console.error(`[seed-rest] ${label} failed:`, (r.error as { message?: string }).message ?? r.error);
    throw r.error;
  }
  return (r.data as T | undefined) ?? null;
}

async function seedGewerke() {
  console.log('[seed-rest] gewerke …');
  const rows = GEWERKE_SEED.map((g) => ({
    name: g.name,
    color: g.color,
    default_per_apartment: g.defaultPerApartment,
    sort_order: g.sortOrder
  }));
  await check('gewerke upsert', sb.from('gewerke').upsert(rows, { onConflict: 'name' }));
  console.log(`[seed-rest]   ${rows.length} gewerke`);
}

async function seedChecklists() {
  console.log('[seed-rest] checklists …');
  // Wipe first (cascades to sections → items → progress)
  await check('checklist_items delete', sb.from('checklist_items').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  await check('checklist_sections delete', sb.from('checklist_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  await check('checklists delete', sb.from('checklists').delete().neq('id', '00000000-0000-0000-0000-000000000000'));

  let totalSections = 0;
  let totalItems = 0;
  for (const cl of CHECKLISTS) {
    const ins = await check<{ id: string }[]>(
      `checklist insert ${cl.num}`,
      sb.from('checklists')
        .insert({
          num: parseInt(cl.num, 10) || 0,
          title: cl.title,
          scope: cl.scope,
          sort_order: parseInt(cl.id, 10) || 0
        })
        .select('id')
    );
    const clId = ins?.[0]?.id;
    if (!clId) continue;

    for (let si = 0; si < cl.sections.length; si++) {
      const sec = cl.sections[si];
      const secIns = await check<{ id: string }[]>(
        `section insert ${cl.num}/${si}`,
        sb.from('checklist_sections')
          .insert({ checklist_id: clId, title: sec.title ?? null, sort_order: si })
          .select('id')
      );
      const secId = secIns?.[0]?.id;
      if (!secId) continue;
      totalSections++;

      const itemRows = sec.items.map((text, i) => ({ section_id: secId, text, sort_order: i }));
      if (itemRows.length > 0) {
        await check(`items batch ${cl.num}/${si}`, sb.from('checklist_items').insert(itemRows));
        totalItems += itemRows.length;
      }
    }
  }
  console.log(`[seed-rest]   ${CHECKLISTS.length} checklists / ${totalSections} sections / ${totalItems} items`);
}

async function fetchGewerke(): Promise<Map<string, string>> {
  const r = await check<{ id: string; name: string }[]>(
    'gewerke read',
    sb.from('gewerke').select('id, name')
  );
  return new Map((r ?? []).map((g) => [g.name, g.id]));
}

async function seedGewerkChecklistTemplates() {
  console.log('[seed-rest] gewerk_checklist_templates …');
  await check('templates delete', sb.from('gewerk_checklist_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  const byName = await fetchGewerke();
  const rows = GEWERK_CHECKLIST_TEMPLATES.map((t, i) => {
    const gid = byName.get(t.gewerk);
    if (!gid) return null;
    return { gewerk_id: gid, item: t.item, requires_photo: t.requiresPhoto, sort_order: i };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  await check('templates insert', sb.from('gewerk_checklist_templates').insert(rows));
  console.log(`[seed-rest]   ${rows.length} templates`);
}

async function seedTextbausteine() {
  console.log('[seed-rest] textbausteine …');
  await check('textbausteine delete', sb.from('textbausteine').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  const byName = await fetchGewerke();
  const rows = TEXTBAUSTEINE_SEED.map((t, i) => {
    const gid = byName.get(t.gewerk);
    if (!gid) return null;
    return { gewerk_id: gid, label: t.label, body: t.body, sort_order: i };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  await check('textbausteine insert', sb.from('textbausteine').insert(rows));
  console.log(`[seed-rest]   ${rows.length} textbausteine`);
}

async function seedGlobalContacts() {
  console.log('[seed-rest] contacts (global dummies) …');
  // Only seed if no global contacts exist yet — don't overwrite real ones
  const existing = await check<{ id: string }[]>(
    'contacts probe',
    sb.from('contacts').select('id').is('project_id', null).limit(1)
  );
  if (existing && existing.length > 0) {
    console.log('[seed-rest]   already have global contacts — skipped');
    return;
  }

  const byName = await fetchGewerke();
  const rows = CONTACTS_DUMMY.map((c) => {
    const gid = byName.get(c.gewerk);
    if (!gid) return null;
    return {
      project_id: null,
      gewerk_id: gid,
      company: c.company,
      contact_name: c.contactName,
      email: c.email,
      phone: c.phone,
      address: c.address
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  await check('contacts insert', sb.from('contacts').insert(rows));
  console.log(`[seed-rest]   ${rows.length} contacts`);
}

await seedGewerke();
await seedChecklists();
await seedGewerkChecklistTemplates();
await seedTextbausteine();
await seedGlobalContacts();
console.log('[seed-rest] done.');
