import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), cookies: vi.fn(), createServerClient: vi.fn() }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
import { authSetupMissing, createAuthClient, isAdminEmail, requireAdmin } from '@/lib/auth';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-only');
  vi.stubEnv('ADMIN_EMAIL', 'Editor@Example.com, owner@example.com');
  mocks.createServerClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
  mocks.cookies.mockResolvedValue({ getAll: () => [], set: vi.fn() });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('admin session boundary', () => {
  it('matches only exact normalized allowlist emails', () => {
    expect(isAdminEmail('EDITOR@example.com')).toBe(true);
    expect(isAdminEmail('owner@example.com')).toBe(true);
    expect(isAdminEmail('editor@example.com.attacker.test')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
  it('fails closed with missing environment even in demo mode', async () => {
    vi.stubEnv('DEMO_MODE', 'true'); vi.stubEnv('ADMIN_EMAIL', '');
    expect(authSetupMissing()).toContain('ADMIN_EMAIL');
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/admin/login');
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('rejects absent, unconfirmed, non-admin, and revoked users', async () => {
    for (const user of [null, { email: 'editor@example.com' }, { email: 'attacker@example.com', email_confirmed_at: '2026-01-01' }]) {
      mocks.getUser.mockResolvedValue({ data: { user }, error: null });
      await expect(requireAdmin()).rejects.toThrow('REDIRECT:/admin/login?error=unauthorized');
    }
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'editor@example.com', email_confirmed_at: '2026-01-01' } }, error: new Error('Revoked') });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/admin/login?error=unauthorized');
  });
  it('revalidates getUser on every authorization check', async () => {
    const user = { id: 'admin', email: 'editor@example.com', email_confirmed_at: '2026-01-01' };
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await requireAdmin()).toEqual(user);
    expect(await requireAdmin()).toEqual(user);
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
  });
  it('uses anon SSR credentials and production-protected cookies', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await createAuthClient();
    expect(mocks.createServerClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon', expect.objectContaining({ cookieOptions: expect.objectContaining({ httpOnly: true, sameSite: 'lax', secure: true, path: '/' }) }));
  });
});
