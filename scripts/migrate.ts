/**
 * Run pending Drizzle migrations against the configured DATABASE_URL.
 * Usage: pnpm db:migrate
 *
 * Designed for first-time setup AND CI. Idempotent — uses Drizzle's
 * built-in __drizzle_migrations table to skip already-applied SQL.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[migrate] DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

console.log('[migrate] applying migrations from supabase/migrations …');
await migrate(db, { migrationsFolder: 'supabase/migrations' });
console.log('[migrate] done');
await sql.end();
