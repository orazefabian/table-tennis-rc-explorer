import express, { Request, Response } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

import {
  fetchPage,
  BASE_URL,
  parsePlayerRows,
  parsePlayerInfo,
  parsePlayerHistory,
  parseMatches,
  parseEventDetail,
  parseEventName,
  isRedisConfigured,
  initRedis,
  UpstreamError
} from './scraper/index.js';

const app = express();

app.use(cors());

/**
 * Translate a thrown scrape error into a response.
 *
 * A 404 from Ratings Central means the requested player or event does not
 * exist, which is a client error here — not a server failure. Upstream URLs
 * are kept out of the response body; they only go to the log.
 */
function sendError(res: Response, err: unknown, context: string, notFoundMessage: string): void {
  console.error(`${context}:`, err);
  if (err instanceof UpstreamError && err.status === 404) {
    res.status(404).json({ error: notFoundMessage });
    return;
  }
  if (err instanceof UpstreamError) {
    res.status(502).json({ error: 'Ratings Central is currently unavailable' });
    return;
  }
  res.status(500).json({ error: 'Something went wrong' });
}

if (isRedisConfigured) {
  initRedis().then(() => {
    console.log('Redis cache initialized');
  });
}

app.get('/api/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = String(req.query.name || '').trim();
    if (!raw) { res.json([]); return; }

    const tokens = raw.split(/[\s,]+/).filter(Boolean);

    if (tokens.length === 1) {
      const url = `${BASE_URL}/PlayerList.php?PlayerName=${encodeURIComponent(tokens[0])}&PlayerSport=Any&SortOrder=Name`;
      const players = parsePlayerRows(await fetchPage(url));
      res.json(players); return;
    }

    const resultSets = await Promise.all(
      tokens.map((t: string) => {
        const url = `${BASE_URL}/PlayerList.php?PlayerName=${encodeURIComponent(t)}&PlayerSport=Any&SortOrder=Name`;
        return fetchPage(url).then(parsePlayerRows);
      })
    );

    const seen = new Set<string>();
    const merged = [];
    for (const set of resultSets) {
      for (const p of set) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
      }
    }

    const lowerTokens = tokens.map((t: string) => t.toLowerCase());
    const players = merged.filter(p => {
      const lowerName = p.name.toLowerCase();
      return lowerTokens.every((t: string) => lowerName.includes(t));
    });

    res.json(players);
  } catch (err) {
    sendError(res, err, 'Search error', 'No players found');
  }
});

app.get('/api/player/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const url = `${BASE_URL}/PlayerInfo.php?PlayerID=${id}`;
    const html = await fetchPage(url);
    const info = parsePlayerInfo(html, id);
    res.json(info);
  } catch (err) {
    sendError(res, err, 'Player info error', 'Player not found');
  }
});

app.get('/api/player/:id/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const url = `${BASE_URL}/PlayerHistory.php?PlayerID=${id}`;
    const html = await fetchPage(url);
    const history = parsePlayerHistory(html);
    res.json(history);
  } catch (err) {
    sendError(res, err, 'History error', 'Player not found');
  }
});

app.get('/api/player/:id/matches', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const url = `${BASE_URL}/MatchList.php?PlayerID=${id}&PlayerSport=Any`;
    const html = await fetchPage(url);
    const data = parseMatches(html);
    res.json(data);
  } catch (err) {
    sendError(res, err, 'Matches error', 'Player not found');
  }
});

app.get('/api/events/names', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventIds = req.query.ids as string;
    if (!eventIds) { res.json({}); return; }

    const ids = eventIds.split(',').filter(Boolean);
    const cache: Record<string, string> = {};

    await Promise.all(
      ids.map(async (eventId) => {
        try {
          const eventUrl = `${BASE_URL}/EventDetail.php?EventID=${eventId}`;
          const eventHtml = await fetchPage(eventUrl);
          cache[eventId] = parseEventName(eventHtml);
        } catch {
          cache[eventId] = `Event ${eventId}`;
        }
      })
    );

    res.json(cache);
  } catch (err) {
    sendError(res, err, 'Event names error', 'Event not found');
  }
});

app.get('/api/event/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const playerId = req.query.playerID as string;
    const url = `${BASE_URL}/EventDetail.php?EventID=${id}`;
    const html = await fetchPage(url);
    const data = parseEventDetail(html, id, playerId || null);

    if ('error' in data) {
      res.status(404).json({ error: data.error }); return;
    }
    res.json(data);
  } catch (err) {
    sendError(res, err, 'Event detail error', 'Event not found');
  }
});

app.get('/api/player/:id/graph', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const url = `${BASE_URL}/GraphImage.php?PlayerID=${id}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RCScraper/1.0)' },
    });
    if (!response.ok) throw new UpstreamError(response.status);
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=300');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    sendError(res, err, 'Graph error', 'Rating graph not found');
  }
});

export default app;
