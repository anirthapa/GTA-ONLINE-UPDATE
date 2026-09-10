import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request } from 'node:https';
import { canonicalizeUrl } from '../identity';

export class SourceSecurityError extends Error {}
export class FetchLimitError extends Error {}
export type Address = { address: string; family: number };
export type Resolver = (host: string) => Promise<Address[]>;
export interface FetchPolicy {
  allowedHosts: string[]; timeoutMs?: number; maxBytes?: number; maxRedirects?: number; retries?: number;
  contentTypes?: string[];
}
export interface FetchResult { url: string; status: number; headers: Record<string, string>; body: string }
export type Transport = (url: URL, address: Address, timeoutMs: number, maxBytes: number) => Promise<FetchResult>;
const resolveDns: Resolver = host => lookup(host, { all: true, verbatim: true });

export function isPublicAddress(input: string): boolean {
  if (isIP(input) === 4) {
    const [a, b, c] = input.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 192 && b === 2) || (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(input) === 6) {
    // Only native global unicast. This also rejects mapped IPv4, loopback, ULA,
    // link-local, NAT64, scoped addresses and transition/tunnelling ranges.
    if (input.includes('.') || input.includes('%')) return false;
    const [first, second = '0'] = input.toLowerCase().split(':');
    const a = parseInt(first, 16), b = parseInt(second || '0', 16);
    return a >= 0x2000 && a <= 0x3fff && a !== 0x2002 && a !== 0x3fff &&
      !(a === 0x2001 && (b < 0x200 || b === 0xdb8));
  }
  return false;
}
export function validateHttpsUrl(input: string, allowedHosts: string[]): URL {
  let url: URL;
  try { url = new URL(canonicalizeUrl(input)); } catch { throw new SourceSecurityError('Invalid public HTTPS URL.'); }
  const host = url.hostname.toLowerCase();
  if (isIP(host.replace(/^\[|\]$/g, '')) || host.endsWith('.') || !host.includes('.') ||
      !allowedHosts.map(value => value.toLowerCase()).includes(host)) {
    throw new SourceSecurityError(`Host is not explicitly allowlisted: ${host}`);
  }
  return url;
}
export async function validateDestination(input: string, allowedHosts: string[], resolver: Resolver = resolveDns): Promise<{ url: URL; address: Address }> {
  const url = validateHttpsUrl(input, allowedHosts);
  const addresses = await resolver(url.hostname);
  if (!addresses.length || addresses.some(row => !isPublicAddress(row.address))) {
    throw new SourceSecurityError('DNS resolved to a non-public destination.');
  }
  return { url, address: addresses[0] };
}

// Node's lookup callback pins the checked address while retaining the original
// hostname for TLS certificate verification/SNI. No second DNS lookup or proxy.
export const httpsTransport: Transport = (url, address, timeoutMs, maxBytes) => new Promise((resolve, reject) => {
  const req = request(url, {
    method: 'GET', agent: false, servername: url.hostname,
    headers: { 'User-Agent': 'LosSantosWire/1.0 (configured source ingestion)', Accept: '*/*', 'Accept-Encoding': 'identity' },
    lookup: (_host, options, callback) => {
      if (typeof options === 'object' && options.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    },
  }, response => {
    response.on('error', reject);
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) if (value) headers[key] = Array.isArray(value) ? value.join(', ') : value;
    if (headers['content-encoding'] && headers['content-encoding'] !== 'identity') {
      response.destroy(new FetchLimitError('Compressed responses are not accepted.')); return;
    }
    if (Number(headers['content-length'] || 0) > maxBytes) {
      response.destroy(new FetchLimitError('Response exceeds byte limit.')); return;
    }
    const chunks: Buffer[] = []; let size = 0;
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) response.destroy(new FetchLimitError('Response exceeds byte limit.'));
      else chunks.push(chunk);
    });
    response.on('end', () => resolve({ url: url.toString(), status: response.statusCode || 0, headers, body: Buffer.concat(chunks).toString('utf8') }));
  });
  const timer = setTimeout(() => req.destroy(new FetchLimitError('Source request timed out.')), timeoutMs);
  req.on('error', reject); req.on('close', () => clearTimeout(timer)); req.end();
});

async function withDeadline<T>(operation: Promise<T>, remaining: number): Promise<T> {
  if (remaining <= 0) throw new FetchLimitError('Source request timed out.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new FetchLimitError('Source request timed out.')), remaining);
    })]);
  } finally { clearTimeout(timer); }
}
export async function safeFetch(input: string, policy: FetchPolicy, deps: { resolver?: Resolver; transport?: Transport; sleep?: (ms: number) => Promise<void> } = {}): Promise<FetchResult> {
  const deadline = Date.now() + Math.min(policy.timeoutMs ?? 20_000, 30_000);
  const maxBytes = Math.min(policy.maxBytes ?? 1_000_000, 2_000_000);
  const transport = deps.transport ?? httpsTransport;
  const sleep = deps.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  let current = input, redirects = 0, retries = 0;
  while (true) {
    const destination = await withDeadline(validateDestination(current, policy.allowedHosts, deps.resolver), deadline - Date.now());
    let result: FetchResult;
    try { result = await transport(destination.url, destination.address, Math.max(1, deadline - Date.now()), maxBytes); }
    catch (error) {
      if (error instanceof SourceSecurityError || error instanceof FetchLimitError || retries >= Math.min(policy.retries ?? 2, 2)) throw error;
      await withDeadline(sleep(250 * 2 ** retries++), deadline - Date.now()); continue;
    }
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      if (!result.headers.location || redirects++ >= Math.min(policy.maxRedirects ?? 3, 5)) throw new SourceSecurityError('Redirect limit exceeded or missing location.');
      current = new URL(result.headers.location, destination.url).toString(); continue;
    }
    if ((result.status === 429 || result.status >= 500) && retries < Math.min(policy.retries ?? 2, 2)) {
      await withDeadline(sleep(250 * 2 ** retries++), deadline - Date.now()); continue;
    }
    if (result.status < 200 || result.status >= 300) throw new Error(`Source returned HTTP ${result.status}.`);
    if (Buffer.byteLength(result.body) > maxBytes) throw new FetchLimitError('Response exceeds byte limit.');
    const type = (result.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (policy.contentTypes && !policy.contentTypes.includes(type)) throw new SourceSecurityError(`Unexpected content type: ${type || 'missing'}`);
    return result;
  }
}
