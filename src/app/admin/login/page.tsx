import Link from 'next/link';
import { authSetupMissing } from '@/lib/auth';
import { LoginForm } from './login-form';

export const metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const missing = authSetupMissing();
  const { error } = await searchParams;
  return <div className="container" style={{ paddingBlock: '5rem', maxWidth: 650 }}>
    <Link href="/" className="eyebrow">← Back to Los Santos Wire</Link>
    <section className="panel" style={{ marginTop: 24, padding: 'clamp(24px, 5vw, 48px)' }}>
      <p className="eyebrow">Editorial access</p><h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.1, marginBlock: 14 }}>The newsroom.</h1>
      <p className="muted">A clear view of the stories, sources, and updates that matter.</p>
      {missing.length ? <div className="notice"><h2>Connect your newsroom</h2><p>Admin access is locked until setup is complete. Add these variables to your server environment:</p><ul>{missing.map(key => <li key={key}><code>{key}</code></li>)}</ul><ol><li>Create a Supabase project and apply the repository migrations.</li><li>Set the project URL, anon key, and server-only service-role key in <code>.env.local</code> or your hosting environment.</li><li>Set <code>ADMIN_EMAIL</code> to the administrator email, or a comma-separated allowlist.</li><li>Create a confirmed email/password user in Supabase Authentication. Enable authentication rate limits in Supabase, then restart the app.</li></ol><p>No demo account or authentication bypass is available.</p></div> : <>{error && <p role="alert" className="notice danger">Your session could not be authorized. Sign in with a confirmed administrator account.</p>}<LoginForm /></>}
    </section>
  </div>;
}
