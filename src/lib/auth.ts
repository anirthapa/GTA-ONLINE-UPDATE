import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export function authSetupMissing(): string[] {
  return ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAIL'].filter(key => !process.env[key]?.trim());
}

export function isAdminEmail(email?: string | null) {
  const allowed = (process.env.ADMIN_EMAIL ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && allowed.includes(email.trim().toLowerCase()));
}

export async function createAuthClient() {
  if (authSetupMissing().length) throw new Error('Admin authentication is not configured. Visit /admin/login for setup instructions.');
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: values => {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; proxy refreshes them. */ }
      },
    },
  });
}

export async function requireAdmin() {
  if (authSetupMissing().length) redirect('/admin/login');
  const auth = await createAuthClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user || !user.email_confirmed_at || !isAdminEmail(user.email)) redirect('/admin/login?error=unauthorized');
  return user;
}
