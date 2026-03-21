<script>
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import Chart from 'chart.js/auto';
  import { t } from '../lib/i18n.js';

  let { history = [], fullHeight = false } = $props();

  let canvas = $state();
  let chart;

  function parseRating(s) {
    const m = s.match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  }

  function parseStdev(s) {
    const m = s.match(/±([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  }

  function buildChart() {
    if (chart) chart.destroy();
    if (!canvas || history.length === 0) return;

    const tr = get(t);
    const sorted = [...history].reverse();
    const labels = sorted.map(e => e.date);
    const ratings = sorted.map(e => parseRating(e.finalRating));
    const stdevs = sorted.map(e => parseStdev(e.finalRating));
    const upper = ratings.map((r, i) => r + stdevs[i]);
    const lower = ratings.map((r, i) => Math.max(0, r - stdevs[i]));

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: tr.chartUpperBand,
            data: upper,
            borderColor: 'rgba(59, 130, 246, 0.2)',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            fill: '+1',
            pointRadius: 0,
            borderWidth: 1,
            borderDash: [4, 4],
            tension: 0.3,
          },
          {
            label: tr.chartRating,
            data: ratings,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false,
            pointRadius: 5,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            borderWidth: 2.5,
            tension: 0.3,
          },
          {
            label: tr.chartLowerBand,
            data: lower,
            borderColor: 'rgba(59, 130, 246, 0.2)',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            fill: '-1',
            pointRadius: 0,
            borderWidth: 1,
            borderDash: [4, 4],
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: !fullHeight,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return `${sorted[idx].date} — ${sorted[idx].eventName}`;
              },
              label: (item) => {
                if (item.datasetIndex === 1) {
                  const idx = item.dataIndex;
                  const r = sorted[idx].finalRating;
                  const c = sorted[idx].change;
                  return tr.chartTooltipRating(r, c);
                }
                return null;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 10,
              font: { size: 11 },
            },
            grid: { display: false },
          },
          y: {
            title: {
              display: true,
              text: tr.chartRating,
              font: { size: 12 },
            },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
        },
      },
    });
  }

  $effect(() => {
    $t;
    history;
    buildChart();
  });

  onDestroy(() => {
    if (chart) chart.destroy();
  });
</script>

{#if history.length > 0}
  <div class="chart-container" class:full-height={fullHeight}>
    <canvas bind:this={canvas}></canvas>
  </div>
{:else}
  <div class="empty">{$t.noHistoryData}</div>
{/if}

<style>
  .chart-container {
    position: relative;
    width: 100%;
    max-height: 350px;
  }
  .chart-container.full-height {
    max-height: 500px;
    min-height: 350px;
  }
</style>
