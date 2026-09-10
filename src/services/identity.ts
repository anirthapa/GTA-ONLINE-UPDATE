import { createHash } from 'node:crypto';

// Canonicalization never changes path case or removes meaningful query parameters.
export function canonicalizeUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Only public HTTPS URLs without credentials or nonstandard ports are allowed.');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}
export function normalizeTitle(title: string): string {
  return title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
export function hashText(value: string): string {
  return createHash('sha256').update(value.normalize('NFKC').replace(/\s+/g, ' ').trim()).digest('hex');
}
export function titleSimilarity(a: string, b: string): number {
  const left = new Set(normalizeTitle(a).split(' ').filter(Boolean));
  const right = new Set(normalizeTitle(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  return [...left].filter(word => right.has(word)).length / new Set([...left, ...right]).size;
}
export function slugify(value: string): string {
  return normalizeTitle(value).replace(/\s+/g, '-').slice(0, 100) || 'story';
}
