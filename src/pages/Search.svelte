<script>
  import { searchPlayers } from "../lib/api.js";
  import { t, lang } from "../lib/i18n.js";
  import { splitRating, isExactNameMatch, relativeTimeFrom, parseDate } from "../lib/utils.js";
  import { onDestroy } from "svelte";

  // The query lives in the URL (#/search?q=…) so results survive a reload and
  // come back when returning from a player page via the browser's Back button.
  let { query: urlQuery = "" } = $props();

  let query = $state(urlQuery);
  let results = $state([]);
  let loading = $state(false);
  let error = $state("");
  let searched = $state(false);
  // Query the current results belong to, so grouping doesn't shift while the
  // user keeps typing before the next search fires.
  let resultsQuery = $state("");
  let sortKey = $state("relevance");

  // The top of the rating scale the bar is drawn against; world-class players
  // sit a little above 3000, so anything higher simply fills the bar.
  const BAR_MAX = 3200;

  const enriched = $derived(
    results.map((p, i) => {
      const { value, deviation } = splitRating(p.rating);
      const date = parseDate(p.lastPlayed);
      return {
        ...p,
        order: i,
        value,
        deviation,
        date,
        ago: relativeTimeFrom(date, $lang),
        bar: value == null ? 0 : Math.min(100, Math.round((value / BAR_MAX) * 100)),
        exact: isExactNameMatch(resultsQuery, p.name),
      };
    })
  );

  const sorted = $derived.by(() => {
    const list = [...enriched];
    if (sortKey === "rating") list.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
    else if (sortKey === "recent") list.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
    return list;
  });

  // Grouping only makes sense for relevance order and when it actually splits.
  const groups = $derived.by(() => {
    const exact = sorted.filter(p => p.exact);
    const rest = sorted.filter(p => !p.exact);
    if (sortKey !== "relevance" || exact.length === 0 || rest.length === 0) {
      return [{ label: null, players: sortKey === "relevance" ? [...exact, ...rest] : sorted }];
    }
    return [
      { label: $t.exactMatches, players: exact },
      { label: $t.similarNames, players: rest },
    ];
  });

  const sortOptions = $derived([
    { key: "relevance", label: $t.sortRelevance },
    { key: "rating", label: $t.sortRating },
    { key: "recent", label: $t.sortRecent },
  ]);

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
      resultsQuery = q;
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
      <button onclick={() => doSearch()} disabled={loading || query.trim().length < 2} aria-busy={loading}>
        {$t.search}
      </button>
    </div>
  </div>

  {#if query.length > 0 && query.trim().length < 2}
    <div class="hint">{$t.searchMinChars}</div>
  {/if}

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if loading}
    <div class="results-list" role="status" aria-busy="true" aria-label={$t.searching}>
      {#each Array(5) as _, i (i)}
        <div class="result-row skeleton" aria-hidden="true">
          <span class="sk sk-name"></span>
          <span class="sk sk-rating"></span>
          <span class="sk sk-date"></span>
        </div>
      {/each}
    </div>
  {:else if searched && results.length === 0}
    <div class="empty">{$t.noPlayersFound(query)}</div>
  {:else if results.length > 0}
    <div class="results-toolbar">
      <div class="results-count">{$t.playersFound(results.length)}</div>
      <div class="sort-chips" role="group" aria-label={$t.sortBy}>
        {#each sortOptions as opt (opt.key)}
          <button
            type="button"
            class="chip"
            class:active={sortKey === opt.key}
            aria-pressed={sortKey === opt.key}
            onclick={() => (sortKey = opt.key)}
          >{opt.label}</button>
        {/each}
      </div>
    </div>

    {#each groups as group, gi (gi)}
      {#if group.label}
        <h2 class="results-group-label">{group.label}</h2>
      {/if}
      <ul class="results-list">
        {#each group.players as player (player.id)}
          <li>
            <a class="result-row" class:exact={player.exact && group.label} href="#/player/{player.id}">
              <span class="result-name">
                <span class="name">{player.name}</span>
                <span class="meta">ID {player.id}</span>
              </span>
              <span class="result-rating">
                {#if player.value != null}
                  <span class="rating-value">
                    {player.value}{#if player.deviation != null}<span
                        class="rating-dev"
                        title={$t.ratingDeviationHint(player.deviation)}
                      >±{player.deviation}</span>{/if}
                  </span>
                  <span class="rating-bar" aria-hidden="true"><span style="width: {player.bar}%"></span></span>
                {:else}
                  <span class="rating-value">{player.rating || "–"}</span>
                {/if}
              </span>
              <span class="result-date">
                <span class="sr-only">{$t.lastPlayedLabel}: </span>
                <span class="ago">{player.ago || player.lastPlayed}</span>
                {#if player.ago}<span class="abs">{player.lastPlayed}</span>{/if}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</div>
