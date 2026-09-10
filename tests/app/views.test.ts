import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/views/route';

const db = vi.hoisted(() => ({ configured: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/db', () => ({ isDatabaseConfigured: db.configured, getDb: () => ({ rpc: db.rpc }) }));
vi.mock('@/lib/site', () => ({ siteUrl: 'https://wire.example.com' }));
const id = '10000000-0000-4000-8000-000000000001';
function request(body = JSON.stringify({ id }), headers: Record<string, string> = {}, origin: string | null = 'https://wire.example.com') {
  return new NextRequest('https://wire.example.com/api/views', {
    method: 'POST', body, headers: { ...(origin === null ? {} : { origin }), 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('CRON_SECRET', 'qa-analytics-secret-at-least-32-characters');
  vi.stubEnv('VERCEL', '');
  db.configured.mockReturnValue(true);
  db.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('public analytics HTTP contract with real rate-limit helper', () => {
  it.each([null, 'null', 'https://evil.example.com', 'https://wire.example.com.evil.test', 'http://wire.example.com', 'https://wire.example.com:8443'])('rejects untrusted origin %s before DB access', async origin => {
    const response = await POST(request(undefined, {}, origin));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Invalid origin' });
    expect(db.configured).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('allows the request origin on the development server', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const response = await POST(new NextRequest('http://localhost:3000/api/views', {
      method: 'POST', headers: { origin: 'http://localhost:3000' }, body: JSON.stringify({ id }),
    }));
    expect(response.status).toBe(200);
  });
  it('returns 503 if analytics DB is unavailable', async () => {
    db.configured.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Analytics not configured' });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('rejects an oversized declared body before consuming quota', async () => {
    expect((await POST(request(undefined, { 'content-length': '1025' }))).status).toBe(413);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('checks actual body size when Content-Length is absent', async () => {
    expect((await POST(request(' '.repeat(1025)))).status).toBe(413);
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
  it.each([{ id: 'not-a-uuid' }, {}, { id, views: 999 }, { id: null }, [id]])('rejects invalid article payload %j without incrementing', async body => {
    const response = await POST(request(JSON.stringify(body)));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid article' });
    expect(db.rpc.mock.calls.map(call => call[0])).toEqual(['consume_rate_limit']);
  });
  it('returns 429 when the persistent rate limit refuses the request', async () => {
    db.rpc.mockResolvedValueOnce({ data: false, error: null });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'Too many requests' });
    expect(db.rpc).toHaveBeenCalledOnce();
  });
  it('uses a hashed reader key for both quota and view increment', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const readerKey = db.rpc.mock.calls[1][1].p_reader_key;
    expect(readerKey).toMatch(/^[a-f0-9]{64}$/);
    expect(db.rpc.mock.calls).toEqual([
      ['consume_rate_limit', { p_key: `views:${readerKey}`, p_limit: 60, p_seconds: 60 }],
      ['increment_article_view', { p_article_id: id, p_reader_key: readerKey }],
    ]);
  });
  it('acknowledges a deduplicated view without retrying the increment', async () => {
    db.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    expect((await POST(request())).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledTimes(2);
  });
  it.each(['quota', 'increment'])('reports %s database failures without leaking details', async phase => {
    if (phase === 'increment') db.rpc.mockResolvedValueOnce({ data: true, error: null });
    db.rpc.mockResolvedValueOnce({ data: null, error: { message: 'private database details' } });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Unable to record view' });
  });
  it.each([undefined, 'short'])('fails closed when abuse-prevention secret is missing or short', async value => {
    vi.stubEnv('CRON_SECRET', value);
    expect((await POST(request())).status).toBe(503);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('returns a client error for malformed JSON', async () => {
    const response = await POST(request('{"id":'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON' });
    expect(db.rpc).toHaveBeenCalledOnce();
  });
  it('accepts valid JSON split across streamed chunks at the exact 1024-byte limit', async () => {
    const body = JSON.stringify({ id }).padEnd(1024, ' ');
    const bytes = new TextEncoder().encode(body);
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(bytes.slice(0, 8)); controller.enqueue(bytes.slice(8, 32)); controller.enqueue(bytes.slice(32)); controller.close();
    } });
    const init = { method: 'POST', headers: { origin: 'https://wire.example.com' }, body: stream, duplex: 'half' as const };
    expect((await POST(new NextRequest('https://wire.example.com/api/views', init))).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledTimes(2);
  });
  it('cancels oversized streaming bodies despite a misleading Content-Length', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new Uint8Array(700)); controller.enqueue(new Uint8Array(325));
    }, cancel });
    const init = { method: 'POST', headers: { origin: 'https://wire.example.com', 'content-length': '1' }, body: stream, duplex: 'half' as const };
    const response = await POST(new NextRequest('https://wire.example.com/api/views', init));
    expect(response.status).toBe(413);
    expect(cancel).toHaveBeenCalledOnce();
    expect(db.rpc).toHaveBeenCalledOnce();
  });
  it('measures multibyte payloads in bytes, not JavaScript string length', async () => {
    const body = JSON.stringify({ id, padding: 'é'.repeat(500) });
    expect(body.length).toBeLessThan(1024);
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(1024);
    expect((await POST(request(body))).status).toBe(413);
    expect(db.rpc).toHaveBeenCalledOnce();
  });
});
