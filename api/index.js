import express from 'express';
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
  isRedisConfigured,
  initRedis
} from './scraper/index.js';

const app = express();

app.use(cors());

if (isRedisConfigured) {
  initRedis().then(() => {
    console.log('Redis cache initialized');
  });
}

app.get('/api/search', async (req, res) => {
  try {
    const raw = (req.query.name || '').trim();
    if (!raw) return res.json([]);

    const tokens = raw.split(/[\s,]+/).filter(Boolean);

    if (tokens.length === 1) {
      const url = `${BASE_URL}/PlayerList.php?PlayerName=${encodeURIComponent(tokens[0])}&PlayerSport=Any&SortOrder=Name`;
      const players = parsePlayerRows(await fetchPage(url));
      return res.json(players);
    }

    const resultSets = await Promise.all(
      tokens.map(t => {
        const url = `${BASE_URL}/PlayerList.php?PlayerName=${encodeURIComponent(t)}&PlayerSport=Any&SortOrder=Name`;
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

app.get('/api/player/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${BASE_URL}/PlayerInfo.php?PlayerID=${id}`;
    const html = await fetchPage(url);
    const info = parsePlayerInfo(html, id);
    res.json(info);
  } catch (err) {
    console.error('Player info error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/player/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${BASE_URL}/PlayerHistory.php?PlayerID=${id}`;
    const html = await fetchPage(url);
    const history = parsePlayerHistory(html);
    res.json(history);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/player/:id/matches', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${BASE_URL}/MatchList.php?PlayerID=${id}&PlayerSport=Any`;
    const html = await fetchPage(url);
    const data = parseMatches(html);
    res.json(data);
  } catch (err) {
    console.error('Matches error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/event/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const playerId = req.query.playerID || '';
    const url = `${BASE_URL}/EventDetail.php?EventID=${id}`;
    const html = await fetchPage(url);
    const data = parseEventDetail(html, id, playerId || null);

    if (data.error) {
      return res.status(404).json({ error: data.error });
    }
    res.json(data);
  } catch (err) {
    console.error('Event detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/player/:id/graph', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${BASE_URL}/GraphImage.php?PlayerID=${id}`;
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
