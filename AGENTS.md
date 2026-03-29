# RC Explorer - Project Context

## Overview
RC Explorer is a fast, clean player lookup tool for [Ratings Central](https://www.ratingscentral.com) — the international table tennis rating system. It allows searching 128,000+ rated players, exploring their rating history, match results, head-to-head records, and event breakdowns. Available in English and German.

## Data Source
All data is scraped from [Ratings Central](https://www.ratingscentral.com) using Cheerio for HTML parsing. The base URL is `https://www.ratingscentral.com`. Key endpoints used:
- `PlayerList.php` - Player search
- `PlayerInfo.php` - Player details
- `PlayerHistory.php` - Rating history
- `MatchList.php` - Match results and head-to-head
- `EventDetail.php` - Event details
- `GraphImage.php` - Rating graph images

An in-memory cache with 5-minute TTL reduces redundant scraping.

## Architecture

### Backend (Express + Cheerio)
- **`server.js`** - Local development server (port 3001)
- **`api/index.js`** - Same Express app exported for Vercel serverless

API Endpoints:
| Endpoint | Description |
|---|---|
| `GET /api/search?name=` | Search players (supports multi-token) |
| `GET /api/player/:id` | Player profile (name, rating, country, club) |
| `GET /api/player/:id/history` | Rating history with event progression |
| `GET /api/player/:id/matches` | Match results + head-to-head summary |
| `GET /api/event/:id?playerID=` | Event details (optional player filter) |
| `GET /api/player/:id/graph` | Rating graph image proxy |

### Frontend (Svelte 5 + Vite)
- **`src/App.svelte`** - Root layout, hash-based routing, language toggle
- **`src/pages/Search.svelte`** - Player search page
- **`src/pages/Player.svelte`** - Player profile with tabs (Overview, History, Matches, H2H)
- **`src/pages/Event.svelte`** - Event detail page
- **`src/components/`** - Reusable UI (RatingChart, HistoryTable, MatchTable, HeadToHead)
- **`src/lib/api.js`** - Fetch wrappers for all endpoints
- **`src/lib/i18n.js`** - EN/DE translations with localStorage persistence
- **`src/lib/router.js`** - Hash-based client-side router

### Routing
- `#/search` - Search page (default)
- `#/player/:id` - Player profile
- `#/event/:eventId/:playerId` - Event detail with player context

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Svelte 5 (runes mode), Vite 6 |
| Charts | Chart.js + svelte-chartjs |
| Backend | Express 4, Cheerio, node-fetch |
| Linting | ESLint (flat config) + eslint-plugin-svelte |
| Deployment | Vercel (static frontend + serverless API) |
| CI/CD | GitHub Actions |

## Available Scripts
| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run server` | Start Express API (port 3001) |
| `npm run dev:all` | Run both concurrently |
| `npm run build` | Build frontend to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Deployment
- **Vercel** hosts both static frontend and serverless API
- `vercel.json` disables GitHub auto-deploy; uses tagged releases instead
- **`ci.yml`** - Runs lint + build on every push/PR to main
- **`deploy.yml`** - Deploys to Vercel on `v*` tag push (e.g., `v1.2.0`)

## Key Conventions
- Svelte 5 runes mode (`$state`, `$effect`, `$derived`)
- Hash-based routing (no server-side routing needed)
- i18n via Svelte stores with EN/DE translations
- In-memory caching (5 min TTL) for scraped pages
- Cheerio selectors target `.Bordered` tables and `.Detailed` lists from Ratings Central HTML
