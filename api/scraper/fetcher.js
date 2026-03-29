import fetch from 'node-fetch';
import { getCached, setCache } from './cache.js';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchPage(url, options = {}) {
  const cached = getCached(url);
  if (cached) return cached;

  const headers = { ...DEFAULT_HEADERS, ...options.headers };
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  setCache(url, html);
  return html;
}

export { fetchPage };
