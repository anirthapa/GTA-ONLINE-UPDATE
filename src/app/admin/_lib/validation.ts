import { z } from 'zod';

const text = z.string().trim();
const nullableText = (max = 2000) => text.max(max).transform(value => value || null);
export const httpsUrl = text.max(2048).url().refine(value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443'); } catch { return false; }
}, 'Use an HTTPS URL without credentials or a custom port.');
const optionalUrl = z.union([httpsUrl, z.literal('')]).transform(value => value || null);
const slug = text.min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens.');
const isoDate = z.iso.datetime({ offset: true }).transform(value => new Date(value).toISOString());
const optionalDate = z.union([z.literal(''), isoDate]).transform(value => value || null);
const pastDate = optionalDate.refine(value => !value || Date.parse(value) <= Date.now(), 'Verification dates cannot be in the future.');
const number = (min: number, max: number, integer = false) => z.preprocess(value => value === '' ? null : Number(value), (integer ? z.number().int() : z.number()).min(min).max(max).nullable());
const flag = z.boolean();
export const status = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);
export const verification = z.enum(['CONFIRMED', 'REPORTED', 'RUMOR', 'UNKNOWN']);
const stringList = z.array(text.min(1).max(500)).max(100);
function json<T extends z.ZodType>(schema: T) {
  return z.string().max(100_000).transform((value, ctx) => {
    try { return JSON.parse(value) as unknown; } catch { ctx.addIssue({ code: 'custom', message: 'Enter valid JSON.' }); return z.NEVER; }
  }).pipe(schema);
}

export const weeklyData = z.object({
  bonuses: z.array(z.object({ activity: text.min(1).max(300), moneyMultiplier: z.number().min(0).max(100).nullable(), rpMultiplier: z.number().min(0).max(100).nullable() }).strict()).max(100),
  vehicleDiscounts: z.array(z.object({ name: text.min(1).max(300), discount: text.min(1).max(200) }).strict()).max(100),
  propertyDiscounts: z.array(z.object({ name: text.min(1).max(300), discount: text.min(1).max(200) }).strict()).max(100),
  freeItems: stringList, loginRewards: stringList, weeklyChallenge: text.max(1000).nullable(), gtaPlusBenefits: stringList,
  newVehicles: stringList, featuredModes: stringList, weapons: stringList, importantNotes: stringList,
}).strict();

export const emptyWeekly = { bonuses: [], vehicleDiscounts: [], propertyDiscounts: [], freeItems: [], loginRewards: [], weeklyChallenge: null, gtaPlusBenefits: [], newVehicles: [], featuredModes: [], weapons: [], importantNotes: [] };

export const articleSchema = z.object({
  slug, title: text.min(3).max(220), excerpt: text.min(10).max(1000), content: text.min(20).max(100_000),
  game: z.enum(['GTA_ONLINE', 'GTA_6', 'GTA_5', 'ROCKSTAR']), category: text.min(1).max(80), status, verification_status: verification,
  source_url: httpsUrl, source_name: text.min(1).max(200), featured_image: optionalUrl, image_alt: nullableText(300),
  seo_title: nullableText(70), seo_description: nullableText(180), keywords: json(stringList), entities: json(stringList),
  featured: flag, trending: flag, breaking: flag, breaking_expires_at: optionalDate,
  confidence_score: z.coerce.number().min(0).max(100),
}).superRefine((value, ctx) => {
  if (value.featured_image && !value.image_alt) ctx.addIssue({ code: 'custom', path: ['image_alt'], message: 'Describe the featured image for accessibility.' });
  if (value.breaking && (!value.breaking_expires_at || Date.parse(value.breaking_expires_at) <= Date.now())) ctx.addIssue({ code: 'custom', path: ['breaking_expires_at'], message: 'Breaking stories require a future expiry.' });
  if (value.status === 'PUBLISHED' && value.verification_status === 'UNKNOWN') ctx.addIssue({ code: 'custom', path: ['verification_status'], message: 'Unknown claims cannot be published. Verify and label the evidence first.' });
});

export const weeklySchema = z.object({
  slug, event_start: isoDate, event_end: isoDate, last_checked_at: isoDate.refine(value => Date.parse(value) <= Date.now(), 'Source check dates cannot be in the future.'), source_url: httpsUrl,
  article_id: z.uuid('Select a valid related article UUID.'), status,
  verification_status: verification, data: json(weeklyData),
}).superRefine((value, ctx) => {
  if (Date.parse(value.event_end) <= Date.parse(value.event_start)) ctx.addIssue({ code: 'custom', path: ['event_end'], message: 'The exclusive end must be after the start.' });
  if (Date.parse(value.event_end) - Date.parse(value.event_start) > 21 * 86_400_000) ctx.addIssue({ code: 'custom', path: ['event_end'], message: 'Weekly event windows cannot exceed 21 days.' });
  if (value.status === 'PUBLISHED' && value.verification_status !== 'CONFIRMED') ctx.addIssue({ code: 'custom', path: ['verification_status'], message: 'Publication requires confirmed source evidence.' });
});

export const vehicleSchema = z.object({
  slug, name: text.min(1).max(200), vehicle_class: text.min(1).max(100), price: number(0, 1e9), top_speed: number(0, 1000),
  retailer: nullableText(200), seats: number(1, 100, true), image: optionalUrl, description: text.min(10).max(20_000),
  source_url: optionalUrl, verified_at: pastDate, features: json(stringList), added_at: optionalDate,
  confidence_score: z.coerce.number().min(0).max(100).default(0),
}).refine(value => !value.verified_at || value.source_url, { path: ['source_url'], message: 'A verification date requires a source URL.' });

export const guideSchema = z.object({
  slug, title: text.min(3).max(220), kind: z.enum(['HEIST', 'GUIDE', 'CHARACTER', 'LOCATION', 'TRAILER', 'FEATURE']),
  game: z.enum(['GTA_ONLINE', 'GTA_6', 'GTA_5', 'ROCKSTAR']), description: text.min(10).max(2000), content: text.min(20).max(100_000),
  facts: json(z.record(text.min(1).max(100), text.min(1).max(2000)).refine(value => Object.keys(value).length <= 100, 'Use at most 100 facts.')),
  source_url: optionalUrl, verified_at: pastDate, verification_status: verification, image: optionalUrl,
  confidence_score: z.coerce.number().min(0).max(100).default(0),
}).superRefine((value, ctx) => {
  if (['CONFIRMED', 'REPORTED'].includes(value.verification_status) && (!value.source_url || !value.verified_at)) ctx.addIssue({ code: 'custom', path: ['verified_at'], message: 'Confirmed and reported guides require a source and verification date.' });
  if (value.verified_at && !value.source_url) ctx.addIssue({ code: 'custom', path: ['source_url'], message: 'A verification date requires a source URL.' });
});

export const sourceSchema = z.object({
  name: text.min(2).max(150), url: httpsUrl, source_type: z.enum(['RSS', 'HTML', 'JSON', 'YOUTUBE', 'COMMUNITY']),
  trust_level: z.enum(['OFFICIAL', 'TRUSTED_MEDIA', 'COMMUNITY', 'UNVERIFIED']), enabled: flag, category: text.min(1).max(100),
  fetch_frequency: z.coerce.number().int().min(5).max(10080),
  allowed_hosts: json(z.array(text.min(1).max(253).regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/, 'Use exact DNS hostnames, without schemes or wildcards.')).min(1).max(10)), allow_html: flag,
}).superRefine((value, ctx) => {
  if (!value.allowed_hosts.includes(new URL(value.url).hostname.toLowerCase())) ctx.addIssue({ code: 'custom', path: ['allowed_hosts'], message: 'Include the exact source URL hostname.' });
  if (value.source_type === 'HTML' && !value.allow_html) ctx.addIssue({ code: 'custom', path: ['allow_html'], message: 'HTML sources require explicit HTML fetching permission.' });
  if (value.source_type === 'COMMUNITY' && value.trust_level !== 'COMMUNITY') ctx.addIssue({ code: 'custom', path: ['trust_level'], message: 'Community sources must retain community trust.' });
});

export const settingsSchema = z.object({
  site_name: text.min(2).max(100), release_date: optionalDate, release_source_url: optionalUrl, release_verified_at: pastDate,
  auto_publish_official: flag, auto_publish_trusted: flag, auto_publish_community: flag, confidence_threshold: z.coerce.number().min(0).max(100),
}).superRefine((value, ctx) => {
  if (value.release_date && (!value.release_source_url || !value.release_verified_at)) ctx.addIssue({ code: 'custom', path: ['release_date'], message: 'A release date requires an official Rockstar HTTPS source and a verification timestamp.' });
  if (!value.release_date && (value.release_source_url || value.release_verified_at)) ctx.addIssue({ code: 'custom', path: ['release_date'], message: 'Clear all three release fields to remove the announcement.' });
});

export const schemas = { articles: articleSchema, weekly: weeklySchema, vehicles: vehicleSchema, guides: guideSchema, sources: sourceSchema, settings: settingsSchema };
export type Entity = keyof typeof schemas;
export const tables = { articles: 'articles', weekly: 'weekly_updates', vehicles: 'vehicles', guides: 'guides', sources: 'sources', settings: 'site_settings' } as const;
export type ActionState = { error?: string; success?: string; fields?: Record<string, string>; result?: string };
