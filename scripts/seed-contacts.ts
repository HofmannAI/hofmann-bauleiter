/**
 * Imports `data/contacts.csv` as global contacts (project_id = NULL).
 * Existing global contacts are wiped and replaced. Project-scoped contacts
 * are NOT touched.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { gewerke, contacts } from '../src/lib/db/schema';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const client = postgres(url, { max: 1 });
const db = drizzle(client);

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  const header = parseLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cols = parseLine(l);
    return Object.fromEntries(header.map((h, i) => [h, cols[i] ?? '']));
  });
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const csv = readFileSync('data/contacts.csv', 'utf-8');
const rows = parseCsv(csv);
console.log(`[seed:contacts] parsed ${rows.length} rows`);

const allGewerke = await db.select().from(gewerke);
const byName = new Map(allGewerke.map((g) => [g.name, g.id]));

await db.execute(sql`DELETE FROM contacts WHERE project_id IS NULL`);
for (const r of rows) {
  const gid = byName.get(r.gewerk) ?? null;
  if (!gid) console.warn(`[seed:contacts] unknown gewerk "${r.gewerk}" — skipped`);
  if (!gid) continue;
  await db.insert(contacts).values({
    projectId: null,
    gewerkId: gid,
    company: r.company,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    address: r.address
  });
}
console.log('[seed:contacts] done');
await client.end();
