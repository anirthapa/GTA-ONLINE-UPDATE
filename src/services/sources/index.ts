import 'server-only';
import Parser from 'rss-parser';
import { load } from 'cheerio';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import type { Source, SourceItem } from '../types';
import { canonicalizeUrl, hashText, normalizeTitle } from '../identity';
import { OFFICIAL_HOSTS, verifiedSourceTrust } from '../trust';
import { safeFetch, validateDestination, validateHttpsUrl, type FetchPolicy, type FetchResult } from './safe-fetch';

const SOURCE_CONFIG = z.object({
  name: z.string().trim().min(1).max(160), url: z.string().url().max(2048),
  source_type: z.enum(['RSS', 'HTML', 'JSON', 'YOUTUBE', 'COMMUNITY']),
  trust_level: z.enum(['OFFICIAL', 'TRUSTED_MEDIA', 'COMMUNITY', 'UNVERIFIED']),
  allowed_hosts: z.array(z.string().regex(/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/)).min(1).max(10),
  allow_html: z.boolean(), fetch_frequency: z.number().int().min(5).max(10080),
});
export async function validateSourceConfiguration(input: unknown) {
  const config = SOURCE_CONFIG.parse(input);
  validateHttpsUrl(config.url, config.allowed_hosts);
  if (config.source_type === 'HTML' && !config.allow_html) throw new Error('HTML ingestion requires explicit opt-in.');
  if (config.source_type === 'COMMUNITY' && config.trust_level !== 'COMMUNITY') throw new Error('Community feeds must retain community trust.');
  if (config.trust_level === 'OFFICIAL' && config.allowed_hosts.some(host => !OFFICIAL_HOSTS.includes(host))) {
    throw new Error('Official sources can only allow approved Rockstar-owned hosts.');
  }
  if (config.source_type === 'YOUTUBE') validateYouTubeFeed(config.url);
  // Validation also checks every configured redirect/content host, with a bounded DNS deadline.
  for (const host of config.allowed_hosts) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([validateDestination(`https://${host}/`, config.allowed_hosts), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Source DNS validation timed out.')), 5000);
      })]);
    } finally { clearTimeout(timer); }
  }
  return config;
}
function validateYouTubeFeed(input: string): string {
  const url = new URL(input);
  const channel = url.searchParams.get('channel_id');
  if (url.hostname !== 'www.youtube.com' || url.pathname !== '/feeds/videos.xml' || !/^UC[\w-]{22}$/.test(channel || '')) {
    throw new Error('YouTube sources require a channel-specific https://www.youtube.com/feeds/videos.xml?channel_id=UC… URL.');
  }
  return channel!;
}
export function plainText(html: string): string {
  const $ = load(html);
  $('script,style,noscript,iframe,object,svg,form,nav,footer').remove();
  return $.text().replace(/\s+/g, ' ').trim().slice(0, 40_000);
}
function dateOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed > Date.now() + 5 * 60_000) return null;
  return new Date(parsed).toISOString();
}
function normalize(source: Source, raw: { id?: unknown; url?: unknown; title?: unknown; content?: unknown; publishedAt?: unknown; modifiedAt?: unknown }): SourceItem {
  if (typeof raw.url !== 'string' || typeof raw.title !== 'string' || !raw.title.trim()) throw new Error('Source item lacks title or URL.');
  const url = canonicalizeUrl(new URL(raw.url, source.url).toString());
  verifiedSourceTrust(source, url);
  const title = plainText(raw.title).slice(0, 300), content = plainText(typeof raw.content === 'string' ? raw.content : '');
  if (!title || content.length < 30) throw new Error('Source item has insufficient attributable text.');
  return { external_id: String(raw.id || url).slice(0, 2048), url, title, content,
    published_at: dateOrNull(raw.publishedAt), modified_at: dateOrNull(raw.modifiedAt),
    content_hash: hashText(`${title}\n${content}`), title_fingerprint: normalizeTitle(title) };
}
export interface AdapterResult { items: SourceItem[]; rejected: number; fetchedUrl: string }
export type SourceFetcher = (url: string, policy: FetchPolicy) => Promise<FetchResult>;
export async function fetchSource(source: Source, fetcher: SourceFetcher = safeFetch): Promise<AdapterResult> {
  SOURCE_CONFIG.parse(source);
  if (source.trust_level === 'OFFICIAL' && source.allowed_hosts.some(host => !OFFICIAL_HOSTS.includes(host))) throw new Error('Unapproved official source host.');
  if (source.source_type === 'COMMUNITY' && source.trust_level !== 'COMMUNITY') throw new Error('Community trust cannot be elevated.');
  if (source.source_type === 'HTML' && !source.allow_html) throw new Error('HTML ingestion requires explicit opt-in.');
  const channel = source.source_type === 'YOUTUBE' ? validateYouTubeFeed(source.url) : null;
  const contentTypes = source.source_type === 'JSON' ? ['application/json', 'application/feed+json'] :
    source.source_type === 'HTML' ? ['text/html', 'application/xhtml+xml'] :
      ['application/rss+xml', 'application/atom+xml', 'application/xml', 'text/xml'];
  const response = await fetcher(source.url, { allowedHosts: source.allowed_hosts, contentTypes });
  let rawItems: Array<{ id?: unknown; url?: unknown; title?: unknown; content?: unknown; publishedAt?: unknown; modifiedAt?: unknown }>;
  if (source.source_type === 'JSON') {
    const payload: unknown = JSON.parse(response.body);
    rawItems = z.union([z.array(z.record(z.string(), z.unknown())), z.object({ items: z.array(z.record(z.string(), z.unknown())) })])
      .transform(value => Array.isArray(value) ? value : value.items).parse(payload).slice(0, 50);
  } else if (source.source_type === 'HTML') {
    const $ = load(response.body);
    // Opt-in HTML is conservative: only explicit article elements with a headline
    // and source-owned URL. It never recursively crawls links.
    rawItems = $('article').slice(0, 50).toArray().map(element => {
      const article = $(element), link = article.find('h1 a,h2 a,h3 a').first();
      return { url: link.attr('href') || response.url, title: article.find('h1,h2,h3').first().text(),
        content: article.html(), publishedAt: article.find('time[datetime]').first().attr('datetime') };
    });
  } else {
    if (/<!DOCTYPE|<!ENTITY/i.test(response.body)) throw new Error('DTD/entity declarations are forbidden in feeds.');
    const parser = new Parser({ customFields: { feed: ['yt:channelId'], item: ['yt:channelId', 'yt:videoId', ['media:group', 'mediaGroup']] } });
    const feed = await parser.parseString(response.body);
    if (channel && (feed as unknown as Record<string, unknown>)['yt:channelId'] !== channel) throw new Error('YouTube feed channel ownership mismatch.');
    rawItems = feed.items.slice(0, 50).map(item => {
      const extra = item as unknown as Record<string, unknown>;
      if (channel && extra['yt:channelId'] !== channel) throw new Error('YouTube item channel ownership mismatch.');
      const media = extra.mediaGroup as { 'media:description'?: string[] } | undefined;
      return { id: item.guid || extra.id, url: item.link, title: item.title,
        content: extra['content:encoded'] || item.content || item.contentSnippet || item.summary || media?.['media:description']?.[0],
        publishedAt: item.isoDate || item.pubDate, modifiedAt: extra.updated };
    });
  }
  const items: SourceItem[] = []; let rejected = 0;
  for (const raw of rawItems) {
    try { items.push(normalize(source, raw)); } catch { rejected++; }
  }
  if (rawItems.length && !items.length) throw new Error('All source items failed URL/content validation.');
  const unique = [...new Map(items.map(item => [item.url, item])).values()];
  return { items: unique, rejected, fetchedUrl: response.url };
}
export async function testSource(sourceId: string): Promise<{ ok: true; count: number; rejected: number; items: Array<{ title: string; url: string }> }> {
  const { data, error } = await getDb().from('sources').select('*').eq('id', z.uuid().parse(sourceId)).single();
  if (error || !data) throw new Error('Source was not found.');
  const result = await fetchSource(data as Source);
  return { ok: true, count: result.items.length, rejected: result.rejected, items: result.items.map(({ title, url }) => ({ title, url })) };
}
