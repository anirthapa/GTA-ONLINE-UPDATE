export const SITE_NAME = 'Los Santos Wire';
export const SITE_DESCRIPTION = 'Independent GTA news. Weekly GTA Online bonuses, GTA VI announcements, vehicles and guides — with the sources to back them up.';
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const navigation = [
  ['Home', '/'], ['GTA Online', '/gta-online'], ['GTA VI', '/gta-6'], ['Weekly Update', '/gta-online/weekly-update'], ['Guides', '/guides'], ['Vehicles', '/gta-online/vehicles'], ['Heists', '/gta-online/heists'], ['News', '/news'], ['Rumors', '/rumors'],
] as const;
export const disclaimer = 'This website is an independent fan-operated GTA news and information platform and is not affiliated with Rockstar Games or Take-Two Interactive.';
export const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
