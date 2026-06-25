# PolitySim — Project Guide

Persistent real-time political & economic simulation. 1 real hour = 1 game week.

## Stack
- **Runtime:** Bun + Hono (NOT Express/Node)
- **Frontend:** React 19 + Vite + Tailwind 4 + shadcn/ui + React Router 7
- **DB:** Bun-native SQLite (`bun:sqlite`), WAL mode, persisted to `data/politicsim.sqlite`
- **Auth:** bcryptjs + opaque session tokens in DB, HttpOnly cookies
- **Live:** SSE stream at `/api/world/stream`

## Architecture
- `src/lib/db/index.ts` — single DB connection, auto-migrates on import
- `src/lib/game/types.ts` — canonical domain types
- `src/lib/game/tick.ts` — tick engine, checks every 60s, advances 1 week per real hour
- `src/lib/api/routes.ts` — all `/api/*` routes (auth, world, countries, politicians, elections, bills, events)
- `src/lib/auth/index.ts` — password hashing, sessions, requireAuth middleware
- `src/lib/countries/seed.ts` — loads `data/countries/*.json` and seeds DB on boot
- `src/lib/metrics/emitter.ts` — pub/sub for SSE fan-out
- `server.ts` — Hono app, mounts API, serves Vite in dev / static dist in prod
- `src/pages/*.tsx` — React SPA pages
- `src/components/layout/AppShell.tsx` — shared nav + auth state
- `src/hooks/useApi.ts` — fetch + polling hook
- `src/hooks/useLiveEvents.ts` — SSE subscription hook
- `src/hooks/useAuth.tsx` — auth context

## Country configs
`data/countries/usa.json` — parties, demographics, offices. USA is the only seeded country; UK + Japan are roadmap.

## Game mechanics
- **Politician actions** (`POST /api/politicians/:id/:action`): rally (+approval, −stamina), fundraise (+cash, −stamina), propose-bill (creates bill in committee), rest (+stamina), retire (status → retired), vote-bill (records vote on a bill)
- **Bills** flow: drafted → introduced → committee → floor-vote → passed/rejected → signed
- **Elections**: schedule, declare candidacy, certify winner
- **Tick engine** advances world week, processes scheduled elections, ages bills, updates demographics

## Dev workflow
- Dev server: `bun run dev` (Vite middleware mode, `bun --hot` restarts on file changes)
- NEVER run `bun run dev` or `bun run prod` manually — Zo manages the process
- Type check: `bunx tsc --noEmit`
- Preview pages: `agent-browser open http://localhost:$PORT`
- DB path: `data/politicsim.sqlite` (gitignored)

## Known quirks
- `bun --hot` sometimes serves stale Vite transforms; if a code edit doesn't take effect, kill the dev process (`pkill -f "bun run --hot"`) and let Zo restart it, or run `bun run dev` manually in nohup
- `data/` is wiped on cold restart of the dev process — for persistent testing, use a registered user + created data each session
- PoliticianDetail "Open drafter" uses `window.prompt()` (works in real browsers, not headless)
