import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const app = express();
const BASE = 'https://www.ratingscentral.com';

app.use(cors());

// In-memory cache with 5-minute TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

async function fetchPage(url) {
  const cached = getCached(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  setCache(url, html);
  return html;
}

// ─── Search ───────────────────────────────────────────────────────────
function parsePlayerRows(html) {
  const $ = cheerio.load(html);
  const players = [];
  $('table.Bordered tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 4) {
      const rating = $(cells[0]).text().replace(/\u200B/g, '').trim();
      const nameLink = $(cells[1]).find('a');
      const playerName = nameLink.text().trim();
      const href = nameLink.attr('href') || '';
      const idMatch = href.match(/PlayerID=(\d+)/);
      const id = idMatch ? idMatch[1] : '';
      const lastPlayed = $(cells[3]).text().replace(/\u200B/g, '').trim();
      if (playerName && id) players.push({ id, name: playerName, rating, lastPlayed });
    }
  });
  return players;
}

app.get('/api/search', async (req, res) => {
  try {
    const raw = (req.query.name || '').trim();
    if (!raw) return res.json([]);

    const tokens = raw.split(/[\s,]+/).filter(Boolean);

    if (tokens.length === 1) {
      const url = `${BASE}/PlayerList.php?PlayerName=${encodeURIComponent(tokens[0])}&PlayerSport=Any&SortOrder=Name`;
      const players = parsePlayerRows(await fetchPage(url));
      return res.json(players);
    }

    const resultSets = await Promise.all(
      tokens.map(t => {
        const url = `${BASE}/PlayerList.php?PlayerName=${encodeURIComponent(t)}&PlayerSport=Any&SortOrder=Name`;
        return fetchPage(url).then(parsePlayerRows);
      })
    );

    const seen = new Set();
    const merged = [];
    for (const set of resultSets) {
      for (const p of set) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
      }
    }

    const lowerTokens = tokens.map(t => t.toLowerCase());
    const players = merged.filter(p => {
      const lowerName = p.name.toLowerCase();
      return lowerTokens.every(t => lowerName.includes(t));
    });

    return res.json(players);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Player Info ──────────────────────────────────────────────────────
app.get('/api/player/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${BASE}/PlayerInfo.php?PlayerID=${id}`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const info = { id };

    const h1 = $('h1.CenteredHeading');
    const nameText = h1.clone().children().remove().end().text().trim();
    info.name = nameText;

    const subheader = h1.find('.Subheader').text().replace(/\u200B/g, '').trim();
    info.rating = subheader;

    const rows = $('table.Bordered tbody tr');
    rows.each((_, row) => {
      const label = $(row).find('td').first().text().trim().toLowerCase();
      const value = $(row).find('td').last().text().replace(/\u200B/g, '').trim();
      if (label.includes('country')) info.country = value;
      else if (label.includes('primary club')) info.primaryClub = value;
      else if (label.includes('city')) info.city = value;
      else if (label.includes('province')) info.province = value;
      else if (label.includes('sex')) info.sex = value;
      else if (label.includes('deceased')) info.deceased = value;
    });

    res.json(info);
  } catch (err) {
    console.error('Player info error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Player History ───────────────────────────────────────────────────
app.get('/api/player/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${BASE}/PlayerHistory.php?PlayerID=${id}`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const history = [];
    $('table.Bordered').first().find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 5) {
        const date = $(cells[0]).text().trim();
        const eventLink = $(cells[1]).find('a');
        const eventName = eventLink.text().trim();
        const eventHref = eventLink.attr('href') || '';
        const eventIdMatch = eventHref.match(/EventID=(\d+)/);
        const eventId = eventIdMatch ? eventIdMatch[1] : '';
        const initialRating = $(cells[2]).text().replace(/\u200B/g, '').trim();
        const change = $(cells[3]).text().replace(/\u200B/g, '').trim();
        const finalRating = $(cells[4]).text().replace(/\u200B/g, '').trim();

        history.push({ date, eventName, eventId, initialRating, change, finalRating });
      }
    });

    res.json(history);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Matches ──────────────────────────────────────────────────────────
app.get('/api/player/:id/matches', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${BASE}/MatchList.php?PlayerID=${id}&PlayerSport=Any`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const matches = [];
    const tables = $('table.Bordered');

    tables.eq(0).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 7) {
        const date = $(cells[0]).text().trim();
        const eventHref = $(cells[0]).find('a').attr('href') || '';
        const eventIdMatch = eventHref.match(/EventID=(\d+)/);
        const eventId = eventIdMatch ? eventIdMatch[1] : '';
        const opponentLink = $(cells[1]).find('a');
        const opponent = opponentLink.text().trim();
        const oppHref = opponentLink.attr('href') || '';
        const oppIdMatch = oppHref.match(/PlayerID=(\d+)/);
        const opponentId = oppIdMatch ? oppIdMatch[1] : '';
        const opponentRating = $(cells[2]).text().replace(/\u200B/g, '').trim();
        const result = $(cells[3]).text().trim();
        const rating = $(cells[4]).text().replace(/\u200B/g, '').trim();
        const pointChange = $(cells[5]).text().replace(/\u200B/g, '').trim();
        const score = $(cells[6]).text().trim();

        matches.push({ date, eventId, opponent, opponentId, opponentRating, result, rating, pointChange, score });
      }
    });

    const h2h = [];
    tables.eq(1).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 4) {
        const nameLink = $(cells[0]).find('a');
        const name = nameLink.text().trim() || $(cells[0]).text().trim();
        const href = nameLink.attr('href') || '';
        const idMatch = href.match(/PlayerID=(\d+)/);
        const oppId = idMatch ? idMatch[1] : '';
        const wins = parseInt($(cells[1]).text().trim(), 10) || 0;
        const losses = parseInt($(cells[2]).text().trim(), 10) || 0;
        const winPct = $(cells[3]).text().trim();

        h2h.push({ name, id: oppId, wins, losses, winPct });
      }
    });

    res.json({ matches, headToHead: h2h });
  } catch (err) {
    console.error('Matches error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Event Detail ─────────────────────────────────────────────────────
app.get('/api/event/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const playerId = req.query.playerID || '';
    const url = `${BASE}/EventDetail.php?EventID=${id}`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const name = $('h1.CenteredHeading').clone().find('.Subheader').remove().end().text().trim();
    const subheaderHtml = $('h1.CenteredHeading .Subheader').html() || '';
    const date = subheaderHtml.split(/<br\s*\/?>/i)[0].trim();

    function parseRatingChange(text) {
      const clean = text.replace(/Rating Change/i, '').replace(/\u200B/g, '').replace(/\s+/g, ' ').trim();
      const m = clean.match(/([\d.]+±[\d.]+)\s*([+−\-])\s*([\d.]+)\s*=\s*([\d.]+(?:±[\d.]+)?)/);
      if (m) {
        const sign = m[2] === '+' ? '+' : '−';
        return { initial: m[1], change: sign + m[3], final: m[4] };
      }
      return { initial: '', change: '', final: clean };
    }

    function parseMatches(playerLi) {
      const matches = [];
      let cur = $(playerLi).next('li');
      let group = null;

      while (cur.length && !cur.hasClass('Gap')) {
        const cls = cur.attr('class') || '';
        const isHeader = cls.includes('Header') || cls.includes('Subheader') || cls.includes('NotNeeded');

        if (!isHeader) {
          if (cls.includes('WinPointChangeBorder')) {
            group = { result: 'W', pointChange: cur.text().replace(/\u200B/g, '').trim(), oppRating: '', opponentName: '', opponentId: '', score: '' };
          } else if (cls.includes('LossPointChangeBorder')) {
            group = { result: 'L', pointChange: cur.text().replace(/\u200B/g, '').trim(), oppRating: '', opponentName: '', opponentId: '', score: '' };
          } else if (group && !group.oppRating && !cls.includes('Border') && !cls.includes('Opponent')) {
            group.oppRating = cur.text().replace(/\u200B/g, '').trim();
          } else if (group && cls.includes('Opponent')) {
            const a = cur.find('a');
            group.opponentName = a.text().trim() || cur.text().trim();
            const href = a.attr('href') || '';
            const idM = href.match(/P(\d+)/);
            group.opponentId = idM ? idM[1] : '';
          } else if (group && (cls.includes('WinScoreBorder') || cls.includes('LossScoreBorder'))) {
            group.score = cur.text().replace(/\u200B/g, '').trim();
            matches.push(group);
            group = null;
          }
        }
        cur = cur.next('li');
      }
      return matches;
    }

    if (playerId) {
      const playerLi = $('ul.Detailed li.Header.PlayerBorder').filter((_, el) => {
        const href = $(el).find('a').attr('href') || '';
        return href.includes(`PlayerID=${playerId}`);
      }).first();

      if (!playerLi.length) {
        return res.status(404).json({ error: 'Player not found in this event' });
      }

      const playerName = playerLi.find('a').text().trim();
      const ratingLi = $(playerLi).nextAll('li').filter((_, l) => $(l).hasClass('RatingBorder')).first();
      const rc = parseRatingChange(ratingLi.text());
      const matches = parseMatches(playerLi);

      return res.json({ id, name, date, player: { id: playerId, name: playerName, ...rc }, matches });
    }

    const players = [];
    $('ul.Detailed li.Header.PlayerBorder').each((_, el) => {
      const playerLink = $(el).find('a');
      const playerName = playerLink.text().trim();
      const href = playerLink.attr('href') || '';
      const idMatch = href.match(/PlayerID=(\d+)/);
      const pid = idMatch ? idMatch[1] : '';
      const ratingLi = $(el).nextAll('li').filter((__, l) => $(l).hasClass('RatingBorder')).first();
      const rc = parseRatingChange(ratingLi.text());
      if (playerName) players.push({ name: playerName, id: pid, ...rc });
    });

    res.json({ id, name, date, players });
  } catch (err) {
    console.error('Event detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Rating Graph Image Proxy ─────────────────────────────────────────
app.get('/api/player/:id/graph', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${BASE}/GraphImage.php?PlayerID=${id}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RCScraper/1.0)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=300');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Graph error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
