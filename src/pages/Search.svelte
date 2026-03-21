<script>
  import { navigate } from "../lib/router.js";
  import { searchPlayers } from "../lib/api.js";
  import { t } from "../lib/i18n.js";
  import { onDestroy } from "svelte";

  let query = $state("");
  let results = $state([]);
  let loading = $state(false);
  let error = $state("");
  let searched = $state(false);

  let debounceTimer;
  onDestroy(() => clearTimeout(debounceTimer));

  function handleInput(e) {
    query = e.target.value;
    clearTimeout(debounceTimer);
    if (query.trim().length >= 2) {
      debounceTimer = setTimeout(doSearch, 400);
    }
  }

  async function doSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    loading = true;
    error = "";
    searched = true;
    try {
      results = await searchPlayers(q);
    } catch (e) {
      error = e.message;
      results = [];
    }
    loading = false;
  }

  function handleKeydown(e) {
    if (e.key === "Enter") {
      clearTimeout(debounceTimer);
      doSearch();
    }
  }

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
      <button onclick={doSearch} disabled={loading || query.trim().length < 2}>
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
            <th>{$t.colLastPlayed}</th>
          </tr>
        </thead>
        <tbody>
          {#each results as player}
            <tr class="clickable" onclick={() => goToPlayer(player.id)}>
              <td class="rating-cell">{player.rating}</td>
              <td class="name-cell">{player.name}</td>
              <td class="id-cell">{player.id}</td>
              <td class="date-cell">{player.lastPlayed}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
