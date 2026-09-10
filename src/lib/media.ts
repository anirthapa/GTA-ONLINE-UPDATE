export const editorialImage = '/images/city-editorial.png';
export function mediaSource(value: string | null | undefined): string {
  if (!value) return editorialImage;
  if (/^\/images\/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp|avif)$/i.test(value)) return value;
  try { const u = new URL(value); if (u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443')) return u.href; } catch {}
  return editorialImage;
}
