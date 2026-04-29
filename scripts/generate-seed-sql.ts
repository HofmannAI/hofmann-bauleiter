/**
 * Erzeugt eine Datei `supabase/seed.sql`, die alle Stamm-Daten als
 * idempotente INSERT-Statements enthält — kann im Supabase SQL Editor
 * direkt ausgeführt werden.
 *
 * Wird benutzt, wenn weder direkter Postgres-Pool noch REST-API erreichbar
 * sind (z.B. aus einem Container mit strikter HTTPS-Allowlist).
 *
 * Aufruf: pnpm tsx scripts/generate-seed-sql.ts
 */
import { writeFileSync } from 'node:fs';
import { GEWERKE_SEED } from '../src/lib/seed/gewerke';
import { CHECKLISTS } from '../src/lib/seed/checklists';
import { GEWERK_CHECKLIST_TEMPLATES } from '../src/lib/seed/gewerk-checklists';
import { CONTACTS_DUMMY } from '../src/lib/seed/contacts';
import { TEXTBAUSTEINE_SEED } from '../src/lib/seed/textbausteine';

function q(v: string | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  return `'${v.replace(/'/g, "''")}'`;
}

const out: string[] = [];
out.push(`-- ============================================================`);
out.push(`-- seed.sql — auto-generated from src/lib/seed/*.ts`);
out.push(`-- Im Supabase SQL Editor ausführen. Idempotent (UPSERT / DELETE+INSERT).`);
out.push(`-- ============================================================`);
out.push(`BEGIN;`);
out.push(``);

// 1) gewerke
out.push(`-- ===== gewerke =====`);
for (const g of GEWERKE_SEED) {
  out.push(
    `INSERT INTO gewerke (name, color, default_per_apartment, sort_order) VALUES (${q(g.name)}, ${q(g.color)}, ${g.defaultPerApartment}, ${g.sortOrder}) ` +
    `ON CONFLICT (name) DO UPDATE SET color=EXCLUDED.color, default_per_apartment=EXCLUDED.default_per_apartment, sort_order=EXCLUDED.sort_order;`
  );
}
out.push(``);

// 2) checklists / sections / items
// Strategy: wipe + insert with stable num as ON-CONFLICT-key (we don't have
// unique on num, so just truncate via DELETE — cascades to children, but
// also wipes any existing checklist_progress. Acceptable for first-time seed.
out.push(`-- ===== checklists / sections / items (WIPE + INSERT) =====`);
out.push(`DELETE FROM checklist_items;`);
out.push(`DELETE FROM checklist_sections;`);
out.push(`DELETE FROM checklists;`);
out.push(`DO $$`);
out.push(`DECLARE v_cl uuid; v_sec uuid;`);
out.push(`BEGIN`);
for (const cl of CHECKLISTS) {
  const num = parseInt(cl.num, 10) || 0;
  const sortOrder = parseInt(cl.id, 10) || 0;
  out.push(
    `  INSERT INTO checklists (num, title, scope, sort_order) VALUES (${num}, ${q(cl.title)}, ${q(cl.scope)}, ${sortOrder}) RETURNING id INTO v_cl;`
  );
  for (let si = 0; si < cl.sections.length; si++) {
    const sec = cl.sections[si];
    out.push(
      `  INSERT INTO checklist_sections (checklist_id, title, sort_order) VALUES (v_cl, ${q(sec.title ?? null)}, ${si}) RETURNING id INTO v_sec;`
    );
    for (let ii = 0; ii < sec.items.length; ii++) {
      out.push(
        `  INSERT INTO checklist_items (section_id, text, sort_order) VALUES (v_sec, ${q(sec.items[ii])}, ${ii});`
      );
    }
  }
}
out.push(`END $$;`);
out.push(``);

// 3) gewerk_checklist_templates
out.push(`-- ===== gewerk_checklist_templates =====`);
out.push(`DELETE FROM gewerk_checklist_templates;`);
for (let i = 0; i < GEWERK_CHECKLIST_TEMPLATES.length; i++) {
  const t = GEWERK_CHECKLIST_TEMPLATES[i];
  out.push(
    `INSERT INTO gewerk_checklist_templates (gewerk_id, item, requires_photo, sort_order) ` +
    `SELECT id, ${q(t.item)}, ${t.requiresPhoto}, ${i} FROM gewerke WHERE name = ${q(t.gewerk)};`
  );
}
out.push(``);

// 4) textbausteine
out.push(`-- ===== textbausteine =====`);
out.push(`DELETE FROM textbausteine;`);
for (let i = 0; i < TEXTBAUSTEINE_SEED.length; i++) {
  const t = TEXTBAUSTEINE_SEED[i];
  out.push(
    `INSERT INTO textbausteine (gewerk_id, label, body, sort_order) ` +
    `SELECT id, ${q(t.label)}, ${q(t.body)}, ${i} FROM gewerke WHERE name = ${q(t.gewerk)};`
  );
}
out.push(``);

// 5) global contacts (only if none exist)
out.push(`-- ===== global contacts (only if no globals yet) =====`);
out.push(`DO $$`);
out.push(`BEGIN`);
out.push(`  IF NOT EXISTS (SELECT 1 FROM contacts WHERE project_id IS NULL) THEN`);
for (const c of CONTACTS_DUMMY) {
  out.push(
    `    INSERT INTO contacts (project_id, gewerk_id, company, contact_name, email, phone, address) ` +
    `SELECT NULL, id, ${q(c.company)}, ${q(c.contactName)}, ${q(c.email)}, ${q(c.phone)}, ${q(c.address)} FROM gewerke WHERE name = ${q(c.gewerk)};`
  );
}
out.push(`  END IF;`);
out.push(`END $$;`);
out.push(``);

out.push(`COMMIT;`);
out.push(``);

const path = 'supabase/seed.sql';
writeFileSync(path, out.join('\n'));
console.log(`Wrote ${path} (${out.length} lines)`);
