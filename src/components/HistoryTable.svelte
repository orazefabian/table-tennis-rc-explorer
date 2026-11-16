<script>
  import { t } from '../lib/i18n.js';
  import { classifyChange } from '../lib/utils.js';
  let { history = [], compact = false, playerId = '' } = $props();
</script>

{#if history.length === 0}
  <div class="empty">{$t.noRatingHistory}</div>
{:else if compact}
  <ul class="event-list">
    {#each history as entry, i (i)}
      <li>
        <svelte:element
          this={entry.eventId ? 'a' : 'div'}
          class="event-list-row"
          href={entry.eventId ? `#/event/${entry.eventId}/${playerId}` : undefined}
        >
          <span class="event-list-main">
            <span class="event-list-name">{entry.eventName}</span>
            <span class="event-list-meta">{entry.date} · {entry.initialRating} → {entry.finalRating}</span>
          </span>
          <span class="event-list-change change-cell" class:positive={classifyChange(entry.change) === 'positive'} class:negative={classifyChange(entry.change) === 'negative'}>{entry.change}</span>
        </svelte:element>
      </li>
    {/each}
  </ul>
{:else}
  <div class="table-wrap">
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
          {#each history as entry, i (i)}
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
            <td class="change-cell" class:positive={classifyChange(entry.change) === 'positive'} class:negative={classifyChange(entry.change) === 'negative'}>
              {entry.change}
            </td>
            <td class="rating-cell">{entry.finalRating}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
