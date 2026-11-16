// Recently viewed players, kept per browser so the search page has somewhere
// to start from. Storage can be unavailable (private mode, blocked site data),
// so every access is guarded and the app works without it.
const KEY = 'recentPlayers';
const MAX = 6;

export function getRecentPlayers() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter(p => p && p.id && p.name) : [];
  } catch {
    return [];
  }
}

export function rememberPlayer({ id, name, rating, country }) {
  try {
    const rest = getRecentPlayers().filter(p => p.id !== id);
    localStorage.setItem(KEY, JSON.stringify([{ id, name, rating, country }, ...rest].slice(0, MAX)));
  } catch {
    // Storage unavailable; nothing to remember.
  }
}

export function clearRecentPlayers() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable.
  }
}

// The last search, so "back to search" returns to the same results even when
// the player page was opened directly or the tabs replaced history entries.
const QUERY_KEY = 'lastSearchQuery';

export function rememberQuery(q) {
  try { sessionStorage.setItem(QUERY_KEY, q); } catch { /* unavailable */ }
}

export function lastQuery() {
  try { return sessionStorage.getItem(QUERY_KEY) || ''; } catch { return ''; }
}
