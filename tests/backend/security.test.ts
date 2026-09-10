import { describe, expect, it, vi } from 'vitest';
import { canonicalizeUrl, hashText, normalizeTitle, titleSimilarity } from '../../src/services/identity';
import { safeFetch, validateDestination, validateHttpsUrl, isPublicAddress, type FetchResult, type Transport } from '../../src/services/sources/safe-fetch';
import { enforceTrust, isOfficialUrl } from '../../src/services/trust';
import { DEFAULT_SETTINGS } from '../../src/services/defaults';
import { source } from './fixtures';

describe('public HTTPS source boundary', () => {
  it.each(['127.0.0.1', '0.0.0.0', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1',
    '198.18.0.1', '224.0.0.1', '240.0.0.1', '192.0.2.4', '198.51.100.1', '203.0.113.1', '::', '::1', 'fc00::1',
    'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '64:ff9b::a00:1', '2002:7f00::1', '2001:db8::1', '2001::1', 'ff02::1'])('rejects nonpublic address %s', value => {
    expect(isPublicAddress(value)).toBe(false);
  });
  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111', '2001:4860:4860::8888'])('accepts native global address %s', value => {
    expect(isPublicAddress(value)).toBe(true);
  });
  it.each(['http://news.example.com/feed', 'https://user:pass@news.example.com/feed', 'https://news.example.com:8443/feed',
    'https://127.0.0.1/', 'https://2130706433/', 'https://0x7f000001/', 'https://[::1]/', 'https://news.example.com.evil.test/',
    'https://news.example.com./', 'file:///etc/passwd', 'https://localhost/'])('rejects unsafe URL %s', value => {
    expect(() => validateHttpsUrl(value, ['news.example.com', 'localhost'])).toThrow();
  });
  it('rejects mixed DNS answers even when the first IP is public', async () => {
    await expect(validateDestination(source.url, source.allowed_hosts, async () => [{ address: '1.1.1.1', family: 4 }, { address: '127.0.0.1', family: 4 }])).rejects.toThrow('non-public');
  });
  it('pins the checked IP for the actual transport and rechecks every redirect', async () => {
    const resolver = vi.fn(async () => [{ address: '1.1.1.1', family: 4 }]);
    const transport = vi.fn<Transport>().mockResolvedValueOnce({ url: source.url, status: 302, headers: { location: 'https://private.example.com/' }, body: '' });
    await expect(safeFetch(source.url, { allowedHosts: source.allowed_hosts }, { resolver, transport })).rejects.toThrow('allowlisted');
    expect(transport).toHaveBeenCalledTimes(1); expect(transport.mock.calls[0][1]).toEqual({ address: '1.1.1.1', family: 4 });
  });
  it('rejects DNS rebinding on an allowlisted redirect host', async () => {
    const resolver = vi.fn().mockResolvedValueOnce([{ address: '1.1.1.1', family: 4 }]).mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
    const transport = vi.fn<Transport>().mockResolvedValue({ url: source.url, status: 302, headers: { location: '/redirected' }, body: '' });
    await expect(safeFetch(source.url, { allowedHosts: source.allowed_hosts }, { resolver, transport })).rejects.toThrow('non-public');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  const deps = () => ({ resolver: async () => [{ address: '1.1.1.1', family: 4 }], sleep: async () => {} });
  const response = (status: number, body = 'feed'): FetchResult => ({ url: source.url, status, body, headers: { 'content-type': 'application/rss+xml' } });
  it('retries transient errors within a bounded attempt count', async () => {
    const transport = vi.fn<Transport>().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(200));
    expect((await safeFetch(source.url, { allowedHosts: source.allowed_hosts }, { ...deps(), transport })).body).toBe('feed');
    expect(transport).toHaveBeenCalledTimes(3);
  });
  it('does not retry persistent client errors', async () => {
    const transport = vi.fn<Transport>().mockResolvedValue(response(403));
    await expect(safeFetch(source.url, { allowedHosts: source.allowed_hosts }, { ...deps(), transport })).rejects.toThrow('403');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('bounds redirects, response bytes, content types and DNS timeout', async () => {
    await expect(safeFetch(source.url, { allowedHosts: source.allowed_hosts, maxRedirects: 1 }, { ...deps(), transport: async () => ({ ...response(302), headers: { location: '/again' } }) })).rejects.toThrow('Redirect limit');
    await expect(safeFetch(source.url, { allowedHosts: source.allowed_hosts, maxBytes: 3 }, { ...deps(), transport: async () => response(200, 'large') })).rejects.toThrow('byte limit');
    await expect(safeFetch(source.url, { allowedHosts: source.allowed_hosts, contentTypes: ['application/json'] }, { ...deps(), transport: async () => response(200) })).rejects.toThrow('content type');
    await expect(safeFetch(source.url, { allowedHosts: source.allowed_hosts, timeoutMs: 5 }, { resolver: () => new Promise(() => {}) })).rejects.toThrow('timed out');
  });
});
describe('identity and trusted ownership', () => {
  it('normalizes tracking while retaining meaningful query and case', () => {
    expect(canonicalizeUrl('https://NEWS.example.com/Story?b=2&utm_source=x&a=1#top')).toBe('https://news.example.com/Story?a=1&b=2');
    expect(canonicalizeUrl('https://news.example.com/Story?id=2')).not.toBe(canonicalizeUrl('https://news.example.com/Story?id=3'));
    expect(hashText('some\ntext')).toBe(hashText('some  text'));
    expect(normalizeTitle('Breaking: NEW Story!')).toBe('breaking new story');
    expect(titleSimilarity('one two three four', 'one two three four five')).toBe(0.8);
  });
  it('does not recognize lookalikes, credentials, arbitrary subdomains or YouTube as official', () => {
    expect(isOfficialUrl('https://www.rockstargames.com/newswire/test')).toBe(true);
    for (const url of ['https://rockstargames.com.evil.test/', 'https://user@rockstargames.com/', 'https://unreviewed.rockstargames.com/', 'https://www.youtube.com/watch?v=x']) expect(isOfficialUrl(url)).toBe(false);
  });
  it('keeps trust independent from model confidence and auto-publish settings', () => {
    const settings = { ...DEFAULT_SETTINGS, auto_publish_community: true, auto_publish_trusted: true };
    expect(enforceTrust(source, 'https://news.example.com/story', 100, settings).verification_status).toBe('REPORTED');
    expect(enforceTrust({ ...source, trust_level: 'TRUSTED_MEDIA' }, 'https://news.example.com/story', 100, settings).verification_status).toBe('REPORTED');
    expect(enforceTrust({ ...source, trust_level: 'UNVERIFIED' }, 'https://news.example.com/story', 100, settings)).toMatchObject({ status: 'REVIEW', review_reason: 'Unknown source authority.' });
    expect(enforceTrust(source, 'https://news.example.com/story', 100, settings, { rumor: true })).toMatchObject({ verification_status: 'RUMOR', status: 'REVIEW' });
    expect(enforceTrust(source, 'https://news.example.com/story', 20, settings).status).toBe('REVIEW');
    expect(() => enforceTrust({ ...source, trust_level: 'OFFICIAL' }, 'https://news.example.com/story', 100, settings)).toThrow('ownership');
  });
});
