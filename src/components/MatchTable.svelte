<script>
  import { t } from '../lib/i18n.js';
  let { matches = [] } = $props();

  let filterOpponent = $state('');
  let filterResult = $state('all');

  let filtered = $derived(
    matches.filter(m => {
      if (filterResult === 'wins' && m.result !== 'W') return false;
      if (filterResult === 'losses' && m.result !== 'L') return false;
      if (filterOpponent && !m.opponent.toLowerCase().includes(filterOpponent.toLowerCase())) return false;
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
            <td class="date-cell hide-mobile">{match.date}</td>
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
            <td class="change-cell" class:positive={match.pointChange.startsWith('+')} class:negative={match.pointChange.startsWith('−') || match.pointChange.startsWith('-')}>
              {match.pointChange}
            </td>
            <td class="score-cell">{match.score}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="results-count">{$t.matchCount(filtered.length)}</div>
{/if}
