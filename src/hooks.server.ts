import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createSupabaseServerClient } from '$lib/auth/supabase-server';

const supabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event);

  event.locals.safeGetSession = async () => {
    const { data: sessionData } = await event.locals.supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) return { session: null, user: null };

    // Validate JWT against the auth server (defense in depth — getSession only reads cookies)
    const { data: userData, error } = await event.locals.supabase.auth.getUser();
    if (error) return { session: null, user: null };
    return { session, user: userData.user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
  });
};

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;

  const path = event.url.pathname;
  const isPublic =
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/auth/') ||
    path.startsWith('/_app/') ||
    path.startsWith('/api/health');

  if (!session && !isPublic) {
    const from = encodeURIComponent(path + event.url.search);
    redirect(303, `/login?from=${from}`);
  }
  if (session && (path === '/' || path === '/login')) {
    redirect(303, '/projects');
  }

  return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
