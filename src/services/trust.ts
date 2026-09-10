import type { Settings, Source, Verification, ArticleStatus } from './types';
import { validateHttpsUrl } from './sources/safe-fetch';

// Exact hosts only: no suffix matching, user-supplied official allowlists, or
// community/YouTube ownership inferred from publisher names.
export const OFFICIAL_HOSTS = ['www.rockstargames.com', 'rockstargames.com', 'support.rockstargames.com'];
export function isOfficialUrl(input: string): boolean {
  try { validateHttpsUrl(input, OFFICIAL_HOSTS); return true; } catch { return false; }
}
export function verifiedSourceTrust(source: Source, itemUrl: string): Source['trust_level'] {
  validateHttpsUrl(source.url, source.allowed_hosts);
  validateHttpsUrl(itemUrl, source.allowed_hosts);
  if (source.trust_level === 'OFFICIAL' && (!isOfficialUrl(source.url) || !isOfficialUrl(itemUrl))) {
    throw new Error('Official ownership check failed. Only approved Rockstar hosts can be official.');
  }
  return source.trust_level;
}
export function enforceTrust(source: Source, itemUrl: string, confidence: number, settings: Settings, opts: { rumor?: boolean; conflict?: boolean; relevant?: boolean; needsReview?: boolean } = {}): { verification_status: Verification; status: ArticleStatus; review_reason: string | null } {
  const trust = verifiedSourceTrust(source, itemUrl);
  const verification: Verification = trust === 'OFFICIAL' ? 'CONFIRMED' : opts.rumor ? 'RUMOR' : trust === 'UNVERIFIED' ? 'UNKNOWN' : 'REPORTED';
  const allowed = trust === 'OFFICIAL' ? settings.auto_publish_official : trust === 'TRUSTED_MEDIA' ? settings.auto_publish_trusted : trust === 'COMMUNITY' ? settings.auto_publish_community : false;
  const review = trust === 'UNVERIFIED' ? 'Unknown source authority.' : opts.conflict ? 'Conflicting evidence requires editorial review.' : opts.needsReview ? 'Extraction flagged for review.' :
    opts.relevant === false ? 'Not clearly relevant to the editorial scope.' : confidence < settings.confidence_threshold ? 'Confidence below publication threshold.' : null;
  return { verification_status: verification, status: review || opts.rumor ? 'REVIEW' : allowed ? 'PUBLISHED' : 'DRAFT', review_reason: review ?? (opts.rumor ? 'Unconfirmed claim: rumor label retained.' : null) };
}
