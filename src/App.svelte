<script>
  import { lang, t } from './lib/i18n.js';
  import Search from './pages/Search.svelte';
  import Player from './pages/Player.svelte';
  import Event from './pages/Event.svelte';
  import Compare from './pages/Compare.svelte';

  function parseHash() {
    const hash = window.location.hash;
    const raw = hash.replace(/^#/, '') || '/search';
    const [path, queryString] = raw.split('?');
    const pm = path.match(/^\/player\/(\d+)(?:\/([a-z0-9]+))?$/);
    if (pm) return { page: 'player', id: pm[1], tab: pm[2] || 'overview' };
    const em = path.match(/^\/event\/(\d+)\/(\d+)$/);
    if (em) return { page: 'event', eventId: em[1], playerId: em[2] };
    const cm = path.match(/^\/compare\/(\d+)$/);
    if (cm) {
      const players = new URLSearchParams(queryString || '').get('players') || '';
      return { page: 'compare', opponentId: cm[1], playerIds: players.split(',').filter(Boolean) };
    }
    const query = new URLSearchParams(queryString || '').get('q') || '';
    return { page: 'search', query };
  }

  let current = $state(parseHash());

  $effect(() => {
    function onHashChange() {
      current = parseHash();
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  function toggleLang() {
    lang.update(l => l === 'en' ? 'de' : 'en');
  }
</script>

<div class="app">
  <header class="header">
    <a href="#/search" class="logo">
      <svg class="logo-icon" width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="var(--primary)" />
        <rect x="16" y="16" width="4" height="10" rx="2" transform="rotate(-45 18 21)" fill="var(--text)" />
        <circle cx="23" cy="6" r="3" fill="var(--loss)" />
      </svg>
      <span class="logo-text">{$t.appName}</span>
    </a>
    <span class="tagline">{$t.tagline}</span>
    <div class="lang-spacer"></div>
    <button class="lang-toggle" onclick={toggleLang} aria-label="Switch language">
      {$lang === 'en' ? 'DE' : 'EN'}
    </button>
  </header>

  <main class="main">
    {#if current.page === 'player'}
      <Player playerId={current.id} tab={current.tab} />
    {:else if current.page === 'event'}
      <Event eventId={current.eventId} playerId={current.playerId} />
    {:else if current.page === 'compare'}
      <Compare opponentId={current.opponentId} playerIds={current.playerIds} />
    {:else}
      <Search query={current.query} />
    {/if}
  </main>

  <footer class="footer">
    {$t.dataFrom} <a href="https://www.ratingscentral.com" target="_blank" rel="noopener">{$t.ratingscentral}</a>
  </footer>
</div>
