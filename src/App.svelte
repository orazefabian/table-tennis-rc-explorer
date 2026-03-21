<script>
  import { lang, t } from './lib/i18n.js';
  import Search from './pages/Search.svelte';
  import Player from './pages/Player.svelte';
  import Event from './pages/Event.svelte';

  function parseHash() {
    const hash = window.location.hash;
    const path = hash.replace(/^#/, '') || '/search';
    const pm = path.match(/^\/player\/(\d+)$/);
    if (pm) return { page: 'player', id: pm[1] };
    const em = path.match(/^\/event\/(\d+)\/(\d+)$/);
    if (em) return { page: 'event', eventId: em[1], playerId: em[2] };
    return { page: 'search' };
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
      <span class="logo-icon">🏓</span>
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
      <Player playerId={current.id} />
    {:else if current.page === 'event'}
      <Event eventId={current.eventId} playerId={current.playerId} />
    {:else}
      <Search />
    {/if}
  </main>

  <footer class="footer">
    {$t.dataFrom} <a href="https://www.ratingscentral.com" target="_blank" rel="noopener">{$t.ratingscentral}</a>
  </footer>
</div>
