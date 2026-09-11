import type { Metadata } from 'next';
import './globals.css';
import './revamp.css';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/editorial';
import { indexingAllowed } from '@/lib/seo';
import { SITE_NAME, SITE_DESCRIPTION, siteUrl, demoMode } from '@/lib/site';
export const metadata: Metadata = { metadataBase: new URL(siteUrl), title: { default: `${SITE_NAME} — GTA news, straight from the source`, template: `%s | ${SITE_NAME}` }, description: SITE_DESCRIPTION, openGraph: { type: 'website', siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION }, twitter: { card: 'summary_large_image' }, robots: !indexingAllowed() ? { index:false, follow:false } : { index:true, follow:true, 'max-image-preview':'large' }, verification: { google: process.env.GOOGLE_SITE_VERIFICATION } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('lsw-theme')||'dark'}catch(e){}" }}/></head><body><a href="#main-content" className="skip-link">Skip to content</a>{demoMode && <div className="demo-banner">DEVELOPMENT EDITION <span>Sample stories are labeled. No fictional offers are presented as current.</span></div>}<Navigation/><main id="main-content">{children}</main><Footer/></body></html>; }
