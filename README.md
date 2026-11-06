# Mocci

**Modern SaaS overlay builder for streamers** — design interactive game overlays with drag & drop, connect your TikTok LIVE, and go on air in minutes.

![status](https://img.shields.io/badge/status-beta-violet) ![platform](https://img.shields.io/badge/platform-TikTok%20Live-black)

## What it does

- **Visual editor** — drag widgets (gift alerts, chat box, leaderboard, goal counter, text, image, game canvas) onto a 1920×1080 canvas, style them in the inspector, undo/redo, autosave.
- **Overlay runtime** — every overlay gets a public URL (`/overlay/<token>`) designed for an OBS browser source: transparent background, viewport-scaled, live-updating.
- **Live events** — a connector service joins a TikTok LIVE (or runs in simulation mode), normalizes gift/chat/follow events and fans them out through Redis → WebSocket hub → open overlays in real time.
- **Event-driven widgets** — gift alert queue with animation & sound, rolling-window leaderboard, goal progress bar, buffered chat — all react within ~1s of an event.

## Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│  apps/platform (Next.js 16) │        │  apps/connector (Node)   │
│  ├─ auth (iron-session)     │        │  ├─ TikTok LIVE (ttlc)   │
│  ├─ dashboard + editor      │        │  ├─ simulation mode      │
│  ├─ REST API (overlays)     │        │  └─ normalize events     │
│  ├─ /overlay/[token] runtime│        └───────────┬──────────────┘
│  └─ socket.io hub           │                    │ publish
│       ▲  join by token      │                    ▼
│       └──────── socket.io ──┼── Redis pub/sub ◄──┘
└─────────────────────────────┘   (mocci:events,
                                    mocci:scene-updates)
        packages/shared — scene schema (Zod), widget components
                         (shared by editor & runtime = WYSIWYG)
```

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Tailwind 4 · Prisma 6 + PostgreSQL 16 · Redis pub/sub · socket.io 4 · TypeScript (pnpm workspaces) · Vitest · Playwright (system Chrome).

## Getting started

### Prerequisites

- Node.js ≥ 24, pnpm 10
- PostgreSQL 16 and Redis 7 running locally (e.g. `brew install postgresql@16 redis && brew services start postgresql@16 redis`)
- A database named `mocci` (or adjust the URL below)

### Setup

```bash
pnpm install

# 1. Configure environment
cp .env.example apps/platform/.env   # then edit values
cp .env.example apps/connector/.env  # connector needs DATABASE_URL + REDIS_URL only
```

`apps/platform/.env`:

```env
DATABASE_URL="postgresql://<user>@localhost:5432/mocci?schema=public"
REDIS_URL="redis://localhost:6379"
AUTH_SECRET="<openssl rand -base64 32>"   # min. 32 characters
```

```bash
# 2. Create the schema
pnpm --filter platform db:migrate

# 3. Build everything
pnpm build
```

### Run

```bash
# Platform (Next.js + WebSocket hub on one port — hub runs in dev too)
pnpm dev:platform        # dev — http://localhost:3000
pnpm --filter platform start   # prod — same custom server, production build

# Connector (TikTok → Redis)
pnpm dev:connector       # http://localhost:4001
```

Then open http://localhost:3000 → register → create an overlay → build it in the editor.

**Behind a proxy** (e.g. an Orca worktree preview like `beta.orca.localhost:51069`): Server Actions need the browser `origin` to be allowed — `*.orca.*` is preconfigured in `next.config.ts`. For any other proxy set `SERVER_ACTIONS_ALLOWED_ORIGINS="host:port,..."` in the environment.

## Using it in OBS (browser source)

1. In the editor, click **Copy URL Overlay**.
2. In OBS: **Sources → + → Browser**.
3. Paste the URL, set **Width 1920, Height 1080** (or your canvas size — the scene auto-scales).
4. Leave **Custom CSS** empty — the background is already transparent.
5. Events appear live; scene edits hot-reload without refreshing the source.

## Connecting TikTok (or simulating)

The connector exposes a small HTTP API (default `http://localhost:4001`):

```bash
# Start a simulated connection (scripted gift/chat events, no TikTok needed)
curl -X POST http://localhost:4001/api/connections \
  -H 'content-type: application/json' \
  -d '{"overlayId":"<overlay-id>","username":"yourhandle","mode":"simulate"}'

# Go live against a real TikTok username
curl -X POST http://localhost:4001/api/connections \
  -H 'content-type: application/json' \
  -d '{"overlayId":"<overlay-id>","username":"yourhandle","mode":"live"}'

# Status & disconnect
curl http://localhost:4001/api/connections
curl -X DELETE http://localhost:4001/api/connections/<connection-id>
```

Live mode uses `tiktok-live-connector` 2.4.0 with exponential-backoff reconnects (1s → 30s). Simulation mode emits weighted events every ~650ms from a realistic mock dataset — **22 Indonesian-style usernames, 30+ chat lines, and a real-value TikTok gift catalog** (Rose ×1 … TikTok Universe 44,999 coins, cheap gifts come in streaks like Rose ×24) — perfect for designing without a live stream.

## Demo feed (mock events without the connector)

**From the editor:** click **▶ Pratinjau Demo** in the toolbar — it opens the real overlay with `?demo=1`, which starts a *local* mock-event pump in the browser (no connector, no scripts). A small `DEMO · data tiruan` badge marks the mode; the deterministic cycle guarantees a gift alert within ~2s. The same flag works on any overlay URL:

```
http://localhost:3000/overlay/<token>?demo=1
```

For a curated *narrative* demo (opening chat, small gifts, follows, a big Galaxy moment, and a Universe climax) push the scripted sequence straight through the ingest API:

```bash
node apps/platform/scripts/demo-feed.mjs <publicToken>                      # paced, ~30s
node apps/platform/scripts/demo-feed.mjs <publicToken> --fast               # instant burst
node apps/platform/scripts/demo-feed.mjs <publicToken> --url http://localhost:3000
```

`<publicToken>` is the last segment of the overlay URL (or from **Copy URL Overlay** in the editor). The script prints each event as it sends and reports totals — 31 events, 76,501 coins.

## Games (gift-driven mini game in the overlay)

The **Game Canvas** widget embeds any URL in an iframe — and the connector itself serves built-in games, because the connector owns the live event stream. Events reach the game over **SSE**, straight from the active session:

```bash
http://localhost:4001/games/galaxy-defense   # the game page
GET /games                                    # list available games
GET /api/games/stream?token=<publicToken>     # SSE stream (or overlayId=)
```

### Galaxy Defense

Asteroids drift toward your base; viewers' gifts are your firepower:

| Event | Effect in game |
|---|---|
| **Gift** | laser damage to *every* asteroid equal to the coin value — floating damage numbers, screen shake, celebration banner for gifts ≥ 1,000 coins |
| **Follow** | +15 HP to the base (shield flash) |
| **Chat** | combo counter → score multiplier up to ×5 |

Difficulty ramps with time and score; if the base is destroyed it explodes and **auto-respawns** after 2.5s (the overlay never freezes on a game-over screen). While the connector is down the game shows *“Koneksi event terputus — mencoba lagi…”*.

Wire it up: add a **Game Canvas** widget in the editor and set the URL to `http://localhost:4001/games/galaxy-defense?token=<publicToken>` (the field placeholder shows the pattern). Simulated connections count too — start `mode: simulate` and the game plays immediately.

## Testing

```bash
pnpm test                      # unit tests (widget behavior + event normalization)
pnpm build                     # typecheck all packages

# Integration & E2E (need Postgres + Redis running, and a built platform)
pnpm --filter platform start &                  # platform + hub on :3000
pnpm --filter connector start &                 # connector on :4001

node apps/platform/scripts/test-api-errors.mjs     # API error audit (400/401/403/404)
node apps/platform/scripts/test-hub.mjs            # hub relay: ingest → socket room
node apps/platform/scripts/test-connector.mjs      # connector → Redis → hub → room
node apps/platform/scripts/test-game.mjs           # game page + SSE stream from sim session
BASE_URL=http://localhost:3000 node apps/platform/scripts/test-demo-feed.mjs  # demo feed → room
cd apps/platform && npx playwright test            # full UI flow in system Chrome
```

The Playwright E2E covers the complete streamer journey: **register → login → create overlay → add widgets → autosave → open public overlay → ingest gifts → verify alert, leaderboard order and goal progress**.

## Project layout

```
apps/platform    Next.js app: auth, dashboard, editor, REST API, overlay runtime, socket.io hub
apps/connector   TikTok LIVE connector: live + simulation modes, event normalization
packages/shared  Zod scene schema, normalized event types, widget components (editor + runtime)
docs/superpowers/specs/  Design spec
.taskmaster/docs/        PRD & task breakdown (10 tasks) driving the build
```

## Status & roadmap

Beta — TikTok Live first. Phase 2 candidates: gift-mapping UI (map gifts to game actions), connection management dashboard, more platforms (YouTube, Twitch), widget library expansion.
