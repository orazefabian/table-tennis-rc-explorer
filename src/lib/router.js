function createRouter() {
  let _hash = window.location.hash || '#/search';
  const listeners = new Set();

  function computeRoute(h) {
    const path = h.replace(/^#/, '') || '/search';
    const playerMatch = path.match(/^\/player\/(\d+)$/);
    if (playerMatch) return { page: 'player', id: playerMatch[1] };
    const eventMatch = path.match(/^\/event\/(\d+)\/(\d+)$/);
    if (eventMatch) return { page: 'event', eventId: eventMatch[1], playerId: eventMatch[2] };
    return { page: 'search' };
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
