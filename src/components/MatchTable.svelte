<script>
  import { t } from '../lib/i18n.js';
  import { classifyChange } from '../lib/utils.js';
  import Score from './Score.svelte';

  // `history` supplies event names and per-event rating changes for the group
  // headers. `compact` hides the filters (overview card); `groupLimit` caps
  // how many tournaments are shown.
  let { matches = [], history = [], playerId = '', compact = false, groupLimit = 0 } = $props();

  let filterOpponent = $state('');
  let filterResult = $state('all');
  const PAGE = 15;
  let shownGroups = $state(PAGE);

  let filtered = $derived(
    matches.filter(m => {
      if (filterResult === 'wins' && m.result !== 'W') return false;
      if (filterResult === 'losses' && m.result !== 'L') return false;
      if (filterOpponent && !m.opponent?.toLowerCase().includes(filterOpponent.toLowerCase())) return false;
      return true;
    })
  );

  let eventsById = $derived(new Map(history.filter(e => e.eventId).map(e => [e.eventId, e])));

  // Matches arrive newest first; consecutive matches of one event form a group.
  let groups = $derived.by(() => {
    const out = [];
    for (const m of filtered) {
      const key = `${m.eventId || ''}|${m.date}`;
      let g = out[out.length - 1];
      if (!g || g.key !== key) {
        const ev = m.eventId ? eventsById.get(m.eventId) : null;
        g = { key, eventId: m.eventId, date: m.date, name: ev?.eventName || '', event: ev, matches: [] };
        out.push(g);
      }
      g.matches.push({
        ...m,
        changeClass: classifyChange(m.pointChange),
      });
    }
    return out;
  });

  let limit = $derived(groupLimit || shownGroups);
  let visible = $derived(groups.slice(0, limit));

  let wins = $derived(matches.filter(m => m.result === 'W').length);
  let losses = $derived(matches.filter(m => m.result === 'L').length);

  $effect(() => {
    filterOpponent;
    filterResult;
    shownGroups = PAGE;
  });
</script>

{#if !compact}
  <div class="match-controls">
    <div class="record">
      {$t.record}
      <strong><span class="positive">{wins} {$t.wonShort}</span> · <span class="negative">{losses} {$t.lostShort}</span></strong>
      ({matches.length > 0 ? Math.round(wins / matches.length * 100) : 0} %)
    </div>
    <div class="filters">
      <input type="text" placeholder={$t.filterByOpponent} aria-label={$t.filterByOpponent} bind:value={filterOpponent} />
      <select bind:value={filterResult} aria-label={$t.colResult}>
        <option value="all">{$t.filterAll}</option>
        <option value="wins">{$t.filterWins}</option>
        <option value="losses">{$t.filterLosses}</option>
      </select>
    </div>
  </div>
{/if}

{#if filtered.length === 0}
  <div class="empty">{$t.noMatchesFound}</div>
{:else}
  <div class="match-groups" class:compact>
    {#each visible as group (group.key)}
      <section class="match-group">
        <header class="match-group-head">
          <div class="match-group-title">
            <span class="match-group-name">
              {#if group.eventId && playerId}
                <a href="#/event/{group.eventId}/{playerId}" class="event-link">{group.name || group.date}</a>
              {:else}
                {group.name || group.date}
              {/if}
            </span>
            <span class="match-group-date date-cell">
              {#if group.eventId && playerId}
                <a href="#/event/{group.eventId}/{playerId}">{group.date}</a>
              {:else}
                {group.date}
              {/if}
              {#if group.event}· {group.event.initialRating} → {group.event.finalRating}{/if}
            </span>
          </div>
          {#if group.event?.change}
            <span class="match-group-delta change-cell" class:positive={classifyChange(group.event.change) === 'positive'} class:negative={classifyChange(group.event.change) === 'negative'}>{group.event.change}</span>
          {/if}
        </header>
        <ul class="match-rows">
          {#each group.matches as match, i (i)}
            <li class="match-row" class:win={match.result === 'W'} class:loss={match.result === 'L'}>
              <span class="result-badge" class:win={match.result === 'W'} class:loss={match.result === 'L'}>
                {match.result === 'W' ? $t.wonShort : match.result === 'L' ? $t.lostShort : match.result}
              </span>
              <span class="match-opponent">
                <span class="opponent-cell">
                  {#if match.opponentId}
                    <a href="#/player/{match.opponentId}">{match.opponent}</a>
                  {:else}
                    {match.opponent}
                  {/if}
                </span>
                <span class="match-sub">{match.opponentRating}</span>
              </span>
              <Score score={match.score} result={match.result} />
              <span class="match-change change-cell" class:positive={match.changeClass === 'positive'} class:negative={match.changeClass === 'negative'}>{match.pointChange}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
  {#if !groupLimit && groups.length > visible.length}
    <button type="button" class="show-more" onclick={() => (shownGroups += PAGE)}>{$t.showMore}</button>
  {/if}
  {#if !compact}
    <div class="results-count">{$t.matchCount(filtered.length)}</div>
  {/if}
{/if}
