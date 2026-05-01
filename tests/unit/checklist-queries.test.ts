import { describe, it, expect } from 'vitest';
import { inArray } from 'drizzle-orm';
import { pgTable, uuid } from 'drizzle-orm/pg-core';

/**
 * Regression-Schutz für PR #6: leeres `progress[]` darf keinen
 * Postgres-Syntax-Fehler ('IN ()') produzieren.
 *
 * Vor dem Fix wurde `sql.join(progress.map(...), sql\`, \`)` benutzt — das
 * ergab bei leerem progress ein nacktes `progress_id IN ()`. Postgres
 * fängt das schon beim PARSE ab und wirft "syntax error at or near ')'".
 *
 * Mit `inArray(col, [])` baut drizzle ≥ 0.36 stattdessen einen falsy
 * Ausdruck — die Query wird leer/false, aber syntaktisch valid.
 *
 * Dieser Test fixiert das Verhalten: solange `inArray(col, [])` ohne
 * Throw konstruiert werden kann, ist die Regression nicht möglich.
 */
const tbl = pgTable('t', { id: uuid('id').primaryKey() });

describe('checklistQueries — empty-array regression (PR #6)', () => {
  it('inArray(col, []) baut ohne Exception — kein nacktes IN ()', () => {
    expect(() => inArray(tbl.id, [])).not.toThrow();
  });

  it('inArray(col, [...uuids]) baut ohne Exception', () => {
    expect(() =>
      inArray(tbl.id, [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
      ])
    ).not.toThrow();
  });
});
