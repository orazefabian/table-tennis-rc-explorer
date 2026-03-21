const BASE = '/api';

export async function searchPlayers(name) {
  const res = await fetch(`${BASE}/search?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function getPlayerInfo(id) {
  const res = await fetch(`${BASE}/player/${id}`);
  if (!res.ok) throw new Error('Failed to load player info');
  return res.json();
}

export async function getPlayerHistory(id) {
  const res = await fetch(`${BASE}/player/${id}/history`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function getPlayerMatches(id) {
  const res = await fetch(`${BASE}/player/${id}/matches`);
  if (!res.ok) throw new Error('Failed to load matches');
  return res.json();
}

export async function getEventDetails(eventId, playerId) {
  const url = playerId ? `${BASE}/event/${eventId}?playerID=${playerId}` : `${BASE}/event/${eventId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load event details');
  return res.json();
}
