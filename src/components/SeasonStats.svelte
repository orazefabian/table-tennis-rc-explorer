<script>
  import { t } from '../lib/i18n.js';
  import { getEventNames } from '../lib/api.js';
  import { SvelteSet } from 'svelte/reactivity';
  import { SvelteMap } from 'svelte/reactivity';

  let { matches = [], playerId, currentRating: playerCurrentRating } = $props();

  let eventNames = $state({});
  let loadingNames = $state(false);

  async function loadEventNames() {
    const uniqueIds = [...new Set(matches.map(m => m.eventId).filter(Boolean))];
    if (uniqueIds.length === 0) return;
    
    loadingNames = true;
    try {
      const names = await getEventNames(uniqueIds);
      eventNames = names;
    } catch (e) {
      console.error('Failed to load event names:', e);
    }
    loadingNames = false;
  }

  $effect(() => {
    matches;
    loadEventNames();
  });

  function getEventName(eventId) {
    if (!eventId) return 'Unknown Event';
    return eventNames[eventId] || `Event ${eventId}`;
  }

  function getEventPrefix(eventName) {
    if (!eventName || typeof eventName !== 'string') return 'Unknown';
    const dateMatch = eventName.match(/^([^(]+\d{4})/);
    if (dateMatch) return dateMatch[1].trim();
    const parenMatch = eventName.match(/^([^()]+)/);
    return parenMatch ? parenMatch[1].trim() : eventName;
  }

  function parseDate(dateStr) {
    const parts = dateStr.trim().split(/\s*\/\s*/);
    if (parts.length === 3) {
      const [m, d, y] = parts.map(Number);
      return new Date(y + (y < 100 ? 2000 : 0), m - 1, d);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function getSeasonLabel(startYear) {
    return `${startYear}/${startYear + 1}`;
  }

  function getSeasonRange(seasonLabel) {
    const [startYear] = seasonLabel.split('/').map(Number);
    const start = new Date(startYear, 8, 1);
    const end = new Date(startYear + 1, 7, 31);
    return { start, end };
  }

  let parsedMatches = $derived.by(() => {
    eventNames;
    return matches.map(m => ({ ...m, _date: parseDate(m.date), _eventName: getEventName(m.eventId) })).filter(m => m._date);
  });

  let availableSeasons = $derived.by(() => {
    const seasons = new SvelteSet();
    for (const m of parsedMatches) {
      const y = m._date.getFullYear();
      const month = m._date.getMonth();
      const startYear = month >= 8 ? y : y - 1;
      seasons.add(getSeasonLabel(startYear));
    }
    return [...seasons].sort((a, b) => b.localeCompare(a));
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentSeasonStart = currentMonth >= 8 ? currentYear : currentYear - 1;
  let selectedSeason = $state(getSeasonLabel(currentSeasonStart));

  $effect(() => {
    if (availableSeasons.length > 0 && !availableSeasons.includes(selectedSeason)) {
      selectedSeason = availableSeasons[0];
    }
  });

  let seasonMatches = $derived.by(() => {
    const { start, end } = getSeasonRange(selectedSeason);
    return parsedMatches.filter(m => m._date >= start && m._date <= end);
  });

  let seasonDateRange = $derived.by(() => {
    const { start, end } = getSeasonRange(selectedSeason);
    const formatDate = (d) => {
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    return `${formatDate(start)} - ${formatDate(end)}`;
  });

  let tournamentGroups = $derived.by(() => {
    const groups = new SvelteMap();
    for (const m of seasonMatches) {
      const key = m.eventId || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, {
          eventId: key,
          eventName: m._eventName || `Event ${key}`,
          matches: [],
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          totalPointChange: 0,
        });
      }
      const g = groups.get(key);
      g.matches.push(m);
      if (m.result === 'W') g.wins++;
      else g.losses++;

      const score = m.score || '';
      const normalized = score.replace(/[–—]/g, '-').replace(/\s/g, '');
      const parts = normalized.split('-');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        if (!isNaN(first) && !isNaN(second)) {
          if (m.result === 'W') {
            g.setsWon += first;
            g.setsLost += second;
          } else {
            g.setsWon += second;
            g.setsLost += first;
          }
        }
      }
    }
    return [...groups.values()].sort((a, b) => {
      const aDate = a.matches[0]?._date?.getTime() || 0;
      const bDate = b.matches[0]?._date?.getTime() || 0;
      return bDate - aDate;
    });
  });

  let prefixGroups = $derived.by(() => {
    const groups = new SvelteMap();
    for (const m of seasonMatches) {
      const prefix = getEventPrefix(m._eventName);
      if (!groups.has(prefix)) {
        groups.set(prefix, {
          name: prefix,
          matches: [],
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          totalPointChange: 0,
        });
      }
      const g = groups.get(prefix);
      g.matches.push(m);
      if (m.result === 'W') g.wins++;
      else g.losses++;

      const score = m.score || '';
      const normalized = score.replace(/[–—]/g, '-').replace(/\s/g, '');
      const parts = normalized.split('-');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        if (!isNaN(first) && !isNaN(second)) {
          if (m.result === 'W') {
            g.setsWon += first;
            g.setsLost += second;
          } else {
            g.setsWon += second;
            g.setsLost += first;
          }
        }
      }

      const pc = m.pointChange || '';
      const pcNormalized = pc.replace('−', '-').replace('–', '-').replace('—', '-');
      const pcMatch = pcNormalized.match(/([+-]?\d+)/);
      if (pcMatch) {
        g.totalPointChange += parseInt(pcMatch[1], 10);
      }
    }
    return [...groups.values()].sort((a, b) => {
      const aDate = a.matches[0]?._date?.getTime() || 0;
      const bDate = b.matches[0]?._date?.getTime() || 0;
      return bDate - aDate;
    });
  });

  let totalWins = $derived(seasonMatches.filter(m => m.result === 'W').length);
  let totalLosses = $derived(seasonMatches.filter(m => m.result === 'L').length);
  let totalSetsWon = $derived.by(() => {
    let sum = 0;
    for (const m of seasonMatches) {
      const normalized = (m.score || '').replace(/[–—]/g, '-').replace(/\s/g, '');
      const parts = normalized.split('-');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        if (!isNaN(first) && !isNaN(second)) {
          if (m.result === 'W') sum += first;
          else sum += second;
        }
      }
    }
    return sum;
  });
  let totalSetsLost = $derived.by(() => {
    let sum = 0;
    for (const m of seasonMatches) {
      const normalized = (m.score || '').replace(/[–—]/g, '-').replace(/\s/g, '');
      const parts = normalized.split('-');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        if (!isNaN(first) && !isNaN(second)) {
          if (m.result === 'W') sum += second;
          else sum += first;
        }
      }
    }
    return sum;
  });
  let totalPointChange = $derived.by(() => {
    let total = 0;
    let hasChanges = false;
    for (const m of seasonMatches) {
      const pc = m.pointChange || '';
      if (!pc) continue;
      hasChanges = true;
      const normalized = pc.replace('−', '-').replace('–', '-').replace('—', '-');
      const match = normalized.match(/([+-]?\d+)/);
      if (match) {
        total += parseInt(match[1], 10);
      }
    }
    if (!hasChanges) return null;
    return total >= 0 ? `+${total}` : `${total}`;
  });

  let currentRating = $derived.by(() => {
    if (playerCurrentRating) {
      const match = playerCurrentRating.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    if (seasonMatches.length === 0) return null;
    const last = seasonMatches.reduce((a, b) => a._date > b._date ? a : b);
    const ratingStr = last.rating || '';
    if (!ratingStr) return null;
    const match = ratingStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  });

  let startRating = $derived.by(() => {
    if (seasonMatches.length === 0) return null;
    if (currentRating === null) return null;
    if (totalPointChange === null) return null;
    const pcMatch = totalPointChange.match(/([+-]?\d+)/);
    if (!pcMatch) return null;
    const change = parseInt(pcMatch[1], 10);
    return Math.round(currentRating - change);
  });
</script>

<div class="season-stats">
  {#if availableSeasons.length > 0}
    <div class="season-header">
      <h3>{$t.seasonTitle}</h3>
      <select bind:value={selectedSeason}>
        {#each availableSeasons as season (season)}
          <option value={season}>{season}</option>
        {/each}
      </select>
    </div>

    {#if seasonMatches.length > 0}
      <div class="record-card">
        <div class="record-wins">{totalWins}</div>
        <div class="record-divider">:</div>
        <div class="record-losses">{totalLosses}</div>
      </div>

      <div class="season-summary">
        <div class="summary-item">
          <span class="label">{$t.seasonSets}</span>
          <span class="value">{totalSetsWon}:{totalSetsLost}</span>
        </div>
        {#if totalPointChange !== null}
          <div class="summary-item">
            <span class="label">{$t.seasonPoints}</span>
            <span class="value" class:positive={totalPointChange.startsWith('+')} class:negative={totalPointChange.startsWith('-')}>{totalPointChange}</span>
            {#if startRating !== null && currentRating !== null}
              <span class="rating-range">({Math.round(startRating)} → {Math.round(currentRating)})</span>
            {/if}
          </div>
        {/if}
        {#if seasonDateRange}
          <div class="summary-item date-range">
            <span class="label">{$t.seasonFrom} / {$t.seasonTo}</span>
            <span class="value">{seasonDateRange}</span>
          </div>
        {/if}
      </div>

      {#if loadingNames}
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      {:else}
        <div class="tournament-cards">
          {#each prefixGroups as group (group.name)}
            <div class="tournament-card">
              <div class="card-header">
                <h4 class="event-name">{group.name}</h4>
              </div>
              <div class="card-stats">
                <div class="stat">
                  <span class="stat-label">{$t.seasonRecord}</span>
                  <span class="stat-value">{group.wins}W - {group.losses}L</span>
                </div>
                <div class="stat">
                  <span class="stat-label">{$t.seasonSets}</span>
                  <span class="stat-value">{group.setsWon}:{group.setsLost}</span>
                </div>
                {#if group.totalPointChange !== 0}
                  <div class="stat">
                    <span class="stat-label">{$t.seasonPoints}</span>
                    <span class="stat-value" class:positive={group.totalPointChange > 0} class:negative={group.totalPointChange < 0}>{group.totalPointChange > 0 ? '+' : ''}{group.totalPointChange}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <div class="empty">{$t.seasonNoMatches}</div>
    {/if}
  {:else}
    <div class="empty">{$t.seasonNoMatches}</div>
  {/if}
</div>

<style>
  .season-stats {
    padding: 1rem 0;
  }

  .season-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .season-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary, #333);
  }

  .season-header select {
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    background: var(--bg-primary, #fff);
    font-size: 0.95rem;
    cursor: pointer;
  }

  .record-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 12px;
    margin-bottom: 1rem;
  }

  .record-wins {
    font-size: 3rem;
    font-weight: 700;
    color: #22c55e;
    line-height: 1;
  }

  .record-divider {
    font-size: 2rem;
    font-weight: 600;
    color: var(--text-secondary, #666);
  }

  .record-losses {
    font-size: 3rem;
    font-weight: 700;
    color: #ef4444;
    line-height: 1;
  }

  .season-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .summary-item .label {
    font-size: 0.75rem;
    color: var(--text-secondary, #666);
    text-transform: uppercase;
  }

  .summary-item .value {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .summary-item .value.positive {
    color: #22c55e;
  }

  .summary-item .value.negative {
    color: #ef4444;
  }

  .summary-item .rating-range {
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
    margin-left: 0.25rem;
  }

  .date-range {
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
  }

  .tournament-cards {
    display: grid;
    gap: 1rem;
  }

  .tournament-card {
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 8px;
    padding: 1rem;
    background: var(--bg-primary, #fff);
    transition: box-shadow 0.2s ease;
  }

  .tournament-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .event-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .card-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary, #888);
    text-transform: uppercase;
  }

  .stat-value {
    font-weight: 500;
    color: var(--text-primary, #333);
  }

  .stat-value.positive {
    color: #22c55e;
  }

  .stat-value.negative {
    color: #ef4444;
  }

  .empty {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary, #888);
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    padding: 3rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color, #e5e5e5);
    border-top-color: var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
