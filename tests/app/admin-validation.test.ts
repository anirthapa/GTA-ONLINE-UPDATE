import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { articleSchema, emptyWeekly, guideSchema, httpsUrl, settingsSchema, sourceSchema, vehicleSchema, weeklySchema } from '@/app/admin/_lib/validation';
// Import the actual server-only module through the repository's Vitest alias.
import { isAdminEmail } from '@/lib/auth';

const article = { slug: 'qa-story', title: 'QA story', excerpt: 'A fictional QA excerpt.', content: 'A fictional story for testing form validation.', game: 'GTA_ONLINE', category: 'News', status: 'DRAFT', verification_status: 'UNKNOWN', source_url: 'https://www.rockstargames.com/newswire/qa', source_name: 'QA source', featured_image: '', image_alt: '', seo_title: '', seo_description: '', keywords: '[]', entities: '[]', featured: false, trending: false, breaking: false, breaking_expires_at: '', confidence_score: '85' };
const weekly = { slug: 'qa-week', event_start: '2026-09-03T00:00:00Z', event_end: '2026-09-10T00:00:00Z', last_checked_at: '2026-09-03T00:00:00Z', source_url: article.source_url, article_id: '10000000-0000-4000-8000-000000000001', status: 'PUBLISHED', verification_status: 'CONFIRMED', data: JSON.stringify(emptyWeekly) };
const source = { name: 'QA feed', url: 'https://www.rockstargames.com/newswire/qa', source_type: 'RSS', trust_level: 'OFFICIAL', enabled: false, category: 'News', fetch_frequency: '60', allowed_hosts: '["www.rockstargames.com"]', allow_html: false };
const vehicle = { slug: 'qa-car', name: 'QA car', vehicle_class: 'Sports', price: '', top_speed: '', retailer: '', seats: '', image: '', description: 'Fictional QA vehicle.', source_url: '', verified_at: '', features: '[]', added_at: '' };
const guide = { slug: 'qa-guide', title: 'QA guide', kind: 'GUIDE', game: 'GTA_ONLINE', description: 'Fictional QA guide.', content: 'Fictional detailed QA guide content.', facts: '{}', source_url: '', verified_at: '', verification_status: 'UNKNOWN', image: '' };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-10T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('admin form schemas imported from production validation', () => {
  it('normalizes an editor submission into database-ready values', () => {
    expect(articleSchema.parse({ ...article, title: '  QA story  ', keywords: '[" heist "]' })).toMatchObject({ title: 'QA story', confidence_score: 85, keywords: ['heist'], entities: [], featured_image: null, seo_title: null });
    expect(vehicleSchema.parse(vehicle)).toMatchObject({ price: null, top_speed: null, seats: null, verified_at: null });
  });
  it.each(['UNKNOWN', 'OFFICIAL', 'VERIFIED'])('prevents publication under invalid verification %s', verification_status => {
    expect(articleSchema.safeParse({ ...article, status: 'PUBLISHED', verification_status }).success).toBe(false);
  });
  it.each(['CONFIRMED', 'REPORTED', 'RUMOR'])('allows editorial publication labeled %s', verification_status => {
    expect(articleSchema.safeParse({ ...article, status: 'PUBLISHED', verification_status }).success).toBe(true);
  });
  it('validates breaking expiry at the exact current-time boundary and requires image alt text', () => {
    expect(articleSchema.safeParse({ ...article, breaking: true, breaking_expires_at: '2026-09-10T12:00:00Z' }).success).toBe(false);
    expect(articleSchema.safeParse({ ...article, breaking: true, breaking_expires_at: '2026-09-10T12:00:01Z' }).success).toBe(true);
    expect(articleSchema.safeParse({ ...article, featured_image: 'https://images.example.com/qa.jpg', image_alt: ' ' }).success).toBe(false);
    expect(articleSchema.safeParse({ ...article, featured_image: 'https://images.example.com/qa.jpg', image_alt: 'QA city' }).success).toBe(true);
  });
  it.each(['../escape', 'UPPERCASE', 'two--hyphens', 'a/b', 'bad?query', 'bad#fragment'])('refuses unsafe slug %s', slug => {
    expect(articleSchema.safeParse({ ...article, slug }).success).toBe(false);
  });
  it.each(['{bad', '{}', '[1]', '[""]'])('rejects malformed or wrong-shaped keyword JSON %s', keywords => {
    expect(articleSchema.safeParse({ ...article, keywords }).success).toBe(false);
  });
  it('validates weekly nested reward types without accepting arbitrary fields', () => {
    expect(weeklySchema.safeParse(weekly).success).toBe(true);
    for (const data of [{ ...emptyWeekly, extra: true }, { ...emptyWeekly, bonuses: [{ activity: 'QA race', moneyMultiplier: '2x', rpMultiplier: 2 }] }]) {
      expect(weeklySchema.safeParse({ ...weekly, data: JSON.stringify(data) }).success).toBe(false);
    }
  });
  it('requires a real bounded weekly window, parent article and confirmed publication', () => {
    for (const patch of [{ event_end: weekly.event_start }, { event_end: '2026-10-01T00:00:00Z' }, { event_start: '2026-02-30T00:00:00Z' }, { article_id: '' }, { verification_status: 'REPORTED' }, { last_checked_at: '2026-09-10T12:00:01Z' }]) {
      expect(weeklySchema.safeParse({ ...weekly, ...patch }).success).toBe(false);
    }
    expect(weeklySchema.parse({ ...weekly, event_start: '2026-09-03T05:45:00+05:45' }).event_start).toBe('2026-09-03T00:00:00.000Z');
  });
  it.each(['http://example.com', 'javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com:8443'])('rejects unsafe editorial URL %s', url => {
    expect(httpsUrl.safeParse(url).success).toBe(false);
  });
  it('preserves source trust and enforces explicit fetch permissions', () => {
    expect(sourceSchema.safeParse(source).success).toBe(true);
    for (const patch of [{ source_type: 'COMMUNITY' }, { source_type: 'HTML' }, { allowed_hosts: '["*.rockstargames.com"]' }, { allowed_hosts: '["example.com"]' }, { fetch_frequency: 4 }]) {
      expect(sourceSchema.safeParse({ ...source, ...patch }).success).toBe(false);
    }
    expect(sourceSchema.safeParse({ ...source, source_type: 'HTML', allow_html: true }).success).toBe(true);
    expect(sourceSchema.safeParse({ ...source, source_type: 'COMMUNITY', trust_level: 'COMMUNITY' }).success).toBe(true);
  });
  it('rejects invalid catalog numbers and facts, and requires evidence for verified catalog entries', () => {
    for (const patch of [{ seats: '1.5' }, { price: '-1' }, { top_speed: 'NaN' }, { features: '[1]' }, { verified_at: '2026-09-01T00:00:00Z' }]) {
      expect(vehicleSchema.safeParse({ ...vehicle, ...patch }).success).toBe(false);
    }
    expect(guideSchema.safeParse({ ...guide, facts: '{"fact":{"nested":true}}' }).success).toBe(false);
    for (const verification_status of ['CONFIRMED', 'REPORTED']) {
      expect(guideSchema.safeParse({ ...guide, verification_status }).success).toBe(false);
      expect(guideSchema.safeParse({ ...guide, verification_status, source_url: article.source_url, verified_at: '2026-09-01T00:00:00Z' }).success).toBe(true);
    }
  });
  it('requires complete release-date evidence and bounded confidence', () => {
    const settings = { site_name: 'QA newsroom', release_date: '', release_source_url: '', release_verified_at: '', auto_publish_official: false, auto_publish_trusted: false, auto_publish_community: false, confidence_threshold: 85 };
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    for (const patch of [{ release_date: '2027-01-01T00:00:00Z' }, { release_source_url: article.source_url }, { confidence_threshold: 101 }]) {
      expect(settingsSchema.safeParse({ ...settings, ...patch }).success).toBe(false);
    }
  });
});

describe('admin email allowlist', () => {
  it.each([undefined, '', ' , , '])('denies all callers when allowlist is absent or blank: %s', value => {
    vi.stubEnv('ADMIN_EMAIL', value);
    expect(isAdminEmail('editor@example.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false); expect(isAdminEmail(undefined)).toBe(false);
  });
  it('matches exact normalized addresses in a comma-separated allowlist', () => {
    vi.stubEnv('ADMIN_EMAIL', ' Editor@Example.com , SECOND@example.com, ');
    expect(isAdminEmail(' editor@EXAMPLE.COM ')).toBe(true);
    expect(isAdminEmail('second@example.com')).toBe(true);
    for (const email of ['attacker@example.com', 'editor@example.com.evil.test', 'prefixeditor@example.com', 'editor+alias@example.com', 'Editor <editor@example.com>', '']) expect(isAdminEmail(email)).toBe(false);
  });
});
