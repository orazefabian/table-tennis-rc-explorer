<script>
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import Chart from 'chart.js/auto';
  import { t } from '../lib/i18n.js';
  import { parseRating, parseDate } from '../lib/utils.js';

  let { history = [], fullHeight = false, withControls = false } = $props();

  let canvas = $state();
  let range = $state('all');
  let chart;

  const LINE = '#1f4fd1';
  const PEAK = '#b43e0a';

  function parseStdev(s) {
    if (!s) return 0;
    const m = s.match(/±([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  }

  // Oldest first, limited to the chosen range. The range is measured back from
  // the player's latest event rather than today, so an inactive player's
  // "1 year" still shows their last year of play instead of an empty chart.
  let points = $derived.by(() => {
    const sorted = [...history].reverse().map(e => ({ ...e, _date: parseDate(e.date) }));
    if (range === 'all' || sorted.length === 0) return sorted;
    const last = sorted[sorted.length - 1]._date;
    if (!last) return sorted;
    const years = range === '1y' ? 1 : 5;
    const from = new Date(last.getFullYear() - years, last.getMonth(), last.getDate());
    return sorted.filter(e => e._date && e._date >= from);
  });

  let peakIndex = $derived.by(() => {
    let best = -1;
    let bestValue = -Infinity;
    points.forEach((e, i) => {
      const r = parseRating(e.finalRating);
      if (r > bestValue) { bestValue = r; best = i; }
    });
    return best;
  });

  let peakValue = $derived(peakIndex >= 0 ? Math.round(parseRating(points[peakIndex].finalRating)) : null);

  // One label per year, thinned so long careers don't crowd the axis.
  function yearTicks(list) {
    const firstOfYear = [];
    let lastYear = null;
    list.forEach((e, i) => {
      const y = (e.date || '').slice(0, 4);
      if (y && y !== lastYear) { firstOfYear.push(i); lastYear = y; }
    });
    const step = Math.max(1, Math.ceil(firstOfYear.length / 8));
    return new Set(firstOfYear.filter((_, i) => i % step === 0));
  }

  function buildChart() {
    if (chart) chart.destroy();
    chart = null;
    if (!canvas || points.length === 0) return;

    const tr = get(t);
    const list = points;
    const labels = list.map(e => e.date);
    const ratings = list.map(e => parseRating(e.finalRating));
    const stdevs = list.map(e => parseStdev(e.finalRating));
    const upper = ratings.map((r, i) => r + stdevs[i]);
    const lower = ratings.map((r, i) => Math.max(0, r - stdevs[i]));
    const ticks = yearTicks(list);
    const dense = list.length > 40;

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: tr.chartUpperBand,
            data: upper,
            borderWidth: 0,
            backgroundColor: 'rgba(31, 79, 209, 0.12)',
            fill: '+1',
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.25,
          },
          {
            label: tr.chartRating,
            data: ratings,
            borderColor: LINE,
            borderWidth: 2.5,
            fill: false,
            tension: 0.25,
            // Individual events are only marked on short ranges; on a long
            // career they would be hundreds of overlapping dots. The peak is
            // always marked.
            pointRadius: ratings.map((_, i) => (i === peakIndex ? 5 : dense ? 0 : 3)),
            pointBackgroundColor: ratings.map((_, i) => (i === peakIndex ? '#fff' : LINE)),
            pointBorderColor: ratings.map((_, i) => (i === peakIndex ? PEAK : LINE)),
            pointBorderWidth: ratings.map((_, i) => (i === peakIndex ? 2.5 : 0)),
            pointHoverRadius: 5,
            pointHoverBackgroundColor: LINE,
          },
          {
            label: tr.chartLowerBand,
            data: lower,
            borderWidth: 0,
            backgroundColor: 'rgba(31, 79, 209, 0.12)',
            fill: '-1',
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.datasetIndex === 1,
            callbacks: {
              title: (items) => {
                const e = list[items[0].dataIndex];
                return `${e.date} — ${e.eventName}`;
              },
              label: (item) => {
                const e = list[item.dataIndex];
                return tr.chartTooltipRating(e.finalRating, e.change);
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              font: { size: 11 },
              color: '#4a505c',
              callback: (_, i) => (ticks.has(i) ? labels[i].slice(0, 4) : ''),
            },
          },
          y: {
            grid: { color: 'rgba(20, 22, 26, 0.06)' },
            ticks: { font: { size: 11 }, color: '#4a505c', maxTicksLimit: 6 },
          },
        },
      },
    });
  }

  $effect(() => {
    $t;
    points;
    peakIndex;
    buildChart();
  });

  onDestroy(() => {
    if (chart) chart.destroy();
  });

  let ranges = $derived([
    { key: '1y', label: $t.range1y },
    { key: '5y', label: $t.range5y },
    { key: 'all', label: $t.rangeAll },
  ]);
</script>

{#if history.length > 0}
  {#if withControls}
    <div class="chart-head">
      <div class="chart-title">
        <h2>{$t.cardRatingHistory}</h2>
        <span class="chart-legend">
          {$t.chartLegend}{#if peakValue != null} · <span class="chart-peak">{$t.chartPeak(peakValue)}</span>{/if}
        </span>
      </div>
      <div class="segmented" role="group" aria-label={$t.chartRange}>
        {#each ranges as r (r.key)}
          <button type="button" class:active={range === r.key} aria-pressed={range === r.key} onclick={() => (range = r.key)}>{r.label}</button>
        {/each}
      </div>
    </div>
  {/if}
  <div class="chart-container" class:full-height={fullHeight}>
    <canvas bind:this={canvas} role="img" aria-label={peakValue != null ? `${$t.cardRatingHistory}. ${$t.chartPeak(peakValue)}` : $t.cardRatingHistory}></canvas>
  </div>
{:else}
  <div class="empty">{$t.noHistoryData}</div>
{/if}

<style>
  .chart-container {
    position: relative;
    width: 100%;
    height: 280px;
  }
  .chart-container.full-height {
    height: 420px;
  }
  @media (max-width: 640px) {
    .chart-container { height: 220px; }
    .chart-container.full-height { height: 300px; }
  }
</style>
