<script>
  import { t } from '../lib/i18n.js';
  import { formatScore, parseGames } from '../lib/utils.js';

  // Set score plus per-game chips, both from the viewed player's side.
  let { score = '', result = '' } = $props();

  let sets = $derived(formatScore(score, result));
  let games = $derived(parseGames(score, result));
</script>

<span class="match-score">
  <span class="score-cell">{sets}</span>
  {#if games}
    <span class="game-chips" aria-label={$t.setsLabel}>
      {#each games as g, i (i)}
        <span class="game-chip" class:won={g.own > g.opp}>{g.own}:{g.opp}</span>
      {/each}
    </span>
  {/if}
</span>
