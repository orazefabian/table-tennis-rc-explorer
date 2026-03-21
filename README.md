# RC Explorer

A fast, clean player lookup tool for [Ratings Central](https://www.ratingscentral.com) — the international table tennis rating system.

Search any of the 128,000+ rated players, explore their full rating history, match results, head-to-head records, and event breakdowns. Available in English and German.

## Features

- **Player search** — find players by name with multi-token support (e.g. "Fabian Oraze" or "Oraze, Fabian")
- **Player profile** — current rating, country, club, and stats overview
- **Rating history** — full event-by-event rating progression with an interactive chart
- **Match results** — filterable match list with win/loss highlighting and opponent links
- **Head-to-head records** — sortable table of all opponents faced
- **Event detail** — drill into any event to see the player's result card and all individual matches
- **EN / DE language toggle** — persists across sessions via localStorage

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Svelte 5 (runes), Vite |
| Charts | Chart.js |
| Backend | Express, Cheerio, node-fetch |
| Deployment | Vercel (static frontend + serverless API) |
| CI/CD | GitHub Actions |

## Project Structure

```
rc-scraper-site/
├── api/
│   └── index.js          # Express app exported for Vercel serverless
├── src/
│   ├── App.svelte         # Root layout, routing, language toggle
│   ├── app.css            # Global styles
│   ├── lib/
│   │   ├── api.js         # Fetch wrappers for all API endpoints
│   │   ├── i18n.js        # EN/DE translations + lang store
│   │   └── router.js      # Hash-based client-side router
│   ├── pages/
│   │   ├── Search.svelte  # Player search page
│   │   ├── Player.svelte  # Player profile page
│   │   └── Event.svelte   # Event detail page
│   └── components/
│       ├── RatingChart.svelte  # Chart.js rating history chart
│       ├── HistoryTable.svelte # Rating history table
│       ├── MatchTable.svelte   # Match results table with filters
│       └── HeadToHead.svelte   # Head-to-head records table
├── server.js              # Express server for local development
├── vercel.json            # Vercel routing + GitHub auto-deploy disabled
└── eslint.config.js       # ESLint (flat config, JS + Svelte)
```

## Local Development

```bash
# Install dependencies
npm install

# Start the Vite dev server (frontend)
npm run dev

# In a separate terminal, start the API server
npm run server
```

The frontend runs on `http://localhost:5173` and proxies `/api/*` requests to the Express server on port `3001` via the Vite dev proxy.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build frontend to `dist/` |
| `npm run server` | Start Express API server |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

## CI / CD

Two GitHub Actions workflows handle quality checks and deployment:

**`ci.yml`** — runs on every push and pull request to `main`:
1. Install dependencies
2. Lint (`eslint`)
3. Build (`vite build`)

**`deploy.yml`** — runs only when a `v*` tag is pushed (e.g. `v1.2.0`):
1. Install, lint, and build (same checks as CI)
2. Deploy to Vercel production via the Vercel CLI

Vercel's built-in GitHub integration is disabled (`vercel.json`) so all deploys go through the tagged workflow exclusively.

### Releasing

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Required GitHub Secrets

| Secret | Where to find it |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link` |

## Deployment

The app is deployed on Vercel:

- The Vite build output (`dist/`) is served as static files
- All `/api/*` routes are handled by `api/index.js` as a serverless function
- All other routes fall through to `index.html` for client-side routing
