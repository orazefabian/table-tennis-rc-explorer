<script>
  import { t } from '../lib/i18n.js';
  let { history = [], compact = false, playerId = '' } = $props();
</script>

{#if history.length === 0}
  <div class="empty">{$t.noRatingHistory}</div>
{:else}
  <div class="table-wrap" class:compact>
    <table>
      <thead>
        <tr>
          <th>{$t.colDate}</th>
          <th>{$t.colEvent}</th>
          <th>{$t.statInitial}</th>
          <th>{$t.statChange}</th>
          <th>{$t.statFinal}</th>
        </tr>
      </thead>
      <tbody>
        {#each history as entry}
          <tr>
            <td class="date-cell">{entry.date}</td>
            <td class="event-cell">
              {#if entry.eventId}
                <a href="#/event/{entry.eventId}/{playerId}" class="event-link">{entry.eventName}</a>
              {:else}
                {entry.eventName}
              {/if}
            </td>
            <td class="rating-cell">{entry.initialRating}</td>
            <td class="change-cell" class:positive={entry.change.startsWith('+')} class:negative={entry.change.startsWith('−') || entry.change.startsWith('-')}>
              {entry.change}
            </td>
            <td class="rating-cell">{entry.finalRating}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
