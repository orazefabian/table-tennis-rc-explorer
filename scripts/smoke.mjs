/**
 * Browser smoke test for the local dev server.
 *
 * Walks the main flows (search → player → tabs → event) against live data and
 * reports anything that looks broken: console errors, dead links, missing or
 * malformed values. Run with `npm run smoke` while `npm run dev:all` is up.
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173';
const PLAYER = '156683';

const failures = [];
const notes = [];
function check(label, ok, detail = '') {
  if (ok) notes.push(`  ok   ${label}`);
  else failures.push(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

/** Run a group of checks; a thrown error fails the group instead of the run. */
async function step(label, fn) {
  try {
    await fn();
  } catch (e) {
    failures.push(`  FAIL ${label} — ${String(e.message || e).split('\n')[0]}`);
  }
}

// Tabs are labelled in the active language, so address them by position.
const TAB = { overview: 1, season: 2, history: 3, matches: 4, h2h: 5 };
const tab = n => `.tabs button:nth-child(${n})`;

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleErrors = [];
// The unknown-player step deliberately provokes a 404; ignore errors from it.
let expectingErrors = false;
page.on('console', m => {
  if (m.type() === 'error' && !expectingErrors) consoleErrors.push(m.text());
});
page.on('pageerror', e => {
  if (!expectingErrors) consoleErrors.push(`pageerror: ${e.message}`);
});

// --- Search ---
await step('search', async () => {
  await page.goto(`${BASE}/#/search`);
  await page.fill('.search-box input', 'Oraze Fabian');
  await page.click('.search-box button');
  await page.waitForSelector('.results-table tbody tr', { timeout: 15000 });
  const rows = await page.locator('.results-table tbody tr').count();
  check('search returns results', rows > 0, `${rows} rows`);
  check('search query is in the URL', page.url().includes('q=Oraze'), page.url());
});

// --- Reload keeps the query (iteration 2 fix) ---
await step('reload', async () => {
  await page.reload();
  await page.waitForSelector('.results-table tbody tr', { timeout: 15000 });
  const inputAfterReload = await page.inputValue('.search-box input');
  check('query survives reload', inputAfterReload === 'Oraze Fabian', `got "${inputAfterReload}"`);
});

// --- Navigate to player, then Back ---
await step('back-navigation', async () => {
  await page.click('.results-table tbody tr');
  await page.waitForSelector('.player-header h1', { timeout: 15000 });
  const name = await page.textContent('.player-header h1');
  check('player page loads', /Oraze/.test(name || ''), name || '');

  await page.goBack();
  await page.waitForSelector('.results-table tbody tr', { timeout: 15000 });
  const backRows = await page.locator('.results-table tbody tr').count();
  check('Back restores search results', backRows > 0, `${backRows} rows`);
});

// --- Player tabs ---
await step('player tabs', async () => {
  await page.goto(`${BASE}/#/player/${PLAYER}`);
  await page.waitForSelector('.player-header h1', { timeout: 15000 });

  const rating = await page.textContent('.big-rating');
  check('rating renders with deviation', /\d+±\d+/.test(rating || ''), rating || '');

  // Matches tab: opponent links (iteration 1 fix) and score orientation
  await page.click(tab(TAB.matches));
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  const oppLinks = await page.locator('.opponent-cell a').count();
  check('opponent names are links', oppLinks > 0, `${oppLinks} links`);
  const eventLinks = await page.locator('.date-cell a').count();
  check('match dates link to events', eventLinks > 0, `${eventLinks} links`);

  const lossScores = await page.locator('tr.loss .score-cell').allTextContents();
  const badLoss = lossScores.filter(s => {
    const [a, b] = s.split(/[–-]/).map(Number);
    return !isNaN(a) && !isNaN(b) && a > b;
  });
  check('losses show player-perspective scores', badLoss.length === 0, `${badLoss.length} losses still winner-first: ${badLoss.slice(0,3)}`);

  // Season tab: strength split (iteration 3) and set counts
  await page.click(tab(TAB.season));
  await page.waitForSelector('.record-card', { timeout: 15000 });
  const splitCount = await page.locator('.strength-split .split-item').count();
  check('opponent-strength split renders', splitCount === 2, `${splitCount} items`);
  const setsText = await page.locator('.season-summary .summary-item').first().textContent();
  check('season sets render', /\d+:\d+/.test(setsText || ''), setsText || '');
});

// --- Event page ---
await step('event page', async () => {
  await page.goto(`${BASE}/#/player/${PLAYER}`);
  await page.waitForSelector('.player-header h1', { timeout: 15000 });
  await page.click(tab(TAB.history));
  await page.waitForSelector('.event-link', { timeout: 15000 });
  await page.click('.event-link');
  await page.waitForSelector('.event-player-card', { timeout: 15000 });

  const initial = await page.textContent('.event-player-card .event-stat:nth-child(1) .event-stat-value');
  check('event initial rating is not truncated', /^\d{3,4}±\d+$/.test((initial || '').trim()), initial || '');
  const evtOppLinks = await page.locator('.event-table .player-link').count();
  check('event opponents are links', evtOppLinks > 0, `${evtOppLinks} links`);
});

// --- Unknown player shows a friendly error (iteration 1 fix) ---
expectingErrors = true;
await step('unknown player', async () => {
  await page.goto(`${BASE}/#/player/99999999`);
  await page.waitForSelector('.error, .player-header', { timeout: 15000 });
  const errText = (await page.textContent('.error').catch(() => '')) || '';
  check('unknown player shows a clean error', /not found/i.test(errText) && !errText.includes('http'), errText);
});

expectingErrors = false;

check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' | '));

await browser.close();

console.log(notes.join('\n'));
if (failures.length) {
  console.log('\n' + failures.join('\n'));
  console.log(`\n${failures.length} failing check(s)`);
  process.exit(1);
}
console.log(`\nAll ${notes.length} checks passed`);
