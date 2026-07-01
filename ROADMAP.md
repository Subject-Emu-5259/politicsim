# PolitySim — Roadmap

Living feature backlog, ordered by sprint. Each sprint ends with a shippable demo at `http://localhost:58867`.

Source of design inspiration is tracked in [`docs/DEVLOG.md`](docs/DEVLOG.md).

---

## ✅ Shipped

- [x] **Sprint 0** — Scaffold, DB, types, auth, tick engine, SSE
- [x] **Sprint 1** — USA config, seed, politician CRUD, actions (rally, fundraise, propose-bill, rest, retire, vote-bill)
- [x] **Sprint 2** — Full React UI: landing, dashboard, country, politician, elections, legislation pages
- [x] **Sprint 2.5** (PR #3) — Nav restructure (World / Markets / Wiki / Politicians), WIRE ticker, AHD intelligence layer

---

## 🔜 In Progress

### Sprint 3 — Election voting + certification
- [ ] Campaign phase: candidates spend cash, stamina, and approval to gain votes
- [ ] Voting: demographic-weighted polling simulation
- [ ] Certification: winner is set, office updated, defeated/lost statuses applied
- [ ] Special elections on vacancy (see Sprint 10)

### Sprint 4 — NPC politicians + AI-driven campaigning
- [x] Already partial: 40 NPCs seeded per country
- [ ] NPC daily decision-making (campaign, fundraise, rest, betray-party)
- [ ] Cross-party recruitment: NPCs can switch parties if approval with current party drops below threshold

---

## 📋 Backlog

### Sprint 5 — UK + Japan country configs
- [ ] UK config: parliamentary system, coalition offices, House of Commons
- [ ] Japan config: LDP dominance, Diet chambers, prime minister office
- [ ] Country-specific changelog tags (🇬🇧, 🇯🇵) on Activity Feed events

### Sprint 6 — Coalitions (UK/JP parliamentary systems)
- [ ] Coalition formation: parties negotiate cabinet share after close elections
- [ ] Confidence votes; collapse triggers new elections
- [ ] Government vs. opposition mechanics

### Sprint 7 — Public publishing + custom domain
- [ ] Run `publish_site` to back the public HTTP service
- [ ] Custom domain: `politicsim.deandrewharris.zo.computer` (or your own)
- [ ] Public landing page variant (no auth wall, read-only leaderboard)

### Sprint 8 — Political Doctrine Trees (AHD-inspired) 🆕
*Inspiration: AHD "Tech Trees" (two-lane, era-gated, backfill on join)* — see [DEVLOG §1](docs/DEVLOG.md#1-tech-trees-latest-major-ahd-feature)
- [ ] **Doctrine schema:** per-country `doctrine_nodes` table with `lane` (party | executive), `era` (decade), `cost`, `effectsJson`
- [ ] **Per-party lanes:** Democrats and Republicans each research their own doctrine nodes
- [ ] **Per-country Corporate-equivalent:** a national Executive Office lane with effects at 50% strength across all parties (the "Corporate lane" parallel)
- [ ] **Era gating:** doctrine effects are unavailable until world week reaches the era; backfill on player/country join (any era already passed is auto-researched)
- [ ] **Node effects:** campaign-effectiveness, fundraising efficiency, legislative momentum, demographic-approval floor, scandal resistance, executive-order reach
- [ ] **Doctrine UI page:** research queue, node preview, era timeline

### Sprint 9 — Politician restructure vs. retire vs. primary challenge (AHD-inspired) 🆕
*Inspiration: AHD "Defaulted corporations can now restructure" — see [DEVLOG §2](docs/DEVLOG.md#2-defaulted-corporations-can-now-restructure-debt-mechanics)*
- [ ] **Three options on approval collapse** (< 20% for 3+ ticks):
  1. Voluntary retire (status → retired, office vacated)
  2. **Primary challenge** (same-party politician can declare candidacy, 2-week race)
  3. **Restructure** (party absorbs the politician into cabinet/staff role; keeps a seat, loses office)
- [ ] **Auto-restructure** triggers when feasible (parallel to AHD's auto-restructuring on persistent default)
- [ ] UI: prompt on the Politician Detail page when collapse threshold is hit
- [ ] Event: `politician_restructure` logged to Activity Feed

### Sprint 10 — Tick hardening pass (AHD bug-fix-inspired) 🆕
*Inspiration: AHD FX bond fix + CEO abandonment fix — see [DEVLOG §3](docs/DEVLOG.md#3-foreign-currency-bond-values-inflated) and [§4](docs/DEVLOG.md#4-abandoning-a-ceo-leaves-the-corps-bond-debt-stranded)*
- [ ] **Currency normalization:** any cross-country cost (foreign donations, lobbying, sanctions) converts through USD at the top of the tick, not at render time
- [ ] **Orphan-office cleanup:** `cleanupOrphanOffices()` runs at the end of every tick; if an office has no politician, it's set to `vacant` and a special election is scheduled 2 weeks out
- [ ] **Bond/parlamentary FX test:** unit test asserting that a JPY-denominated value displayed in USD terms matches the on-tick conversion (not the raw bond currency)
- [ ] **Bond/parlamentary abandonment test:** deleting a CEO/PM clears outstanding liabilities through the settlement waterfall

### Sprint 11 — Changelog & release notes (AHD-inspired) 🆕
*Inspiration: AHD's category badges + numbered-count collapses — see [DEVLOG §5](docs/DEVLOG.md#5-ui-patterns-worth-copying)*
- [ ] In-game **Activity Feed** items carry a category tag (⚙️Mechanics, 🎨UI, 🐛Bug Fixes, etc.) so players can filter
- [ ] Country-specific tags (🇺🇸, 🇬🇧, 🇩🇪, 🇯🇵) on events that only matter in one country
- [ ] Public **release-notes** view on the landing page, populated from `docs/DEVLOG.md`

### Sprint 12 — Multiplayer / real opponents
- [ ] Other players can declare candidacy against yours
- [ ] Coalition negotiation UI for parliamentary systems
- [ ] Lobbying: players can pay to influence NPC politician votes

---

## 🏁 Long-term ideas (post-Sprint 12)

- **International Organizations** (AHD §13) — UN, NATO, trade blocs: countries can join/leave, votes affect in-game sanctions
- **Cabinet Office** (AHD §9) — ministerial appointments, individual approval per minister
- **News Wire** (AHD §2) — player-generated events broadcast to all countries
- **Governor's Office** (new AHD subsystem) — sub-national executives with their own approval and bills
- **White House / Executive Office variants for UK / Germany / Japan** — localized executive mechanics per country type
- **Treasury & bonds** — government-level debt, restructuring the way AHD does corporate debt
- **Sanctions, trade wars, tariffs** — cross-country economic warfare

---

## 📊 Progress

| Sprint | Status | Started | Shipped |
|---|---|---|---|
| 0 | ✅ | 2026-04-23 | 2026-04-23 |
| 1 | ✅ | 2026-04-23 | 2026-04-25 |
| 2 | ✅ | 2026-04-25 | 2026-05-02 |
| 2.5 (PR #3) | ✅ | 2026-05-25 | 2026-05-27 |
| 3 | 🟡 In progress | 2026-07-01 | — |
| 4 | 🟡 In progress | 2026-07-01 | — |
| 5 | ⬜ | — | — |
| 6 | ⬜ | — | — |
| 7 | ⬜ | — | — |
| 8 | ⬜ | — | — |
| 9 | ⬜ | — | — |
| 10 | ⬜ | — | — |
| 11 | ⬜ | — | — |
| 12 | ⬜ | — | — |
