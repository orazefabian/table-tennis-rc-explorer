<script>
  import { t } from '../lib/i18n.js';
  let { data = [] } = $props();

  let sortBy = $state('matches');
  let sortDir = $state('desc');

  let sorted = $derived.by(() => {
    const entries = data.filter(d => d.name !== 'total');
    return [...entries].sort((a, b) => {
      let va, vb;
      if (sortBy === 'name') { va = a.name; vb = b.name; }
      else if (sortBy === 'wins') { va = a.wins; vb = b.wins; }
      else if (sortBy === 'losses') { va = a.losses; vb = b.losses; }
      else if (sortBy === 'winPct') { va = parseFloat(a.winPct); vb = parseFloat(b.winPct); }
      else { va = a.wins + a.losses; vb = b.wins + b.losses; }

      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  });

  function toggleSort(col) {
    if (sortBy === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortBy = col; sortDir = 'desc'; }
  }

  // Communicates the current sort to assistive technology.
  function ariaSort(col) {
    if (sortBy !== col) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  function getSortIcon(col) {
    if (sortBy !== col) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }
</script>

<div class="h2h-section">
  <h3>{$t.h2hTitle}</h3>

  {#if sorted.length === 0}
    <div class="empty">{$t.noH2HData}</div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th aria-sort={ariaSort('name')}>
              <button type="button" class="sortable" onclick={() => toggleSort('name')}>
                {$t.colOpponent}{getSortIcon('name')}
              </button>
            </th>
            <th aria-sort={ariaSort('matches')}>
              <button type="button" class="sortable" onclick={() => toggleSort('matches')}>
                {$t.colMatches}{getSortIcon('matches')}
              </button>
            </th>
            <th aria-sort={ariaSort('wins')}>
              <button type="button" class="sortable" onclick={() => toggleSort('wins')}>
                {$t.colWins}{getSortIcon('wins')}
              </button>
            </th>
            <th aria-sort={ariaSort('losses')}>
              <button type="button" class="sortable" onclick={() => toggleSort('losses')}>
                {$t.colLosses}{getSortIcon('losses')}
              </button>
            </th>
            <th aria-sort={ariaSort('winPct')}>
              <button type="button" class="sortable" onclick={() => toggleSort('winPct')}>
                {$t.colWinPct}{getSortIcon('winPct')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each sorted as entry (entry.id || entry.name)}
            <tr>
              <td class="opponent-cell">
                {#if entry.id}
                  <a href="#/player/{entry.id}">{entry.name}</a>
                {:else}
                  {entry.name}
                {/if}
              </td>
              <td>{entry.wins + entry.losses}</td>
              <td class="wins-cell">{entry.wins}</td>
              <td class="losses-cell">{entry.losses}</td>
              <td>
                <div class="win-bar-container">
                  <div class="win-bar" style="width: {entry.winPct}%"></div>
                  <span class="win-pct-label">{entry.winPct}%</span>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
