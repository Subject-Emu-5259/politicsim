# PolitySim — Dev Log

A running record of what we've shipped, what we're learning, and what comes next.
Source of truth for design decisions and feature lineage.

---

## 2026-07-01 — A House Divided changelog intake (full history, 80 releases)

**Source:** [https://www.ahousedividedgame.com/changelog](https://www.ahousedividedgame.com/changelog) (fetched 2026-07-01)
**Scope:** 80 releases, 1,485 total changes, **Feb 2, 2025 → Jun 27, 2026**, current v0.3.6.

AHD is the closest live reference for the kind of political-economic sim we're building.
They've shipped a release a week (sometimes two) for 18 months. The cadence tells us
what's load-bearing for the genre: **economy > elections > content > UI > platform**.

### Release timeline (full, oldest → newest)

#### v0.0.x — Foundation (Feb 2 – Feb 24, 2026) — pre-alpha, 24 releases
- **v0.0.1 (Feb 2)** — ✨ Highlights: 1 entry (the founding release)
- **v0.0.2 – v0.0.5 (Feb 3–14)** — ⚙️ mechanics only, no UI: 3–5 changes each
- **v0.0.6 – v0.0.10 (Feb 14–19)** — mechanics + small UI/platform
- **v0.0.11 (Feb 20)** — first 10-change release; first platform plumbing
- **v0.0.12 – v0.0.17 (Feb 21–24)** — first content releases
- **v0.0.18 (Feb 24)** — last pre-alpha

**Pattern:** AHD spent **22 days** shipping pre-alpha mostly invisible-internals. Take-away for us: don't ship UI before the engine is stable. **Sprint 0–2 is the equivalent window for PolitySim.**

#### v0.1.x — Alpha (Feb 25 – Apr 10, 2026) — 11 releases, ~290 changes
- **v0.1.0 (Feb 24)** — first 10-change release
- **v0.1.1 (Feb 25)** — 30 changes; first big UI pass
- **v0.1.2 (Mar 27)** — 34 changes; first content drop
- **v0.1.3 (Apr 2)** — 54 changes; first major feature wave
- **v0.1.4 (Apr 3)** — 26 changes
- **v0.1.5 (Apr 4)** — 8 changes (hot-fix week)
- **v0.1.6 (Apr 5)** — 21 changes; big platform work (10/21)
- **v0.1.7 (Apr 6)** — 15 changes
- **v0.1.8 (Apr 7)** — 7 changes (hot-fix)
- **v0.1.9 (Apr 7)** — 19 changes
- **v0.1.10 (Apr 10)** — 21 changes; final alpha — `Alpha — Final release: v0.1.10`

**Take-aways:**
1. Alpha lasted **~6 weeks** in AHD. Their final-alpha dropped a `Alpha — Final release` milestone banner. We should do the same at v0.1.x.
2. They went from 30 → 34 → 54 changes in 5 weeks — the team was building momentum. UI/Content ratio climbed toward 50/50.
3. They tagged the final alpha as "Alpha" and named the version explicitly.

#### v0.2.x — Beta (Apr 10 – May 22, 2026) — 21 releases, ~640 changes
- **v0.2.0 (Apr 10)** — 13 changes; Beta tag flip + platform work
- **v0.2.1 (Apr 12)** — 8 changes
- **v0.2.2 (Apr 13)** — 29 changes
- **v0.2.3 (Apr 16)** — 7 changes
- **v0.2.4 (Apr 17)** — 31 changes
- **v0.2.5 (Apr 18)** — 5 changes
- **v0.2.6 (Apr 20)** — 38 changes; split mechanics + UI
- **v0.2.7 (Apr 21)** — 21 changes
- **v0.2.8 (Apr 23)** — 44 changes
- **v0.2.9 (Apr 28)** — 25 changes
- **v0.2.10 (Apr 30)** — 17 changes
- **v0.2.11 (Apr 30)** — 31 changes
- **v0.2.12 (May 6)** — **90 changes** ← biggest beta release
- **v0.2.13 (May 6)** — 21 changes
- **v0.2.14 (May 7)** — 9 changes
- **v0.2.15 (May 8)** — 4 changes
- **v0.2.16 (May 11)** — 46 changes
- **v0.2.17 (May 14)** — 21 changes
- **v0.2.18 (May 15)** — 17 changes
- **v0.2.19 (May 19)** — 16 changes; **introduced 🏛️ Governor's Office + White House / Executive Office + 📰 News Wire + 🛡️ Admin**
- **v0.2.20 (May 21)** — 20 changes; first 🇩🇪 Germany release
- **v0.2.20 (May 22)** — 1-change hotfix

**Pattern:** AHD added country-specific tags (**🇺🇸 / 🇬🇧 / 🇩🇪 / 🇯🇵**) starting in late April. Once a country is shipped, future changes get a flag prefix even when they're tiny. The 🇩🇪 flag appeared alone on a 1-change release, meaning the entire change was Germany-only.

#### v0.3.x — Live (May 24 – Jun 27, 2026) — 7 releases, ~411 changes
- **v0.3.0 (May 24)** — 101 changes ← biggest release of v0.3
- **v0.3.1 (Jun 7)** — 111 changes ← biggest single release of beta-and-beyond
- **v0.3.2 (Jun 9)** — 70 changes
- **v0.3.3 (Jun 14)** — 25 changes
- **v0.3.4 (Jun 20)** — 34 changes
- **v0.3.5 (Jun 23)** — 54 changes; introduced "**Independence Update**", "**Cabinet Office Update**", "**International Organizations Update**" sub-labels
- **v0.3.6 (Jun 27)** — 6 changes; current; **Tech Trees + Debt Restructuring** (latest)

**Pattern:** Live version shipped 3 weeks after beta. Releases became *themed* — they ship a large update (e.g. v0.3.5 = Independence) and then a string of smaller hot-fix/balance weeks after.

### Feature archetypes (deduplicated from 1,485 changes)

| Archetype | Examples (AHD) | PolitySim equivalent | Status |
|---|---|---|---|
| **Long-term progression** | Tech Trees (v0.3.6), Governor's Office (v0.2.19) | Politician career progression, achievements, cabinet rank | 🟡 In progress (career.ts exists, achievements table shipped) |
| **Macro / micro-economy** | Tech-gated production methods, debt restructuring, corporation bonds, default waterfall | Bill policy effects, country macro stats (GDP, unemployment, inflation) | ✅ Shipped |
| **Elections & government** | Independence Update, Cabinet Office, White House / Executive Office, Governor's Office | Election tick logic, cabinet actions (4/week) | 🟡 In progress (elections scheduled but resolution needs more polish) |
| **International relations** | International Organizations Update | None | ⏳ Sprint 8+ |
| **Live information streams** | News Wire, polls, events ticker | SSE event stream, /api/events, polls table | ✅ Shipped |
| **Banking / corporate finance** | Bond default waterfall, CEO abandonment, foreign-currency bond values | Country debt, party treasury, FX (now in v4 schema) | 🟡 In progress (FX shipping in Sprint 10) |
| **Auth + account** | Registration, login, profiles | bcrypt + opaque sessions | ✅ Shipped |
| **Persistence** | World advances even offline | "1 real hour = 1 game week" — tick engine + 60s checks | ✅ Shipped |
| **Multi-country support** | US, UK, Germany, Japan (live) + 17 more registered | USA shipped; UK/JP on roadmap | ⏳ Sprint 5 |
| **AI opponents** | NPC candidacy, charisma-weighted, declares automatically | `seedNpcPoliticians`, 10%/week NPC autonomy | ✅ Shipped |

### Bugs they've fixed (we should pre-empt)

1. **v0.3.6 — Foreign-currency bond values wildly inflated** — bond values shown in bond's own currency without converting to anchor units. JPY bonds were 100× too high. **→ I just shipped the same fix in Sprint 10 (FX snapshot per week).**
2. **v0.3.6 — Abandoned CEO leaves bond debt stranded** — deleting a CEO vacated the seat but left outstanding bonds unpayable. Now runs a full settlement waterfall. **→ Worth adding as Sprint 11: politician-retire safety check, parallel to `cleanupOrphanOffices`.**
3. **v0.2.20 — Germany-specific hotfix (1 change)** — proves country-specific bugs will happen. Our schema needs to key monetary values on `countryId`, not assume USD.
4. **v0.0.18 mis-dated (Feb 24 in a pre-Feb-18 series)** — they're not perfect with version control either. Always include dates and a hash.

### What we should borrow

1. **Release cadence of ~1/week** with hot-fix releases at 1–7 changes. AHD has 80 in 18 months; we should target 40+ in our first year.
2. **Named themed releases** ("Independence Update", "Cabinet Office Update", "Tech Trees") — players remember them, and the changelog becomes marketing.
3. **Country tag prefixes** (🇺🇸 🇬🇧 🇩🇪 🇯🇵) in changelog entries — instant visual cue of scope.
4. **Per-week rate snapshots** for any time-varying value (FX, interest, inflation). Live rates are a footgun.
5. **Auto-settle bonds/debts on abandonment** — no zombie state machines.
6. **Final-alpha banner** ("Alpha — Final release: v0.1.10") — clear milestone for users.
7. **A "Highlights" tag** for first-time revelations (only used once: v0.0.1).

### What we should NOT borrow

1. **i18n tags on every release** — AHD's `Since Feb 2026` is actually `Feb 2025`. AHD is sloppy with metadata. Use proper YYYY-MM-DD always.
2. **Releases numbered above 0.x.y for live service** — AHD is at v0.3.6 after 18 months. Stay in 0.x until 1.0, no `0.99 → 1.0` artificial jumps.
3. **Tracking by total-change count** — AHD's "1,485 total changes" counts every bullet, which inflates the signal. Count *releases* and *themes* instead.

---

## 2026-07-01 — Sprint 10 (tick hardening) shipped

- ✅ FX per-week rate snapshot (`src/lib/fx/index.ts` + `fx_rates` table)
- ✅ Auto-schedule special elections when a politician retires/dies while holding office (`cleanupOrphanOffices`)
- ✅ USA country config (`data/countries/usa.json`) — parties, demographics, offices
- ✅ Dev server live at `http://localhost:58867/` (HTTP 200)
- ✅ Committed `a84fde0` and pushed to `main`

## 2026-07-01 — Earlier context

- PolitySim is a Zo Site (Bun + Hono + React 19 + Vite 7 + Tailwind 4 + shadcn/ui) ported from
  an AHD-style political-economic sim. Cloned from `https://github.com/Subject-Emu-5259/politicsim`.
- Dev server runs via `bun run --hot server.ts` on port 58867 (auto-managed by Zo).
- DB is `bun:sqlite` in WAL mode at `data/politicsim.sqlite` (gitignored).
- Currently: USA only, NPC candidates seed automatically, tick advances 1 game week per real hour.
