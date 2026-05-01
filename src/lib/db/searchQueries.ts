/**
 * Trigram-based fuzzy search over Mängel/Kontakte/Termine for a project.
 * Backed by GIN(gin_trgm_ops) indexes from migration 0008.
 *
 * Returns up to `limitPerKind` rows per kind, ranked by trigram similarity.
 */
import { db } from './client';
import { sql } from 'drizzle-orm';

export type SearchHit = {
  kind: 'defect' | 'contact' | 'task';
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  score: number;
};

export async function searchProject(
  projectId: string,
  query: string,
  limitPerKind = 5
): Promise<SearchHit[]> {
  if (!db) return [];
  const q = query.trim();
  if (q.length < 2) return [];

  // Pattern for ILIKE; escape SQL wildcards in user input.
  const pat = '%' + q.replace(/[\\%_]/g, (c) => '\\' + c) + '%';

  const [defectRows, contactRows, taskRows] = await Promise.all([
    db.execute<{ id: string; short_id: string | null; title: string; description: string | null; score: number }>(sql`
      SELECT id, short_id, title, description,
             greatest(
               similarity(coalesce(title, ''), ${q}),
               similarity(coalesce(short_id, ''), ${q}),
               similarity(coalesce(description, ''), ${q})
             ) AS score
      FROM defects
      WHERE project_id = ${projectId}
        AND (title ILIKE ${pat} OR description ILIKE ${pat} OR short_id ILIKE ${pat})
      ORDER BY score DESC
      LIMIT ${limitPerKind}
    `),
    db.execute<{ id: string; company: string | null; contact_name: string | null; email: string | null; score: number }>(sql`
      SELECT id, company, contact_name, email,
             greatest(
               similarity(coalesce(company, ''), ${q}),
               similarity(coalesce(contact_name, ''), ${q}),
               similarity(coalesce(email, ''), ${q})
             ) AS score
      FROM contacts
      WHERE (project_id = ${projectId} OR project_id IS NULL)
        AND (company ILIKE ${pat} OR contact_name ILIKE ${pat} OR email ILIKE ${pat})
      ORDER BY score DESC
      LIMIT ${limitPerKind}
    `),
    db.execute<{ id: string; num: string | null; name: string; score: number }>(sql`
      SELECT id, num, name,
             greatest(
               similarity(coalesce(name, ''), ${q}),
               similarity(coalesce(num, ''), ${q}),
               similarity(coalesce(notes, ''), ${q})
             ) AS score
      FROM tasks
      WHERE project_id = ${projectId}
        AND (name ILIKE ${pat} OR num ILIKE ${pat} OR notes ILIKE ${pat})
      ORDER BY score DESC
      LIMIT ${limitPerKind}
    `)
  ]);

  const out: SearchHit[] = [];
  for (const r of defectRows) {
    out.push({
      kind: 'defect',
      id: r.id,
      title: `${r.short_id ?? 'M-?'} · ${r.title}`,
      subtitle: r.description ? r.description.slice(0, 80) : null,
      href: `/${projectId}/maengel/${r.id}`,
      score: Number(r.score) || 0
    });
  }
  for (const r of contactRows) {
    const titleParts = [r.company, r.contact_name].filter(Boolean);
    out.push({
      kind: 'contact',
      id: r.id,
      title: titleParts.join(' · ') || r.email || 'Kontakt',
      subtitle: r.email,
      href: `/${projectId}/kontakte`,
      score: Number(r.score) || 0
    });
  }
  for (const r of taskRows) {
    out.push({
      kind: 'task',
      id: r.id,
      title: `${r.num ?? ''} ${r.name}`.trim(),
      subtitle: 'Termin',
      href: `/${projectId}/bauzeitenplan/${r.id}`,
      score: Number(r.score) || 0
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}
