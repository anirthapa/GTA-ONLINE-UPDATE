import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/news-sync/route';

const { runNewsSync } = vi.hoisted(() => ({ runNewsSync: vi.fn() }));
vi.mock('@/services/ingestion/pipeline', () => ({ runNewsSync }));
const secret = 'qa-cron-secret-at-least-32-characters';
const request = (authorization?: string) => new NextRequest('https://wire.example.com/api/cron/news-sync', {
  headers: authorization ? { authorization } : {},
});

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('CRON_SECRET', secret); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('cron authentication and pipeline boundary', () => {
  it.each([undefined, '', 'x'.repeat(31)])('fails closed for unconfigured/short secret %s', async value => {
    vi.stubEnv('CRON_SECRET', value);
    const response = await GET(request(`Bearer ${value ?? ''}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Cron is not configured' });
    expect(runNewsSync).not.toHaveBeenCalled();
  });
  it.each([undefined, 'Bearer wrong', `Bearer ${'x'.repeat(secret.length)}`, `Basic ${secret}`, `bearer ${secret}`, `Bearer ${secret}x`, `Bearer ${'é'.repeat(secret.length)}`])('rejects invalid authorization %s without running ingestion', async header => {
    const response = await GET(request(header));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(runNewsSync).not.toHaveBeenCalled();
  });
  it('accepts the minimum 32-character secret and returns the pipeline result uncached', async () => {
    vi.stubEnv('CRON_SECRET', 'a'.repeat(32));
    const result = { runId: 'run-qa', processed: 2, failed: 1 };
    runNewsSync.mockResolvedValue(result);
    const response = await GET(request(`Bearer ${'a'.repeat(32)}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual(result);
    expect(runNewsSync).toHaveBeenCalledExactlyOnceWith();
  });
  it.each([new Error('private DB connection details'), 'sensitive failure'])('does not disclose pipeline failures to the caller', async error => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    runNewsSync.mockRejectedValue(error);
    const response = await GET(request(`Bearer ${secret}`));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Sync failed. Inspect automation logs.' });
    expect(runNewsSync).toHaveBeenCalledOnce();
  });
});
