import fetch, { RequestInit } from 'node-fetch';
import { getCached, setCache } from './cache.js';

/** Error carrying the upstream HTTP status so routes can map it to their own. */
class UpstreamError extends Error {
  status: number;
  constructor(status: number) {
    super(`Upstream responded with HTTP ${status}`);
    this.name = 'UpstreamError';
    this.status = status;
  }
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchPage(url: string, options: FetchOptions = {}): Promise<string> {
  const cached = await getCached(url);
  if (cached) return cached;

  const headers = { ...DEFAULT_HEADERS, ...options.headers };
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) throw new UpstreamError(res.status);
  const html = await res.text();
  await setCache(url, html);
  return html;
}

export { fetchPage, UpstreamError };
