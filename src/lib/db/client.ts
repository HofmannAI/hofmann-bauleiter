/**
 * Drizzle client (server-only). Uses postgres-js. Only imported from
 * `+page.server.ts`, `+server.ts`, `hooks.server.ts`, or scripts.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL ?? '';
if (!connectionString && typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  console.warn('[db] DATABASE_URL not set — Drizzle queries will fail');
}

const client = connectionString
  ? postgres(connectionString, { prepare: false, max: 15, idle_timeout: 20, connect_timeout: 10 })
  : (null as unknown as ReturnType<typeof postgres>);

export const db = client ? drizzle(client, { schema }) : (null as unknown as ReturnType<typeof drizzle>);
export { schema };
