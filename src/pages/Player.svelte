<script>
  import { navigate } from '../lib/router.js';
  import { t } from '../lib/i18n.js';
  import { getPlayerInfo, getPlayerHistory, getPlayerMatches } from '../lib/api.js';
  import RatingChart from '../components/RatingChart.svelte';
  import HistoryTable from '../components/HistoryTable.svelte';
  import MatchTable from '../components/MatchTable.svelte';
  import HeadToHead from '../components/HeadToHead.svelte';

  let { playerId } = $props();

  let player = $state(null);
  let history = $state([]);
  let matches = $state([]);
  let headToHead = $state([]);
  let loading = $state(true);
  let error = $state('');
  let activeTab = $state('overview');

  async function loadData() {
    loading = true;
    error = '';
    try {
      const [info, hist, matchData] = await Promise.all([
        getPlayerInfo(playerId),
        getPlayerHistory(playerId),
        getPlayerMatches(playerId),
      ]);
      player = info;
      history = hist;
      matches = matchData.matches;
      headToHead = matchData.headToHead;
    } catch (e) {
      error = e.message;
    }
    loading = false;
  }

  $effect(() => {
    playerId;
    loadData();
  });

  function goBack() {
    navigate('/search');
  }

  function parseRating(r) {
    const m = r.match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  }

  function getMaxRating(h) {
    return Math.max(...h.map(e => parseRating(e.finalRating))).toFixed(0);
  }

  function getMinRating(h) {
    return Math.min(...h.map(e => parseRating(e.finalRating))).toFixed(0);
  }
</script>

<div class="player-page">
  <button class="back-btn" onclick={goBack}>{$t.backToSearch}</button>

  {#if loading}
    <div class="loading">{$t.loadingPlayer}</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if player}
    <div class="player-header">
      <div class="player-name-rating">
        <h1>{player.name}</h1>
        <span class="big-rating">{player.rating}</span>
      </div>
      <div class="player-meta">
        {#if player.country}<span class="meta-chip">{player.country}</span>{/if}
        {#if player.sex}<span class="meta-chip">{player.sex}</span>{/if}
        {#if player.primaryClub}<span class="meta-chip">{player.primaryClub}</span>{/if}
        {#if player.city}<span class="meta-chip">{player.city}</span>{/if}
        <span class="meta-chip id-chip">ID: {player.id}</span>
      </div>
    </div>

    <nav class="tabs">
      <button class:active={activeTab === 'overview'} onclick={() => activeTab = 'overview'}>{$t.tabOverview}</button>
      <button class:active={activeTab === 'history'} onclick={() => activeTab = 'history'}>{$t.tabHistory}</button>
      <button class:active={activeTab === 'matches'} onclick={() => activeTab = 'matches'}>{$t.tabMatches}</button>
      <button class:active={activeTab === 'h2h'} onclick={() => activeTab = 'h2h'}>{$t.tabH2H}</button>
    </nav>

    <div class="tab-content">
      {#if activeTab === 'overview'}
        <div class="overview-grid">
          <div class="overview-card chart-card">
            <h3>{$t.cardRatingHistory}</h3>
            <RatingChart {history} />
          </div>
          <div class="overview-card stats-card">
            <h3>{$t.cardStats}</h3>
            <dl class="stats-list">
              <dt>{$t.statTotalEvents}</dt>
              <dd>{history.length}</dd>
              <dt>{$t.statTotalMatches}</dt>
              <dd>{matches.length}</dd>
              <dt>{$t.statWinRate}</dt>
              <dd>
                {#if matches.length > 0}
                  {Math.round(matches.filter(m => m.result === 'W').length / matches.length * 100)}%
                {:else}
                  -
                {/if}
              </dd>
              <dt>{$t.statOpponentsFaced}</dt>
              <dd>{headToHead.filter(h => h.name !== 'total').length}</dd>
              {#if history.length > 0}
                <dt>{$t.statHighestRating}</dt>
                <dd>{getMaxRating(history)}</dd>
                <dt>{$t.statLowestRating}</dt>
                <dd>{getMinRating(history)}</dd>
              {/if}
            </dl>
          </div>
          <div class="overview-card recent-card">
            <h3>{$t.cardRecentEvents}</h3>
            <HistoryTable history={history.slice(0, 5)} compact playerId={player.id} />
          </div>
        </div>
      {:else if activeTab === 'history'}
        <div class="history-tab">
          <div class="chart-section">
            <RatingChart {history} fullHeight />
          </div>
          <HistoryTable {history} playerId={player.id} />
        </div>
      {:else if activeTab === 'matches'}
        <MatchTable {matches} />
      {:else if activeTab === 'h2h'}
        <HeadToHead data={headToHead} />
      {/if}
    </div>
  {/if}
</div>
