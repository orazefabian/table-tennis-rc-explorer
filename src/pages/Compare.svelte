<script>
  import { untrack } from 'svelte';
  import { navigate, hasInAppHistory } from '../lib/router.js';
  import { t } from '../lib/i18n.js';
  import { getPlayerInfo, getPlayerHistory, getPlayerMatches } from '../lib/api.js';
  import { parseSets, formatScore, classifyChange, parseDate } from '../lib/utils.js';
  import PlayerPicker from '../components/PlayerPicker.svelte';

  // Compares how several players fared against one opponent.
  // URL: #/compare/<opponentId>?players=<baseId>,<id2>,…  — the first player
  // is the one the comparison was opened from and cannot be removed.
  let { opponentId, playerIds = [] } = $props();

  function sanitize(ids, oppId) {
    return ids.filter((id, i) => /^\d+$/.test(id) && id !== oppId && ids.indexOf(id) === i);
  }

  // Adding/removing players rewrites the URL with replaceState, which fires no
  // hashchange, so the list lives here and only resyncs when the route changes
  // (reload, Back/Forward, a shared link).
  let ids = $derived(sanitize(playerIds, opponentId));

  let baseId = $derived(ids[0] || '');

  let opponent = $state(null);
  let opponentError = $state('');

  // id -> { status: 'loading' | 'ok' | 'error', info, matches, eventNames, error }
  let players = $state({});
  // Per-player request tokens: a response is ignored if the player was removed
  // (or re-requested) while it was in flight.
  const tokens = {};

  let opponentLoad = 0;
  $effect(() => {
    const id = opponentId;
    const thisLoad = ++opponentLoad;
    opponent = null;
    opponentError = '';
    getPlayerInfo(id).then(
      info => { if (thisLoad === opponentLoad) opponent = info; },
      e => { if (thisLoad === opponentLoad) opponentError = e.message; },
    );
  });

  $effect(() => {
    const wanted = ids;
    untrack(() => {
      for (const id of wanted) {
        if (!players[id]) loadPlayer(id);
      }
    });
  });

  async function loadPlayer(id) {
    const token = (tokens[id] = (tokens[id] || 0) + 1);
    players[id] = { status: 'loading' };
    const [info, matchData, history] = await Promise.allSettled([
      getPlayerInfo(id),
      getPlayerMatches(id),
      getPlayerHistory(id),
    ]);
    if (tokens[id] !== token || !players[id]) return;

    if (info.status === 'rejected' || matchData.status === 'rejected') {
      const reason = info.status === 'rejected' ? info.reason : matchData.reason;
      players[id] = { status: 'error', error: reason?.message || String(reason) };
      return;
    }

    // The history has the event names, saving one event-page fetch per match.
    const eventNames = {};
    if (history.status === 'fulfilled') {
      for (const h of history.value) if (h.eventId) eventNames[h.eventId] = h.eventName;
    }
    players[id] = {
      status: 'ok',
      info: info.value,
      matches: matchData.value.matches,
      eventNames,
    };
  }

  function dateValue(d) {
    return parseDate(d)?.getTime() ?? 0;
  }

  function summarize(entry) {
    const vs = (entry.matches || [])
      .filter(m => m.opponentId === opponentId)
      .sort((a, b) => dateValue(b.date) - dateValue(a.date));
    let setsWon = 0;
    let setsLost = 0;
    for (const m of vs) {
      const s = parseSets(m.score, m.result);
      if (s) { setsWon += s.setsWon; setsLost += s.setsLost; }
    }
    const wins = vs.filter(m => m.result === 'W').length;
    return {
      matches: vs,
      wins,
      losses: vs.length - wins,
      winPct: vs.length ? Math.round(wins / vs.length * 100) : 0,
      setsWon,
      setsLost,
      lastPlayed: vs[0]?.date || '',
    };
  }

  let rows = $derived(ids.map(id => {
    const entry = players[id] || { status: 'loading' };
    return { id, entry, stats: entry.status === 'ok' ? summarize(entry) : null };
  }));

  function writeUrl(next) {
    const hash = `#/compare/${opponentId}?players=${next.join(',')}`;
    window.history.replaceState(null, '', hash);
  }

  function addPlayer(p) {
    const id = String(p.id);
    if (ids.includes(id) || id === opponentId) return;
    ids = [...ids, id];
    writeUrl(ids);
  }

  function removePlayer(id) {
    if (id === baseId) return;
    ids = ids.filter(x => x !== id);
    delete players[id];
    delete tokens[id];
    writeUrl(ids);
  }

  function goBack() {
    if (hasInAppHistory()) window.history.back();
    else navigate(baseId ? `/player/${baseId}` : '/search');
  }

  function nameOf(row) {
    return row.entry.info?.name || `ID ${row.id}`;
  }

  let opponentName = $derived(opponent?.name || `ID ${opponentId}`);
</script>

<div class="compare-page">
  <button class="back-btn" onclick={goBack}>{$t.back}</button>

  {#if !baseId}
    <div class="error">{$t.compareInvalid}</div>
  {:else if opponentError}
    <div class="error">{opponentError}</div>
  {:else}
    <div class="compare-header">
      <span class="compare-vs">{$t.compareTitle}</span>
      <h1>
        <a href="#/player/{opponentId}">{opponentName}</a>
      </h1>
      {#if opponent?.rating}<span class="big-rating">{opponent.rating}</span>{/if}
    </div>

    <section class="compare-section">
      <div class="table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>{$t.colName}</th>
              <th>{$t.colMatches}</th>
              <th>{$t.colWins}</th>
              <th>{$t.colLosses}</th>
              <th class="hide-mobile">{$t.colWinPct}</th>
              <th>{$t.colSets}</th>
              <th class="hide-mobile">{$t.colLastPlayed}</th>
              <th><span class="visually-hidden">{$t.removePlayer}</span></th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row (row.id)}
              <tr class:base-row={row.id === baseId}>
                <td class="opponent-cell">
                  <a href="#/player/{row.id}">{nameOf(row)}</a>
                  {#if row.id === baseId}<span class="base-tag">{$t.basePlayer}</span>{/if}
                  {#if row.entry.status === 'loading'}
                    <div class="row-note">{$t.loadingPlayer}</div>
                  {:else if row.entry.status === 'error'}
                    <div class="row-note row-error">{row.entry.error}</div>
                  {:else if row.stats.matches.length === 0}
                    <div class="row-note">{$t.noMatchesVsOpponent}</div>
                  {/if}
                </td>
                {#if row.stats && row.stats.matches.length > 0}
                  <td>{row.stats.matches.length}</td>
                  <td class="wins-cell">{row.stats.wins}</td>
                  <td class="losses-cell">{row.stats.losses}</td>
                  <td class="hide-mobile">
                    <div class="win-bar-container">
                      <div class="win-bar" style="width: {row.stats.winPct}%"></div>
                      <span class="win-pct-label">{row.stats.winPct}%</span>
                    </div>
                  </td>
                  <td class="score-cell">{row.stats.setsWon}:{row.stats.setsLost}</td>
                  <td class="date-cell hide-mobile">{row.stats.lastPlayed}</td>
                {:else}
                  <td>–</td><td>–</td><td>–</td><td class="hide-mobile">–</td><td>–</td><td class="hide-mobile">–</td>
                {/if}
                <td class="remove-cell">
                  {#if row.id !== baseId}
                    <button
                      type="button"
                      class="remove-btn"
                      onclick={() => removePlayer(row.id)}
                      aria-label={$t.removePlayerNamed(nameOf(row))}
                      title={$t.removePlayer}
                    >✕</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="compare-add">
        <h3>{$t.addPlayerToCompare}</h3>
        <PlayerPicker
          onpick={addPlayer}
          exclude={[...ids, opponentId]}
          placeholder={$t.enterPlayerName}
        />
      </div>
    </section>

    <section class="compare-section">
      {#each rows as row (row.id)}
        {#if row.stats && row.stats.matches.length > 0}
          <details class="compare-matches" open={row.id === baseId}>
            <summary>
              <strong>{nameOf(row)}</strong>
              <span class="summary-record">
                {$t.matchCount(row.stats.matches.length)} ·
                <span class="wins-cell">{row.stats.wins}</span>–<span class="losses-cell">{row.stats.losses}</span>
              </span>
            </summary>
            <div class="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>{$t.colDate}</th>
                    <th>{$t.colEvent}</th>
                    <th>{$t.colResult}</th>
                    <th>{$t.colScore}</th>
                    <th>{$t.colPtChange}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each row.stats.matches as m, i (i)}
                    <tr class:win={m.result === 'W'} class:loss={m.result === 'L'}>
                      <td class="date-cell">{m.date}</td>
                      <td class="event-cell">
                        {#if m.eventId}
                          <a href="#/event/{m.eventId}/{row.id}" class="event-link">
                            {row.entry.eventNames[m.eventId] || `Event ${m.eventId}`}
                          </a>
                        {:else}
                          –
                        {/if}
                      </td>
                      <td class="result-cell">
                        <span class="result-badge" class:win={m.result === 'W'} class:loss={m.result === 'L'}>{m.result}</span>
                      </td>
                      <td class="score-cell">{formatScore(m.score, m.result)}</td>
                      <td class="change-cell" class:positive={classifyChange(m.pointChange) === 'positive'} class:negative={classifyChange(m.pointChange) === 'negative'}>
                        {m.pointChange}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </details>
        {/if}
      {/each}
    </section>
  {/if}
</div>
