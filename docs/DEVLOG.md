# PolitySim — Dev Log

A running record of what we've shipped, what we're learning, and what comes next. Source of truth for design decisions and feature lineage.

---

## 2026-07-01 — A House Divided changelog intake & feature plan

**Source:** https://www.ahousedividedgame.com/changelog (fetched 2026-07-01)

AHD is the closest live reference for the kind of political-economic sim we're building — they iterate fast, label their changes with category tags (⚙️Mechanics, 🎨UI, 🐛Bug Fixes, 🔧Platform, 📚Content, 🇩🇪 country-specific), and ship weekly. We extracted the patterns that fit our model and are folding them into our roadmap.

### What we pulled from AHD

#### 1. Tech Trees (latest major AHD feature)

- **Two lanes per corporation:** a **Corporate** lane (effects apply at 50% strength across *all* sectors) and a **Sector** lane (effects hit the *primary* sector at 100%).
- **Per-node effects can be:** profit-margin bonus, growth-cost reduction, input-consumption cut, output boost, +marketing, +logistics.
- **Tech-gated production methods:** advanced methods (nuclear, fracking, renewables, smart grid, AI platforms, quantum, fusion) are locked until a node is researched.
- **Era shortcut:** if the world has moved past a method's decade, it auto-unlocks for everyone; only current/future era methods need research.
- **Backfill for existing players:** corporations already in the world were granted the early-decade Corporate nodes for the eras that have passed — no one starts at zero.

**Our adaptation → "Political Doctrine Trees" (Sprint 8):** rather than profit margin, each doctrine node modifies political/economic parameters: campaign-effectiveness, fundraising efficiency, legislative momentum, demographic-approval floor, scandal resistance, or executive-order reach. Doctrine is per-*country* (the analog of AHD's per-corporation) and per-*party* (so Democrats and Republicans can each research their own lanes). Backfill rule applies on world join.

#### 2. Defaulted corporations can restructure (debt mechanics)

- Bond default now has a third path beyond **dissolution**: **restructure**.
- The game liquidates the **minimum set of highest-value sectors** needed to repay bondholders at an 85% orderly-sale recovery rate, then cures the bonds and keeps the corp alive on what's left.
- Only offered when value is actually there to cover the debt — otherwise dissolve is still forced.
- Corps that stay in default across turns are **auto-restructured when feasible** — walking away from bondholders is no longer viable.

**Our adaptation → "Political Coercion & Censure" (Sprint 9):** translate to political defaults. When a politician's *approval* or *cash* collapses:

- **Forced retirement** becomes one of three options: voluntary retire, primary challenge (another politician of the same party can challenge), or **restructure** (the party absorbs the politician into a cabinet or staff role, the politician loses office but keeps a seat at the table).
- Auto-restructuring triggers if a politician has been at &lt;20% approval for 3+ consecutive ticks without recovery.

#### 3. Foreign-currency bond values inflated

- Bond holdings and holder values on the Bonds tab were shown in the bond's own currency (yen, pounds) without converting to anchor units — JPY bonds appeared \~100× too high.

**Our adaptation → Currency normalization in World Markets:** our World Markets page already shows trade balances in USD. We need a similar normalization pass: any cross-country cost (campaign donations from foreign nationals, lobbying, sanctions) must convert through a single anchor (USD) at the start of every tick, not at render time.

#### 4. Abandoning a CEO leaves the corp's bond debt stranded

- Deleting a CEO used to vacate the seat while leaving outstanding bonds unpayable — the corp became a zombie that couldn't be dissolved or taken over. Now CEO-led corps with outstanding bonds run the full bond-default settlement waterfall on abandonment.

**Our adaptation → No orphan offices:** an office should never persist with an elected-politician slot and no politician. Add a `cleanupOrphanOffices()` pass to the tick engine: if `officeId` is set on a politician who just retired and no replacement exists, demote the office to `vacant` and schedule a special election 2 weeks out (instead of letting the office sit ungoverned until the next general).

#### 5. UI patterns worth copying

AHD's changelog shows heavy UI iteration in every cycle. The patterns that match what we already have:

- **Category badges on every entry** (⚙️Mechanics, 🎨UI, 🐛Bug Fixes, etc.) — we're going to put the same on our in-game "Activity" and "News" feeds so players can filter by what kind of event happened.
- **Numbered counts in collapsed sections** (`⚙️Mechanics (18)`, `🐛Bug Fixes (12)`) — a clean way to summarize a release when the full list is long. We'll adopt this for our own dev log entries.

### Backlog delta (added this session)

| Sprint | Feature | Inspired by | Priority |
| --- | --- | --- | --- |
| 8 | Political Doctrine Trees (per-country, per-party) | AHD Tech Trees | P1 |
| 9 | Politician Restructure vs. Retire vs. Primary Challenge | AHD Corp Restructure | P1 |
| 10 | Currency normalization in World Markets tick | AHD Bond FX fix | P2 |
| 10 | Orphan office cleanup + special elections | AHD CEO abandonment fix | P2 |
| 11 | Country-specific changelog badges in Activity Feed | AHD changelog UI | P3 |

Full backlog lives in `file ROADMAP.md`.

---

## 2026-06-30 — Repo sync + dev server resurrection

- Pulled latest from `origin/HEAD` (commit `32c0f25`, PR #3 — complete UI redesign + API fixes + gameplay feature). Working tree clean.
- Resurrected the dev server at `http://localhost:58867`:
  - Vite 8.1.2 had a broken `module-runner` cache → wiped `node_modules` + `bun.lock`, reinstalled (88 packages).
  - `file data/countries/usa.json` was missing (gitignored) and required for boot → shipped a real config (Dem/GOP/Ind parties, demographics, federal + state offices, 40 NPC politicians seeded).
  - Dev server started standalone via `nohup` per AGENTS.md quirk; tick engine running, USA seeded.

---

## 2026-05-27 — PR #3: complete UI redesign + API fixes + gameplay feature

- Nav restructured to World / Markets / Wiki / Politicians.
- WIRE ticker added.
- AHD intelligence layer applied (per the merge title).
- Pull request #3 from `copilot/complete-ui-redesign-api-fixes-gameplay-feature`.

---

## 2026-05-04 — THE OPEN WORLD: Devvit game expansion

(Reference only — separate project. Prison/legal consequences, multi-save, conversation/NPC depth, iframe-fit UI.)

---

## 2026-04-23 — Project bootstrap

PolitySim scaffolded as a Zo Site: Bun + Hono + React 19 + Vite 7 + Tailwind 4 + shadcn/ui. SQLite via `bun:sqlite` in WAL mode. Tick engine at 1 real hour = 1 game week, checked every 60s. SSE live stream at `/api/world/stream`. Auth via bcrypt + opaque session cookies. USA country config + seed on first boot.