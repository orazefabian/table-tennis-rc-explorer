<script>
  import { getEventDetails } from '../lib/api.js';
  import { t } from '../lib/i18n.js';

  let { eventId, playerId } = $props();

  let event = $state(null);
  let loading = $state(true);
  let error = $state('');

  $effect(() => {
    eventId; playerId;
    loading = true;
    error = '';
    event = null;
    getEventDetails(eventId, playerId)
      .then(data => { event = data; })
      .catch(e => { error = e.message; })
      .finally(() => { loading = false; });
  });

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '/search';
  }

  function wins() { return event?.matches?.filter(m => m.result === 'W').length ?? 0; }
  function losses() { return event?.matches?.filter(m => m.result === 'L').length ?? 0; }
</script>

<div class="event-page">
  <button class="back-btn" onclick={goBack}>{$t.back}</button>

  {#if loading}
    <div class="loading">{$t.loadingEvent}</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if event}
    <div class="event-header">
      <h1 class="event-title">{event.name}</h1>
      {#if event.date}
        <span class="event-date-badge">{event.date}</span>
      {/if}
    </div>

    <div class="event-player-card">
      <div class="event-player-name">
        <a href="#/player/{event.player.id}" class="player-link">{event.player.name}</a>
      </div>
      <div class="event-player-stats">
        <div class="event-stat">
          <span class="event-stat-label">{$t.statInitial}</span>
          <span class="event-stat-value mono">{event.player.initial}</span>
        </div>
        <div class="event-stat">
          <span class="event-stat-label">{$t.statChange}</span>
          <span class="event-stat-value mono {event.player.change.startsWith('+') ? 'positive' : 'negative'}">{event.player.change}</span>
        </div>
        <div class="event-stat">
          <span class="event-stat-label">{$t.statFinal}</span>
          <span class="event-stat-value mono">{event.player.final}</span>
        </div>
        <div class="event-stat">
          <span class="event-stat-label">{$t.statRecord}</span>
          <span class="event-stat-value">
            <span class="positive">{wins()}W</span>
            &thinsp;/&thinsp;
            <span class="negative">{losses()}L</span>
          </span>
        </div>
      </div>
    </div>

    {#if event.matches.length > 0}
      <div class="event-results-card">
        <div class="event-results-meta">
          <span class="event-results-label">{$t.matches}</span>
          <span class="event-results-count">{$t.matchesPlayed(event.matches.length)}</span>
        </div>
        <div class="event-table-wrap">
          <table class="event-table">
            <thead>
              <tr>
                <th>{$t.colResult}</th>
                <th>{$t.colOpponent}</th>
                <th class="rating-col">{$t.colOppRating}</th>
                <th class="change-col">{$t.colPtChange}</th>
                <th>{$t.colScore}</th>
              </tr>
            </thead>
            <tbody>
              {#each event.matches as match}
                <tr class={match.result === 'W' ? 'row-win' : 'row-loss'}>
                  <td>
                    <span class="result-badge {match.result === 'W' ? 'win' : 'loss'}">{match.result}</span>
                  </td>
                  <td class="player-name-col">
                    {#if match.opponentId}
                      <a href="#/event/{eventId}/{match.opponentId}" class="player-link">{match.opponentName}</a>
                    {:else}
                      {match.opponentName}
                    {/if}
                  </td>
                  <td class="rating-col mono">{match.oppRating}</td>
                  <td class="change-col mono {match.pointChange.startsWith('+') ? 'positive' : match.pointChange.startsWith('−') || match.pointChange.startsWith('-') ? 'negative' : ''}">{match.pointChange}</td>
                  <td class="score-cell">{match.score}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <div class="empty">{$t.noMatchData}</div>
    {/if}
  {/if}
</div>
