import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db/client';
import { profiles } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { computeInitials } from '$lib/seed/profiles';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.session || !locals.user) redirect(303, '/login');

  let profile: { id: string; email: string; name: string; initials: string | null } | null = null;
  if (db) {
    try {
      const rows = await db
        .select({ id: profiles.id, email: profiles.email, name: profiles.name, initials: profiles.initials })
        .from(profiles)
        .where(eq(profiles.id, locals.user.id))
        .limit(1);
      profile = rows[0] ?? null;
    } catch (e) {
      console.warn('[layout] could not load profile:', e);
    }
  }

  // Fallback: derive from auth user metadata (until handle_new_user trigger has run)
  if (!profile && locals.user) {
    const fullName = (locals.user.user_metadata?.name as string | undefined) ?? locals.user.email?.split('@')[0] ?? 'Bauleiter';
    profile = {
      id: locals.user.id,
      email: locals.user.email ?? '',
      name: fullName,
      initials: computeInitials(fullName)
    };
  }

  return { profile };
};
