import type { Settings, WeeklyData } from './types';
export const DEFAULT_SETTINGS: Settings = {
  release_date: null, release_source_url: null, release_verified_at: null,
  auto_publish_official: false, auto_publish_trusted: false, auto_publish_community: false,
  confidence_threshold: 90, site_name: 'Los Santos Wire',
};
export const EMPTY_WEEKLY_DATA: WeeklyData = {
  bonuses: [], vehicleDiscounts: [], propertyDiscounts: [], freeItems: [], loginRewards: [],
  weeklyChallenge: null, gtaPlusBenefits: [], newVehicles: [], featuredModes: [], weapons: [], importantNotes: [],
};
