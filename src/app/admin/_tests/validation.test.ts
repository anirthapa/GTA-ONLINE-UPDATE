import { describe, expect, it } from 'vitest';
import { articleSchema, emptyWeekly, guideSchema, httpsUrl, settingsSchema, sourceSchema, vehicleSchema, weeklySchema } from '../_lib/validation';

const article = { slug: 'test-story', title: 'Test story', excerpt: 'An attributed test story.', content: 'This is sufficient editorial test content.', game: 'GTA_ONLINE', category: 'News', status: 'DRAFT', verification_status: 'UNKNOWN', source_url: 'https://www.rockstargames.com/newswire', source_name: 'Rockstar', featured_image: '', image_alt: '', seo_title: '', seo_description: '', keywords: '[]', entities: '[]', featured: false, trending: false, breaking: false, breaking_expires_at: '', confidence_score: 90 };
const weekly = { slug: 'test-week', event_start: '2026-01-01T00:00:00Z', event_end: '2026-01-08T00:00:00Z', last_checked_at: '2026-01-01T00:00:00Z', source_url: 'https://www.rockstargames.com/newswire', article_id: '123e4567-e89b-42d3-a456-426614174000', status: 'PUBLISHED', verification_status: 'CONFIRMED', data: JSON.stringify(emptyWeekly) };
const source = { name: 'Test feed', url: 'https://www.rockstargames.com/newswire', source_type: 'RSS', trust_level: 'OFFICIAL', enabled: false, category: 'News', fetch_frequency: 60, allowed_hosts: '["www.rockstargames.com"]', allow_html: false };

describe('editor validation', () => {
  it('uses canonical verification enums and refuses unknown publication', () => {
    expect(articleSchema.safeParse(article).success).toBe(true);
    for (const value of ['OFFICIAL', 'VERIFIED', 'UNVERIFIED']) expect(articleSchema.safeParse({ ...article, verification_status: value }).success).toBe(false);
    expect(articleSchema.safeParse({ ...article, status: 'PUBLISHED' }).success).toBe(false);
    for (const value of ['CONFIRMED', 'REPORTED', 'RUMOR']) expect(articleSchema.safeParse({ ...article, status: 'PUBLISHED', verification_status: value }).success).toBe(true);
  });
  it('rejects malformed or incorrectly structured JSON', () => {
    expect(articleSchema.safeParse({ ...article, keywords: '{broken' }).success).toBe(false);
    expect(articleSchema.safeParse({ ...article, entities: '{"unexpected":true}' }).success).toBe(false);
    expect(weeklySchema.safeParse({ ...weekly, data: JSON.stringify({ ...emptyWeekly, bonuses: [{ activity: 'Race', moneyMultiplier: '2x', rpMultiplier: 2 }] }) }).success).toBe(false);
    expect(weeklySchema.safeParse({ ...weekly, data: JSON.stringify({ ...emptyWeekly, unauthorized: true }) }).success).toBe(false);
  });
  it('requires confirmed weekly publication, real calendar dates and an exclusive end', () => {
    expect(weeklySchema.safeParse(weekly).success).toBe(true);
    expect(weeklySchema.safeParse({ ...weekly, verification_status: 'REPORTED' }).success).toBe(false);
    expect(weeklySchema.safeParse({ ...weekly, event_end: weekly.event_start }).success).toBe(false);
    expect(weeklySchema.safeParse({ ...weekly, event_start: '2026-02-30T00:00:00Z' }).success).toBe(false);
    expect(weeklySchema.safeParse({ ...weekly, last_checked_at: '2999-01-01T00:00:00Z' }).success).toBe(false);
    expect(weeklySchema.safeParse({ ...weekly, last_checked_at: '' }).success).toBe(false);
    expect(weeklySchema.safeParse({ ...weekly, article_id: '' }).success).toBe(false);
    expect(weeklySchema.safeParse({ ...weekly, event_end: '2026-01-23T00:00:00Z' }).success).toBe(false);
  });
  it('requires alt text and a future breaking-news expiry', () => {
    expect(articleSchema.safeParse({ ...article, featured_image: 'https://example.com/image.jpg' }).success).toBe(false);
    expect(articleSchema.safeParse({ ...article, breaking: true }).success).toBe(false);
    expect(articleSchema.safeParse({ ...article, breaking: true, breaking_expires_at: '2000-01-01T00:00:00Z' }).success).toBe(false);
  });
  it('rejects URL credentials, non-HTTPS protocols and custom ports', () => {
    for (const url of ['http://example.com', 'https://user:secret@example.com', 'javascript:alert(1)', 'https://example.com:444']) expect(httpsUrl.safeParse(url).success).toBe(false);
  });
  it('preserves community trust and validates fetching controls', () => {
    expect(sourceSchema.safeParse(source).success).toBe(true);
    expect(sourceSchema.safeParse({ ...source, trust_level: 'TRUSTED' }).success).toBe(false);
    expect(sourceSchema.safeParse({ ...source, source_type: 'COMMUNITY' }).success).toBe(false);
    expect(sourceSchema.safeParse({ ...source, source_type: 'HTML' }).success).toBe(false);
    expect(sourceSchema.safeParse({ ...source, fetch_frequency: 4 }).success).toBe(false);
    expect(sourceSchema.safeParse({ ...source, allowed_hosts: '["*.rockstargames.com"]' }).success).toBe(false);
    expect(sourceSchema.safeParse({ ...source, allowed_hosts: '["example.com"]' }).success).toBe(false);
  });
  it('validates catalog JSON and evidence dates', () => {
    const vehicle = { slug: 'test-car', name: 'Test car', vehicle_class: 'Sports', price: '', top_speed: '', retailer: '', seats: '', image: '', description: 'A test vehicle entry.', source_url: '', verified_at: '', features: '[]', added_at: '' };
    expect(vehicleSchema.parse(vehicle).price).toBe(null);
    expect(vehicleSchema.parse(vehicle).confidence_score).toBe(0);
    expect(vehicleSchema.parse({ ...vehicle, confidence_score: '82.5' }).confidence_score).toBe(82.5);
    for (const score of [-1, 101, 'not-a-number']) expect(vehicleSchema.safeParse({ ...vehicle, confidence_score: score }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...vehicle, features: '[1]' }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...vehicle, seats: '1.5' }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...vehicle, verified_at: '2026-01-01T00:00:00Z' }).success).toBe(false);
    const guide = { slug: 'test-guide', title: 'Test guide', kind: 'GUIDE', game: 'GTA_ONLINE', description: 'A test guide entry.', content: 'A sufficiently long guide for a validation test.', facts: '{}', source_url: '', verified_at: '', verification_status: 'UNKNOWN', image: '' };
    expect(guideSchema.safeParse(guide).success).toBe(true);
    expect(guideSchema.parse(guide).confidence_score).toBe(0);
    expect(guideSchema.parse({ ...guide, confidence_score: '100' }).confidence_score).toBe(100);
    for (const score of [-1, 101, 'not-a-number']) expect(guideSchema.safeParse({ ...guide, confidence_score: score }).success).toBe(false);
    expect(guideSchema.safeParse({ ...guide, facts: '{"Nested":{"value":true}}' }).success).toBe(false);
    expect(guideSchema.safeParse({ ...guide, verification_status: 'CONFIRMED' }).success).toBe(false);
    expect(guideSchema.safeParse({ ...guide, verification_status: 'REPORTED', verified_at: '2026-01-01T00:00:00Z' }).success).toBe(false);
  });
  it('requires complete dated evidence for release settings', () => {
    const settings = { site_name: 'Test newsroom', release_date: '', release_source_url: '', release_verified_at: '', auto_publish_official: false, auto_publish_trusted: false, auto_publish_community: false, confidence_threshold: 85 };
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    expect(settingsSchema.safeParse({ ...settings, release_date: '2027-01-01T00:00:00Z' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, release_verified_at: '2026-01-01T00:00:00Z' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, confidence_threshold: 101 }).success).toBe(false);
  });
});
