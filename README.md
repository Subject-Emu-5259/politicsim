# PolitySim

A persistent, real-time political and economic simulation game where players create politicians, run for office, propose and vote on legislation, and shape the political landscape of simulated countries.

**Game clock:** 1 real hour = 1 game week. The world runs 24/7, evolving even when you're offline.

## Architecture

PolitySim is a **Zo Site** — single-process Bun + Hono server with a Vite + React SPA frontend.

```
.
├── server.ts                          # Hono server + Vite middleware + API mount
├── zosite.json                        # Zo deployment config
├── data/
│   ├── politicsim.sqlite              # Bun-native SQLite (WAL mode)
│   ├── countries/usa.json             # USA country config (parties, demographics, offices)
│   └── topics.json                    # Bill templates by policy topic
└── src/
    ├── lib/
    │   ├── db/index.ts                # SQLite connection + migrations
    │   ├── auth/index.ts              # bcrypt + opaque session tokens (HttpOnly cookies)
    │   ├── game/
    │   │   ├── types.ts               # Canonical domain types
    │   │   └── tick.ts                # Tick engine: elections, bills, effects, events
    │   ├── countries/seed.ts          # Country config loader + DB seeder
    │   ├── api/routes.ts              # All /api/* routes
    │   └── metrics/emitter.ts         # Pub/sub for SSE fan-out
    ├── hooks/
    │   ├── useApi.ts                  # Fetch + polling hook
    │   ├── useAuth.tsx                # Auth context provider
    │   └── useLiveEvents.ts           # SSE subscription
    ├── components/
    │   ├── layout/AppShell.tsx        # Nav + auth-aware shell
    │   ├── auth/RequireAuth.tsx       # Route guard
    │   └── ui/                        # shadcn components
    └── pages/
        ├── Landing.tsx                # Public marketing page
        ├── Login.tsx, Register.tsx    # Auth flows
        ├── Dashboard.tsx              # Player command center
        ├── CountryView.tsx            # Country: parties, demographics, offices, activity
        ├── PoliticianNew.tsx          # Create politician form
        ├── PoliticianDetail.tsx       # Stats + actions (rally, fundraise, propose bill, etc.)
        ├── ElectionsPage.tsx          # Upcoming + recent elections
        ├── LegislationPage.tsx        # Bills by stage
        └── NotFound.tsx
```

## Data Model

Single SQLite database with WAL mode for concurrent reads. Tables:

- `users`, `sessions` — auth
- `world` — singleton game clock state
- `countries`, `parties`, `demographic_groups`, `offices` — world config (seeded from JSON)
- `politicians` — player + NPC politicians (stats, demographics, status)
- `elections` — election events with candidates + results
- `bills` — legislation with stages, votes, policy effects
- `polls` — polling snapshots
- `events` — activity log (consumed by SSE ticker)

## Game Loop

The tick engine (`src/lib/game/tick.ts`) runs every 60 seconds, checking if a real hour has elapsed. Each tick:

1. Advances `currentWeek` by elapsed weeks
2. Transitions election stages (campaigning → voting → certified)
3. Advances bill stages (committee → floor-vote → passed/rejected → signed)
4. Applies signed-bill policy effects to country metrics
5. Updates demographic approval based on recent legislation
6. Records `GameEvent`s and broadcasts via SSE

**Speed control:** `tickSpeedMultiplier` in the world row accelerates/decelerates the clock.

## API

All endpoints under `/api/*`. Auth via `ps_session` HttpOnly cookie.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Sign in |
| POST | `/auth/logout` | ✓ | End session |
| GET | `/auth/me` | ✓ | Current user |
| GET | `/world` | — | Game clock state |
| GET | `/world/stream` | — | SSE event stream |
| GET | `/countries` | — | List countries |
| GET | `/countries/:id` | — | Country + parties + demographics + offices |
| GET | `/countries/:id/parties` | — | Parties for country |
| GET | `/countries/:id/offices` | — | Offices for country |
| GET | `/politicians` | — | List (filter by `country`, `owner=me`) |
| GET | `/politicians/:id` | — | Politician + party + country + office + recent bills + upcoming elections |
| POST | `/politicians` | ✓ | Create politician |
| POST | `/politicians/:id/:action` | ✓ | Actions: `rally`, `fundraise`, `propose-bill`, `rest`, `retire`, `vote-bill` |
| GET | `/elections` | — | List (filter by `country`) |
| POST | `/elections/:id/declare` | ✓ | Declare candidacy |
| GET | `/bills` | — | List (filter by `country`, `stage`) |
| POST | `/bills` | ✓ | Create bill |
| GET | `/events` | — | Activity log (filter by `country`) |

## Development

The Zo system manages the server process. The dev server auto-reloads on file changes via `bun --hot`.

To verify locally (agent-side preview at `http://localhost:$PORT`):

```bash
agent-browser open http://localhost:$PORT
agent-browser screenshot docs/preview.png
```

## Tech Stack

- **Runtime:** Bun 1.2
- **Server:** Hono 4
- **DB:** bun:sqlite (WAL mode)
- **Frontend:** React 19 + Vite 7 + Tailwind 4 + shadcn/ui
- **Auth:** bcryptjs + nanoid session tokens
- **Icons:** lucide-react

## Country Configuration

Countries are defined as JSON in `data/countries/`. USA is shipped; UK and Japan are planned. Each config specifies:

- Headline macro stats (GDP, population, unemployment, inflation)
- Parties (name, color, ideology, treasury)
- Demographic groups (population share, issue preferences, approval baseline)
- Offices (type, region, chamber, term length, seat count)

## Roadmap

- [x] Sprint 0: Scaffold, DB, types, auth, tick engine, SSE
- [x] Sprint 1: USA config, seed, politician CRUD, actions
- [x] Sprint 2: Full React UI (landing, dashboard, country, politician, elections, legislation)
- [ ] Sprint 3: Election voting + certification logic in tick engine
- [ ] Sprint 4: NPC politicians + AI-driven campaigning
- [ ] Sprint 5: UK + Japan country configs
- [ ] Sprint 6: Coalitions (UK/JP parliamentary systems)
- [ ] Sprint 7: Public publishing + custom domain
