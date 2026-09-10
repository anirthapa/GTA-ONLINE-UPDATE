import type { Source, SourceItem } from '../../src/services/types';
import type { Extraction } from '../../src/services/ai/extract';
import { hashText, normalizeTitle } from '../../src/services/identity';
export const SOURCE_ID = '10000000-0000-4000-8000-000000000001';
export const source: Source = {
  id: SOURCE_ID, name: 'Fictional test publisher', url: 'https://news.example.com/feed', source_type: 'RSS', trust_level: 'COMMUNITY',
  enabled: true, category: 'NEWS', fetch_frequency: 30, last_checked_at: null, last_successful_fetch_at: null, failure_count: 0,
  allowed_hosts: ['news.example.com'], allow_html: false,
};
export const item: SourceItem = {
  external_id: 'test-1', url: 'https://news.example.com/test-1', title: 'Fictional example news story for ingestion testing',
  content: 'This fictional test story is used to exercise the ingestion system. It makes no actual GTA announcement.',
  published_at: '2000-01-01T00:00:00.000Z', modified_at: null,
  content_hash: hashText('fictional-test-one'), title_fingerprint: normalizeTitle('Fictional example news story for ingestion testing'),
};
export const extraction: Extraction = {
  title: item.title, excerpt: 'A fictional test story exercises the ingestion system.', content: 'The example demonstrates ingestion behavior using fictional material. It does not report any actual game announcement.',
  game: 'GTA_ONLINE', category: 'NEWS', keywords: ['fictional'], entities: [], confidence_score: 95,
  relevant: true, rumor: false, needs_review: false, story_key: 'fictional-example-ingestion-test',
  evidence: ['This fictional test story is used to exercise the ingestion system.'], weekly: null,
};
