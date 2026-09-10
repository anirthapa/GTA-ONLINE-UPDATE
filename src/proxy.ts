import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Referrer-Policy', 'no-referrer');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !process.env.ADMIN_EMAIL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return response;
  const supabase = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set('Cache-Control', 'private, no-store, max-age=0');
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        response.headers.set('Referrer-Policy', 'no-referrer');
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = (process.env.ADMIN_EMAIL ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin/login' && (!user?.email_confirmed_at || !user.email || !allowed.includes(user.email.toLowerCase()))) {
    const destination = new URL('/admin/login', request.url);
    const denied = NextResponse.redirect(destination);
    response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie));
    denied.headers.set('Cache-Control', 'private, no-store');
    return denied;
  }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/auth/:path*'] };
