/**
 * Supabase Database type stub.
 * Drizzle is the source of truth for the schema; this file only satisfies
 * SupabaseClient<Database>'s type parameter. Extend if you need typed
 * .from(...).select() calls in the supabase-js client.
 */
export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, unknown>;
  };
};
