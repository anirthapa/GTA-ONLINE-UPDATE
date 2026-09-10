'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const links = [['/admin', 'Overview'], ['/admin/articles', 'Articles'], ['/admin/weekly', 'Weekly updates'], ['/admin/vehicles', 'Vehicles'], ['/admin/guides', 'Guides'], ['/admin/sources', 'Sources'], ['/admin/logs', 'Activity logs'], ['/admin/seo', 'SEO'], ['/admin/settings', 'Settings']];
export function AdminNav() {
  const pathname = usePathname();
  return <nav aria-label="Newsroom navigation" style={{ display: 'grid', gap: 4, marginTop: 28 }}>{links.map(([href, label]) => <Link key={href} href={href} aria-current={(href === '/admin' ? pathname === href : pathname.startsWith(href)) ? 'page' : undefined} style={{ padding: '10px 12px', borderRadius: 8, background: (href === '/admin' ? pathname === href : pathname.startsWith(href)) ? 'var(--accent, #b8ed58)' : undefined, color: (href === '/admin' ? pathname === href : pathname.startsWith(href)) ? '#10200b' : undefined }}>{label}</Link>)}</nav>;
}
