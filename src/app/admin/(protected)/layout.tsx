import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { signOut } from '@/app/auth/actions';
import { AdminNav } from '../_components/admin-nav';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const metadata = { title: 'Newsroom administration', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <div className="container admin-shell">
    <aside className="admin-nav"><Link href="/admin" className="eyebrow">LSW / Newsroom</Link><AdminNav /><div style={{ marginTop: 'auto', paddingTop: 28 }}><p className="muted" style={{ overflowWrap: 'anywhere', fontSize: 12 }}>{user.email}</p><form action={signOut}><button className="button secondary">Sign out</button></form><p><Link href="/">↗ View public site</Link></p></div></aside>
    <main className="admin-content">{children}</main>
  </div>;
}
