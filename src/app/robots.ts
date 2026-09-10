import type { MetadataRoute } from 'next';
import { canonicalOrigin, indexingAllowed } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) return { rules: { userAgent: '*', disallow: '/' } };
  const origin = canonicalOrigin()!;
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/auth', '/api', '/search'] },
    sitemap: [`${origin}/sitemap.xml`, `${origin}/news-sitemap.xml`],
  };
}
