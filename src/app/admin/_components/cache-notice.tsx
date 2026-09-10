export function CacheNotice({ state }: { state?: string }) {
  return state === 'stale' ? <p className="notice" role="status">Your change was saved, but the additional public-cache refresh failed. Database invalidation remains active; cached lists may take up to 45 seconds to refresh. Check the database connection if this repeats.</p> : null;
}
