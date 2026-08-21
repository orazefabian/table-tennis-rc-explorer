<script>
  import { navigate } from "../lib/router.js";
  import { searchPlayers } from "../lib/api.js";
  import { t } from "../lib/i18n.js";
  import { onDestroy } from "svelte";

  // The query lives in the URL (#/search?q=…) so results survive a reload and
  // come back when returning from a player page via the browser's Back button.
  let { query: urlQuery = "" } = $props();

  let query = $state(urlQuery);
  let results = $state([]);
  let loading = $state(false);
  let error = $state("");
  let searched = $state(false);

  let debounceTimer;
  // Guards against a slower earlier search overwriting a newer one's results.
  let searchId = 0;
  // The query currently reflected in the URL, so we only rewrite it on change.
  let syncedQuery = urlQuery;

  onDestroy(() => clearTimeout(debounceTimer));

  // Re-run whenever the URL query changes (Back/Forward, reload, shared link).
  $effect(() => {
    if (urlQuery === syncedQuery) return;
    syncedQuery = urlQuery;
    query = urlQuery;
    clearTimeout(debounceTimer);
    if (urlQuery.trim().length >= 2) doSearch({ updateUrl: false });
    else { results = []; searched = false; error = ""; }
  });

  function handleInput(e) {
    query = e.target.value;
    clearTimeout(debounceTimer);
    if (query.trim().length >= 2) {
      debounceTimer = setTimeout(doSearch, 400);
    }
  }

  async function doSearch({ updateUrl = true } = {}) {
    const q = query.trim();
    if (q.length < 2) return;

    if (updateUrl && q !== syncedQuery) {
      syncedQuery = q;
      // replaceState keeps typing from stacking one history entry per keystroke.
      window.history.replaceState(null, "", `#/search?q=${encodeURIComponent(q)}`);
    }

    const thisSearch = ++searchId;
    loading = true;
    error = "";
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

  function handleKeydown(e) {
    if (e.key === "Enter") {
      clearTimeout(debounceTimer);
      doSearch();
    }
  }

  if (urlQuery.trim().length >= 2) doSearch({ updateUrl: false });

  function goToPlayer(id) {
    navigate(`/player/${id}`);
  }
</script>

<div class="search-page">
  <div class="search-hero">
    <h1>{$t.findAPlayer}</h1>
    <p>{$t.searchSubtitle}</p>
    <div class="search-box">
      <input
        type="text"
        placeholder={$t.enterPlayerName}
        value={query}
        oninput={handleInput}
        onkeydown={handleKeydown}
        autofocus
      />
      <button onclick={() => doSearch()} disabled={loading || query.trim().length < 2}>
        {loading ? "…" : $t.search}
      </button>
    </div>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if loading}
    <div class="loading">{$t.searching}</div>
  {:else if searched && results.length === 0}
    <div class="empty">{$t.noPlayersFound(query)}</div>
  {:else if results.length > 0}
    <div class="results-count">
      {$t.playersFound(results.length)}
    </div>
    <div class="results-table-wrap">
      <table class="results-table">
        <thead>
          <tr>
            <th>{$t.colRating}</th>
            <th>{$t.colName}</th>
            <th>{$t.colId}</th>
            <th class="hide-mobile">{$t.colLastPlayed}</th>
          </tr>
        </thead>
        <tbody>
          {#each results as player (player.id)}
            <tr class="clickable" onclick={() => goToPlayer(player.id)}>
              <td class="rating-cell">{player.rating}</td>
              <td class="name-cell">
                <a href="#/player/{player.id}" onclick={(e) => e.stopPropagation()}>{player.name}</a>
              </td>
              <td class="id-cell">{player.id}</td>
              <td class="date-cell hide-mobile">{player.lastPlayed}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
