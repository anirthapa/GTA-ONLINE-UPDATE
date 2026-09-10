'use client';
import { useActionState } from 'react';
import { signIn } from '@/app/auth/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return <form action={action} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
    <label className="field">Email address<input name="email" type="email" autoComplete="username" placeholder="editor@yourstudio.com" required /></label>
    <label className="field">Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {state.error && <p role="alert" className="notice danger">{state.error}</p>}
    <button className="button" disabled={pending}>{pending ? 'Signing in…' : 'Sign in to newsroom →'}</button>
    <p className="muted">Use the confirmed Supabase account assigned to your administrator email.</p>
  </form>;
}
