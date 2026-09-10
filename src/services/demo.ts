import type { Article, Guide, Vehicle, WeeklyUpdate } from './types';
import { EMPTY_WEEKLY_DATA } from './defaults';

// Deliberately historical, fictional fixtures. Never presented as live GTA news.
const DATE = '2000-01-01T00:00:00.000Z';
const base: Article = {
  id: '00000000-0000-4000-8000-000000000001', slug: 'fictional-test-editorial-workflow',
  title: '[FICTIONAL TEST] Inside the example newsroom',
  excerpt: 'A fictional interface fixture showing how attributed reporting will appear. This is not a GTA announcement.',
  content: 'This fictional test record demonstrates the editorial layout. No game update, release date, reward, vehicle statistic, or event is asserted. Configure and verify real sources to populate the newsroom with attributable reporting.',
  game: 'GTA_ONLINE', category: 'NEWS', status: 'PUBLISHED', verification_status: 'REPORTED',
  source_url: 'https://example.invalid/fictional-test/editorial-workflow', source_name: 'FICTIONAL TEST — no real publisher',
  published_at: DATE, updated_at: DATE, featured_image: null, image_alt: null, seo_title: null, seo_description: null,
  keywords: ['fictional', 'test'], entities: [], featured: false, trending: false, breaking: false,
  breaking_expires_at: null, confidence_score: 0, is_seed: true, views: 0,
};
export const DEMO_ARTICLES: Article[] = [base,
  { ...base, id: '00000000-0000-4000-8000-000000000002', slug: 'fictional-test-source-attribution', game: 'GTA_6',
    title: '[FICTIONAL TEST] Source attribution example', excerpt: 'A historical test fixture for source labels. No release timing or game details are claimed.',
    source_url: 'https://example.invalid/fictional-test/source-attribution' },
  { ...base, id: '00000000-0000-4000-8000-000000000003', slug: 'fictional-test-review-queue', game: 'GTA_5',
    title: '[FICTIONAL TEST] A sample report awaiting real evidence', excerpt: 'A fictional example for testing the site. This item contains no actual game news.',
    source_url: 'https://example.invalid/fictional-test/review-queue' },
  { ...base, id: '00000000-0000-4000-8000-000000000004', slug: 'fictional-test-patch-notes', category: 'PATCH_NOTES',
    title: '[FICTIONAL TEST] Reading a sample patch report', excerpt: 'A layout example for future patch coverage. No actual fixes or balance changes are asserted.', source_url: 'https://example.invalid/fictional-test/patch' },
  { ...base, id: '00000000-0000-4000-8000-000000000005', slug: 'fictional-test-vehicle-desk', category: 'VEHICLES',
    title: '[FICTIONAL TEST] At the vehicle research desk', excerpt: 'An illustrative catalog story. Prices, performance figures and vehicle availability remain unknown.', source_url: 'https://example.invalid/fictional-test/vehicles' },
  { ...base, id: '00000000-0000-4000-8000-000000000006', slug: 'fictional-test-trailer-desk', category: 'TRAILERS', game: 'GTA_6',
    title: '[FICTIONAL TEST] How a trailer report will look', excerpt: 'A fictional trailer-page fixture with no video, invented scenes, or claimed release schedule.', source_url: 'https://example.invalid/fictional-test/trailer' },
  { ...base, id: '00000000-0000-4000-8000-000000000007', slug: 'fictional-test-community-report', category: 'COMMUNITY', game: 'ROCKSTAR',
    title: '[FICTIONAL TEST] A sample community dispatch', excerpt: 'Example attribution for a community report. This fixture is not a sourced real-world claim.', source_url: 'https://example.invalid/fictional-test/community' },
  { ...base, id: '00000000-0000-4000-8000-000000000008', slug: 'fictional-test-weekly-desk', category: 'WEEKLY_UPDATE',
    title: '[FICTIONAL TEST] The weekly verification checklist', excerpt: 'A historical weekly layout example. No current bonuses, discounts or reward details are provided.', source_url: 'https://example.invalid/fictional-test/weekly' },
];
export const DEMO_WEEKLY: WeeklyUpdate[] = [{
  id: '00000000-0000-4000-8000-000000000010', slug: 'fictional-test-week-2000-01-01',
  event_start: DATE, event_end: '2000-01-08T00:00:00.000Z', last_checked_at: DATE,
  source_url: 'https://example.invalid/fictional-test/week', article_id: base.id, is_seed: true,
  status: 'ARCHIVED', verification_status: 'UNKNOWN',
  data: { ...EMPTY_WEEKLY_DATA, importantNotes: ['FICTIONAL TEST archive. No actual rewards, discounts, or events are represented.'] },
}];
export const DEMO_VEHICLES: Vehicle[] = [{
  id: '00000000-0000-4000-8000-000000000020', slug: 'fictional-test-vehicle', name: '[FICTIONAL TEST] Example vehicle',
  vehicle_class: 'Test fixture', price: null, top_speed: null, retailer: null, seats: null, image: null,
  description: 'A fictional catalog fixture. This is not an actual GTA vehicle; all game statistics are intentionally unknown.',
  source_url: null, verified_at: null, is_seed: true, features: [], added_at: null,
}];
const demoGuide: Guide = {
  id: '00000000-0000-4000-8000-000000000030', slug: 'fictional-test-guide', title: '[FICTIONAL TEST] Guide layout example',
  kind: 'GUIDE', game: 'GTA_ONLINE', description: 'An example guide layout, containing no gameplay advice.',
  content: 'This fixture demonstrates the guide page. Real guides require attributable sources and editorial verification before publication.',
  facts: { Notice: 'FICTIONAL TEST — not gameplay guidance' }, source_url: null, verified_at: null,
  verification_status: 'UNKNOWN', is_seed: true, image: null,
};
export const DEMO_GUIDES: Guide[] = [demoGuide,
  { ...demoGuide, id: '00000000-0000-4000-8000-000000000031', slug: 'cayo-perico', kind: 'HEIST',
    title: '[FICTIONAL TEST] Cayo Perico guide layout', description: 'Test route and guide layout only. No payout, setup, strategy, or requirements are asserted.' },
  { ...demoGuide, id: '00000000-0000-4000-8000-000000000032', slug: 'diamond-casino', kind: 'HEIST',
    title: '[FICTIONAL TEST] Diamond Casino guide layout', description: 'A fictional editorial fixture for testing heist navigation, containing no gameplay claims.' },
  { ...demoGuide, id: '00000000-0000-4000-8000-000000000033', slug: 'lucia', kind: 'CHARACTER', game: 'GTA_6',
    title: '[FICTIONAL TEST] Lucia character-page layout', description: 'Navigation fixture only. No biography, relationship, plot, or character facts are asserted.' },
  { ...demoGuide, id: '00000000-0000-4000-8000-000000000034', slug: 'jason', kind: 'CHARACTER', game: 'GTA_6',
    title: '[FICTIONAL TEST] Jason character-page layout', description: 'A character-page test fixture. No invented biography or story details are included.' },
  { ...demoGuide, id: '00000000-0000-4000-8000-000000000035', slug: 'fictional-test-trailer', kind: 'TRAILER', game: 'GTA_6',
    title: '[FICTIONAL TEST] Trailer viewer layout', description: 'A test of trailer presentation with no claimed official video or fabricated video ID.' },
  { ...demoGuide, id: '00000000-0000-4000-8000-000000000036', slug: 'fictional-test-location', kind: 'LOCATION', game: 'GTA_6',
    title: '[FICTIONAL TEST] Location research layout', description: 'A location-page layout test containing no map or geography claims.' },
];
export function demoAllowed(): boolean {
  return process.env.NODE_ENV === 'development' || (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production');
}
