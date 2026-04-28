import { fail, redirect, type Actions } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (locals.session) redirect(303, '/projects');
  const from = url.searchParams.get('from') ?? '/projects';
  return { from };
};

const schema = z.object({
  email: z.string().email().max(254)
});

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const data = Object.fromEntries(await request.formData());
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return fail(400, { error: 'Bitte eine gültige Email-Adresse eingeben.', email: data.email });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const from = (data.from as string) || '/projects';
    const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(from)}`;

    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      return fail(500, { error: 'Magic-Link konnte nicht gesendet werden. Bitte später nochmal.', email });
    }

    return { success: true, email };
  }
};
