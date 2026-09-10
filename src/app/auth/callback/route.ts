import { NextResponse, type NextRequest } from 'next/server';
import { authSetupMissing, createAuthClient, isAdminEmail } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const destination = new URL('/admin/login?error=callback', request.url);
  if (authSetupMissing().length) return NextResponse.redirect(destination);
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const client = await createAuthClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await client.auth.getUser();
      if (user?.email_confirmed_at && isAdminEmail(user.email)) destination.pathname = '/admin';
      else await client.auth.signOut();
      if (destination.pathname === '/admin') destination.search = '';
    }
  }
  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
