<script>
  import { t } from '../lib/i18n.js';
  import { getPlayerInfo, getPlayerHistory, getPlayerMatches } from '../lib/api.js';
  import { parseRating, splitRating } from '../lib/utils.js';
  import { rememberPlayer, lastQuery } from '../lib/recent.js';
  import RatingChart from '../components/RatingChart.svelte';
  import HistoryTable from '../components/HistoryTable.svelte';
  import MatchTable from '../components/MatchTable.svelte';
  import HeadToHead from '../components/HeadToHead.svelte';
  import SeasonStats from '../components/SeasonStats.svelte';

  let { playerId, tab = 'overview' } = $props();

  let player = $state(null);
  let history = $state([]);
  let matches = $state([]);
  let headToHead = $state([]);
  let loading = $state(true);
  let error = $state('');

  const TAB_KEYS = ['overview', 'matches', 'history', 'season', 'h2h'];
  // Unknown tab names in a shared link fall back to the overview.
  let activeTab = $derived(TAB_KEYS.includes(tab) ? tab : 'overview');

  let tabs = $derived([
    { key: 'overview', label: $t.tabOverview },
    { key: 'matches', label: $t.tabMatches, count: matches.length },
    { key: 'history', label: $t.tabHistory, count: history.length },
    { key: 'season', label: $t.tabSeason },
    { key: 'h2h', label: $t.tabH2H },
  ]);

  const tabHref = (key) => (key === 'overview' ? `#/player/${playerId}` : `#/player/${playerId}/${key}`);

  // Tabs get their own URL so a tab can be shared or reloaded, but switching
  // tabs replaces the history entry: Back still leaves the profile in one step
  // instead of walking through every tab that was opened.
  function openTab(e, key) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (key !== activeTab) window.location.replace(tabHref(key));
  }

  let backHref = $derived(lastQuery() ? `#/search?q=${encodeURIComponent(lastQuery())}` : '#/search');

  // Guards against a slower earlier load landing after a newer one and
  // rendering the previous player's data under the current player's name —
  // easy to trigger by clicking through opponent links quickly.
  let loadId = 0;

  async function loadData(id) {
    const thisLoad = ++loadId;
    loading = true;
    error = '';
    try {
      const [info, hist, matchData] = await Promise.all([
        getPlayerInfo(id),
        getPlayerHistory(id),
        getPlayerMatches(id),
      ]);
      if (thisLoad !== loadId) return;
      player = info;
      history = hist;
      matches = matchData.matches;
      headToHead = matchData.headToHead;
      rememberPlayer({ id: info.id, name: info.name, rating: info.rating, country: info.country });
    } catch (e) {
      if (thisLoad !== loadId) return;
      error = e.message;
      player = null;
    }
    loading = false;
  }

  $effect(() => {
    loadData(playerId);
  });

  const toNumber = (s) => {
    const m = String(s || '').replace(/[−–—]/g, '-').match(/[+-]?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
  };

  let rating = $derived(splitRating(player?.rating));

  let initials = $derived.by(() => {
    if (!player?.name) return '';
    const [last = '', first = ''] = player.name.split(',').map(s => s.trim());
    return ((first[0] || '') + (last[0] || '')).toUpperCase();
  });

  let sexLabel = $derived.by(() => {
    const s = (player?.sex || '').toLowerCase();
    if (s.startsWith('m')) return $t.sexMale;
    if (s.startsWith('f') || s.startsWith('w')) return $t.sexFemale;
    return player?.sex || '';
  });

  let kpis = $derived.by(() => {
    const finals = history.map(e => parseRating(e.finalRating)).filter(Boolean);
    const wins = matches.filter(m => m.result === 'W').length;
    const losses = matches.filter(m => m.result === 'L').length;
    const opponents = headToHead.filter(h => h.name !== 'total').length;
    const firstYear = history.length ? (history[history.length - 1].date || '').slice(0, 4) : '';
    const recent = history.slice(0, 5).map(e => toNumber(e.change)).filter(n => n !== null);
    const form = recent.reduce((a, b) => a + b, 0);
    const list = [];
    if (finals.length) {
      list.push({ label: $t.kpiPeak, value: Math.round(Math.max(...finals)), sub: $t.kpiLowest(Math.round(Math.min(...finals))) });
    }
    if (matches.length) {
      list.push({ label: $t.kpiWinRate, value: `${Math.round((wins / matches.length) * 100)} %`, sub: $t.kpiRecord(wins, losses) });
      list.push({ label: $t.kpiMatches, value: matches.length, sub: $t.kpiOpponents(opponents) });
    }
    if (history.length) {
      list.push({ label: $t.kpiEvents, value: history.length, sub: firstYear ? $t.kpiSince(firstYear) : '' });
    }
    if (recent.length) {
      list.push({
        label: $t.kpiForm,
        value: (form > 0 ? '+' : form < 0 ? '−' : '±') + Math.abs(form),
        sub: $t.kpiFormSub(recent.filter(n => n > 0).length, recent.filter(n => n < 0).length),
        tone: form > 0 ? 'positive' : form < 0 ? 'negative' : '',
      });
    }
    return list;
  });
</script>

<div class="player-page">
  <a class="back-btn" href={backHref}>{$t.backToSearch}</a>

  {#if loading}
    <div class="player-skeleton" role="status" aria-busy="true" aria-label={$t.loadingPlayer}>
      <span class="sk sk-title"></span>
      <span class="sk sk-line"></span>
      <div class="sk-kpis">
        {#each Array(4) as _, i (i)}<span class="sk sk-kpi"></span>{/each}
      </div>
      <span class="sk sk-chart"></span>
    </div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if player}
    <header class="player-header">
      <span class="avatar" aria-hidden="true">{initials}</span>
      <div class="player-heading">
        <div class="player-name-rating">
          <h1>{player.name}</h1>
          <span class="big-rating" title={rating.deviation != null ? $t.ratingDeviationHint(rating.deviation) : undefined}
            >{rating.value ?? player.rating}{#if rating.deviation != null}<span class="rating-dev">±{rating.deviation}</span>{/if}</span>
        </div>
        <div class="player-meta">
          {#if player.country}<span class="meta-chip">{player.country}</span>{/if}
          {#if player.city}<span class="meta-chip">{player.city}</span>{/if}
          {#if player.primaryClub}<span class="meta-chip">{player.primaryClub}</span>{/if}
          {#if sexLabel}<span class="meta-chip">{sexLabel}</span>{/if}
          <span class="meta-chip id-chip">ID {player.id}</span>
          {#if history[0]?.date}<span class="meta-chip">{$t.lastActive(history[0].date)}</span>{/if}
        </div>
      </div>
    </header>

    <nav class="tabs" aria-label={player.name}>
      {#each tabs as tb (tb.key)}
        <a
          href={tabHref(tb.key)}
          data-tab={tb.key}
          class:active={activeTab === tb.key}
          aria-current={activeTab === tb.key ? 'page' : undefined}
          onclick={(e) => openTab(e, tb.key)}
        >
          {tb.label}{#if tb.count}<span class="tab-count">{tb.count}</span>{/if}
        </a>
      {/each}
    </nav>

    <div class="tab-content">
      {#if activeTab === 'overview'}
        <section class="kpi-grid" aria-label={$t.cardStats}>
          <div class="kpi kpi-primary">
            <span class="kpi-label">{$t.kpiCurrent}</span>
            <span class="kpi-value">{rating.value ?? '–'}</span>
            {#if rating.deviation != null}<span class="kpi-sub">{$t.uncertainty(rating.deviation)}</span>{/if}
          </div>
          {#each kpis as k (k.label)}
            <div class="kpi">
              <span class="kpi-label">{k.label}</span>
              <span class="kpi-value" class:positive={k.tone === 'positive'} class:negative={k.tone === 'negative'}>{k.value}</span>
              {#if k.sub}<span class="kpi-sub">{k.sub}</span>{/if}
            </div>
          {/each}
        </section>

        <section class="overview-card chart-card">
          <RatingChart {history} withControls />
        </section>

        <div class="overview-columns">
          <section class="overview-card latest-card">
            <div class="card-head">
              <h2>{$t.recentMatches}</h2>
              {#if matches.length}
                <a href={tabHref('matches')} onclick={(e) => openTab(e, 'matches')}>{$t.allMatches(matches.length)}</a>
              {/if}
            </div>
            <MatchTable {matches} {history} playerId={player.id} compact groupLimit={1} />
          </section>
          <section class="overview-card recent-card">
            <div class="card-head">
              <h2>{$t.cardRecentEvents}</h2>
            </div>
            <HistoryTable history={history.slice(0, 5)} compact playerId={player.id} />
          </section>
        </div>
      {:else if activeTab === 'season'}
        <SeasonStats {matches} {history} {playerId} currentRating={player.rating} />
      {:else if activeTab === 'history'}
        <div class="history-tab">
          <div class="overview-card chart-section">
            <RatingChart {history} fullHeight withControls />
          </div>
          <HistoryTable {history} playerId={player.id} />
        </div>
      {:else if activeTab === 'matches'}
        <MatchTable {matches} {history} playerId={player.id} />
      {:else if activeTab === 'h2h'}
        <HeadToHead data={headToHead} playerId={player.id} />
      {/if}
    </div>
  {/if}
</div>
