// Tracks whether the user has navigated within the app since the page loaded.
// window.history.length cannot answer this: it counts the browser's own
// starting entry, so it is already > 1 in a fresh tab opened on a shared link,
// and going "back" from there leaves the app entirely.
let inAppNavigations = 0;

/** True when history.back() is guaranteed to land on another in-app view. */
export function hasInAppHistory() {
  return inAppNavigations > 0;
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => { inAppNavigations++; });
}

function createRouter() {
  let _hash = window.location.hash || '#/search';
  const listeners = new Set();

  function computeRoute(h) {
    const raw = h.replace(/^#/, '') || '/search';
    const [path, queryString] = raw.split('?');
    const playerMatch = path.match(/^\/player\/(\d+)$/);
    if (playerMatch) return { page: 'player', id: playerMatch[1] };
    const eventMatch = path.match(/^\/event\/(\d+)\/(\d+)$/);
    if (eventMatch) return { page: 'event', eventId: eventMatch[1], playerId: eventMatch[2] };
    const compareMatch = path.match(/^\/compare\/(\d+)$/);
    if (compareMatch) {
      const players = new URLSearchParams(queryString || '').get('players') || '';
      return { page: 'compare', opponentId: compareMatch[1], playerIds: players.split(',').filter(Boolean) };
    }
    const query = new URLSearchParams(queryString || '').get('q') || '';
    return { page: 'search', query };
  }

  window.addEventListener('hashchange', () => {
    _hash = window.location.hash;
    listeners.forEach(fn => fn());
  });

  return {
    get value() {
      return computeRoute(_hash);
    },
    subscribe(fn) {
      listeners.add(fn);
      fn();
      return () => listeners.delete(fn);
    }
  };
}

export const route = createRouter();

export function navigate(path) {
  window.location.hash = path;
}
