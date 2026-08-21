<script>
  import { t } from '../lib/i18n.js';
  import { classifyChange, formatScore } from '../lib/utils.js';
  let { matches = [], playerId = '' } = $props();

  let filterOpponent = $state('');
  let filterResult = $state('all');

  let filtered = $derived(
    matches.filter(m => {
      if (filterResult === 'wins' && m.result !== 'W') return false;
      if (filterResult === 'losses' && m.result !== 'L') return false;
      if (filterOpponent && !m.opponent?.toLowerCase().includes(filterOpponent.toLowerCase())) return false;
      return true;
    })
  );

  let wins = $derived(matches.filter(m => m.result === 'W').length);
  let losses = $derived(matches.filter(m => m.result === 'L').length);
</script>

<div class="match-controls">
  <div class="record">
    {$t.record} <strong>{wins}W - {losses}L</strong>
    ({matches.length > 0 ? Math.round(wins / matches.length * 100) : 0}%)
  </div>
  <div class="filters">
    <input type="text" placeholder={$t.filterByOpponent} bind:value={filterOpponent} />
    <select bind:value={filterResult}>
      <option value="all">{$t.filterAll}</option>
      <option value="wins">{$t.filterWins}</option>
      <option value="losses">{$t.filterLosses}</option>
    </select>
  </div>
</div>

{#if filtered.length === 0}
  <div class="empty">{$t.noMatchesFound}</div>
{:else}
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="hide-mobile">{$t.colDate}</th>
          <th>{$t.colOpponent}</th>
          <th>{$t.colOppRating}</th>
          <th>{$t.colResult}</th>
          <th>{$t.colRatingHeader}</th>
          <th>{$t.colPtChange}</th>
          <th>{$t.colScore}</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as match, i (i)}
          <tr class:win={match.result === 'W'} class:loss={match.result === 'L'}>
            <td class="date-cell hide-mobile">
              {#if match.eventId && playerId}
                <a href="#/event/{match.eventId}/{playerId}" class="event-link">{match.date}</a>
              {:else}
                {match.date}
              {/if}
            </td>
            <td class="opponent-cell">
              {#if match.opponentId}
                <a href="#/player/{match.opponentId}">{match.opponent}</a>
              {:else}
                {match.opponent}
              {/if}
            </td>
            <td class="rating-cell">{match.opponentRating}</td>
            <td class="result-cell">
              <span class="result-badge" class:win={match.result === 'W'} class:loss={match.result === 'L'}>
                {match.result}
              </span>
            </td>
            <td class="rating-cell">{match.rating}</td>
            <td class="change-cell" class:positive={classifyChange(match.pointChange) === 'positive'} class:negative={classifyChange(match.pointChange) === 'negative'}>
              {match.pointChange}
            </td>
            <td class="score-cell">{formatScore(match.score, match.result)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="results-count">{$t.matchCount(filtered.length)}</div>
{/if}
