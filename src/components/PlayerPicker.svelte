<script>
  import { onDestroy } from 'svelte';
  import { searchPlayers } from '../lib/api.js';
  import { t } from '../lib/i18n.js';

  // A compact "find any Ratings Central player" box. Picking a result calls
  // `onpick(player)` and clears the box; players whose IDs are in `exclude`
  // are left out of the results.
  let { onpick, exclude = [], placeholder = '' } = $props();

  let query = $state('');
  let results = $state([]);
  let loading = $state(false);
  let error = $state('');
  let searched = $state(false);

  let debounceTimer;
  // Guards against a slower earlier search overwriting a newer one's results.
  let searchId = 0;

  onDestroy(() => clearTimeout(debounceTimer));

  let visible = $derived(results.filter(p => !exclude.includes(String(p.id))));

  function reset() {
    clearTimeout(debounceTimer);
    searchId++;
    query = '';
    results = [];
    searched = false;
    loading = false;
    error = '';
  }

  function handleInput(e) {
    query = e.target.value;
    clearTimeout(debounceTimer);
    if (query.trim().length >= 2) {
      debounceTimer = setTimeout(doSearch, 400);
    } else {
      searchId++;
      results = [];
      searched = false;
      loading = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      doSearch();
    } else if (e.key === 'Escape') {
      reset();
    }
  }

  async function doSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    const thisSearch = ++searchId;
    loading = true;
    error = '';
    searched = true;
    try {
      const found = await searchPlayers(q);
      if (thisSearch !== searchId) return;
      results = found;
    } catch (e) {
      if (thisSearch !== searchId) return;
      error = e.message;
      results = [];
    }
    if (thisSearch === searchId) loading = false;
  }

  function pick(player) {
    reset();
    onpick(player);
  }
</script>

<div class="player-picker">
  <input
    type="search"
    placeholder={placeholder || $t.enterPlayerName}
    aria-label={placeholder || $t.enterPlayerName}
    value={query}
    oninput={handleInput}
    onkeydown={handleKeydown}
  />

  {#if query.trim().length > 0}
    <div class="picker-results">
      {#if query.trim().length < 2}
        <div class="picker-note">{$t.searchMinChars}</div>
      {:else if loading}
        <div class="picker-note">{$t.searching}</div>
      {:else if error}
        <div class="picker-note picker-error">{error}</div>
      {:else if searched && visible.length === 0}
        <div class="picker-note">{$t.noPlayersFound(query.trim())}</div>
      {:else}
        <ul>
          {#each visible as player (player.id)}
            <li>
              <button type="button" onclick={() => pick(player)}>
                <span class="picker-name">{player.name}</span>
                <span class="picker-meta">{player.rating} · ID {player.id}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
