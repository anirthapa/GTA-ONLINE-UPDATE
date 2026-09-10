'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { authSetupMissing, createAuthClient, isAdminEmail, requireAdmin } from '@/lib/auth';

export async function signIn(_previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  if (authSetupMissing().length) return { error: 'Complete the Supabase setup below before signing in.' };
  const parsed = z.object({ email: z.email().max(254), password: z.string().min(1).max(1024) }).safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) return { error: 'Enter a valid email and password.' };
  if (!isAdminEmail(parsed.data.email)) return { error: 'Unable to sign in with these credentials.' };
  const client = await createAuthClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Unable to sign in with these credentials. Check your account or try again later.' };
  const { data: { user }, error: verificationError } = await client.auth.getUser();
  if (verificationError || !user?.email_confirmed_at || !isAdminEmail(user.email)) {
    await client.auth.signOut();
    return { error: 'This account does not have administrator access.' };
  }
  redirect('/admin');
}

export async function signOut() {
  await requireAdmin();
  const client = await createAuthClient();
  const { error } = await client.auth.signOut();
  if (error) throw new Error('Sign out failed. Please try again.');
  redirect('/admin/login');
}
