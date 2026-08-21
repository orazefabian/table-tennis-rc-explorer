const BASE = '/api';

/**
 * Fetch JSON from the API, preferring the server's own error message.
 *
 * The API reports why a request failed (e.g. "Player not found"); showing that
 * is more useful than a generic per-endpoint fallback.
 */
async function getJson(url, fallbackMessage) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Network error — check your connection');
  }
  if (!res.ok) {
    let message = fallbackMessage;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body; keep the fallback.
    }
    throw new Error(message);
  }
  return res.json();
}

export async function searchPlayers(name) {
  return getJson(`${BASE}/search?name=${encodeURIComponent(name)}`, 'Search failed');
}

export async function getPlayerInfo(id) {
  return getJson(`${BASE}/player/${id}`, 'Failed to load player info');
}

export async function getPlayerHistory(id) {
  return getJson(`${BASE}/player/${id}/history`, 'Failed to load history');
}

export async function getPlayerMatches(id) {
  return getJson(`${BASE}/player/${id}/matches`, 'Failed to load matches');
}

export async function getEventDetails(eventId, playerId) {
  const url = playerId ? `${BASE}/event/${eventId}?playerID=${playerId}` : `${BASE}/event/${eventId}`;
  return getJson(url, 'Failed to load event details');
}

export async function getEventNames(eventIds) {
  return getJson(`${BASE}/events/names?ids=${eventIds.join(',')}`, 'Failed to load event names');
}
