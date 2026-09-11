export type Game = 'GTA_ONLINE' | 'GTA_6' | 'GTA_5' | 'ROCKSTAR';
export type ArticleStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type Verification = 'CONFIRMED' | 'REPORTED' | 'RUMOR' | 'UNKNOWN';
export type TrustLevel = 'OFFICIAL' | 'TRUSTED_MEDIA' | 'COMMUNITY' | 'UNVERIFIED';
export interface Article {
  id: string; slug: string; title: string; excerpt: string; content: string; game: Game;
  category: string; status: string; verification_status: string; source_url: string; source_name: string;
  published_at: string | null; updated_at: string; featured_image: string | null; image_alt: string | null;
  seo_title: string | null; seo_description: string | null; keywords: string[]; entities: string[];
  featured: boolean; trending: boolean; breaking: boolean; breaking_expires_at: string | null;
  confidence_score: number; is_seed: boolean; views: number;
  story_key?: string; content_hash?: string; created_at?: string; review_reason?: string | null;
}
export interface WeeklyData {
  bonuses: Array<{ activity: string; moneyMultiplier: number | null; rpMultiplier: number | null }>;
  vehicleDiscounts: Array<{ name: string; discount: string }>;
  propertyDiscounts: Array<{ name: string; discount: string }>;
  freeItems: string[]; loginRewards: string[]; weeklyChallenge: string | null; gtaPlusBenefits: string[];
  newVehicles: string[]; featuredModes: string[]; weapons: string[]; importantNotes: string[];
}
export interface WeeklyUpdate {
  id: string; slug: string; event_start: string; event_end: string; last_checked_at: string;
  source_url: string; article_id: string; is_seed: boolean; data: WeeklyData;
  status?: string; verification_status?: string;
}
export interface Vehicle {
  model_name?: string | null; manufacturer?: string | null; trade_price?: number | null;
  gallery?: string[]; specifications?: Record<string, string>;
  confidence_score?: number;
  id: string; slug: string; name: string; vehicle_class: string; price: number | null; top_speed: number | null;
  retailer: string | null; seats: number | null; image: string | null; description: string; source_url: string | null;
  verified_at: string | null; is_seed: boolean; features: string[]; added_at: string | null;
}
export interface VehicleOffer {
  weekly_update_id: string; name: string; vehicle_id: string | null;
  discount_text: string; discount_percent: number | null; sale_price: number | null;
  position: number; vehicle: Vehicle | null;
}
export interface Guide {
  confidence_score?: number;
  id: string; slug: string; title: string; kind: 'HEIST' | 'GUIDE' | 'CHARACTER' | 'LOCATION' | 'TRAILER' | 'FEATURE';
  game: string; description: string; content: string; facts: Record<string, string>; source_url: string | null;
  verified_at: string | null; verification_status: string; is_seed: boolean; image: string | null;
}
export interface Settings {
  release_date: string | null; release_source_url: string | null; release_verified_at: string | null;
  auto_publish_official: boolean; auto_publish_trusted: boolean; auto_publish_community: boolean;
  confidence_threshold: number; site_name: string;
}
export interface Source {
  id: string; name: string; url: string; source_type: 'RSS' | 'HTML' | 'JSON' | 'YOUTUBE' | 'COMMUNITY';
  trust_level: TrustLevel; enabled: boolean; category: string; fetch_frequency: number;
  last_checked_at: string | null; last_successful_fetch_at: string | null; failure_count: number;
  allowed_hosts: string[]; allow_html: boolean; created_at?: string; updated_at?: string;
}
export interface SourceItem {
  external_id: string; url: string; title: string; content: string; published_at: string | null;
  modified_at: string | null; content_hash: string; title_fingerprint: string;
}
