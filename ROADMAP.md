# PolitySim — Roadmap

Living feature backlog, ordered by sprint. Each sprint ends with a shippable demo
at `http://localhost:58867`. Release cadence: 1/week, hot-fixes as needed.

Source of design inspiration: [`docs/DEVLOG.md`](docs/DEVLOG.md) (A House Divided changelog intake).

---

## ✅ Shipped

- [x] **Sprint 0** — Scaffold, DB, types, auth, tick engine, SSE
- [x] **Sprint 1** — USA config, seed, politician CRUD, actions (rally, fundraise, propose-bill, rest, retire, vote-bill)
- [x] **Sprint 2** — Full React UI (Landing, Dashboard, Country, Politician, Elections, Legislation, NotFound)
- [x] **Sprint 2.5** — Nav restructure (World / Markets / Wiki / Politicians / News / Login)
- [x] **Sprint 10** — Tick hardening: per-week FX rate snapshot + auto special-election on office vacancy

## 🟡 In progress

- [ ] **Sprint 3** — Election voting + certification logic in tick engine (resolve vote-share, certify winner, update politician.status)
- [ ] **Sprint 4** — NPC politicians + AI-driven campaigning (10%/week action rate, charisma-weighted candidacy)

## 🔜 Backlog

### Country & world (from AHD v0.2.19–0.3.5)
- [ ] **Sprint 5** — UK + Japan country configs (GBP, JPY, parliamentary systems)
- [ ] **Sprint 6** — **Governor's Office / State-level sub-executive** subsystem (AHD 🏛️) — regional offices, state-level approval, state-specific demographics
- [ ] **Sprint 7** — **Cabinet Office / Executive Office** subsystem (AHD 🏛️) — head of state + cabinet lifecycle, term limits
- [ ] **Sprint 8** — **Independence Update** (AHD) — declaration mechanics, separatist movements, new-country formation
- [ ] **Sprint 9** — **International Organizations Update** (AHD 🌐) — UN/NATO-style orgs, treaties, sanctions

### Long-term progression
- [ ] **Sprint 11** — **Tech Trees** (AHD v0.3.6) — research/ideology trees that unlock advanced bill effects, special powers, party platforms
- [ ] **Sprint 12** — **Politician career progression** — 5 tiers (backbencher → cabinet → party leader → head of state → elder statesman), with achievements & unlock conditions
- [ ] **Sprint 13** — Cabinet actions (4/week) — vote-with-party, dissent log, loyalty stat, coalition break risk

### Economy & finance
- [ ] **Sprint 14** — **National debt ceiling** (AHD) + bond issuance + debt service cost
- [ ] **Sprint 15** — **Debt default + restructure waterfall** (AHD v0.3.6) — auto-settle on abandonment, orderly-sale recovery rate
- [ ] **Sprint 16** — **Corporate / party treasury** with FX (already partly in v4 schema)
- [ ] **Sprint 17** — Taxation sliders (income, capital gains, corporate) with revenue & approval tradeoff
- [ ] **Sprint 18** — Central bank (interest rate, money supply, inflation targeting)

### Information & media
- [ ] **Sprint 19** — **News Wire** (AHD 📰) — event log → public-facing news feed with editorial tone
- [ ] **Sprint 20** — Polls — weekly approval snapshots, margin of error, party-vs-party head-to-head
- [ ] **Sprint 21** — Scandal system — integrity decay, leaks, media event cascade

### Multiplayer & social
- [ ] **Sprint 22** — Player-vs-player elections (challenge, opponent declaration)
- [ ] **Sprint 23** — Coalition formation (UK/JP parliamentary) — confidence-and-supply, no-confidence votes
- [ ] **Sprint 24** — Party switching, party split, party merger mechanics
- [ ] **Sprint 25** — Diplomatic relations between countries (trade, aid, sanctions, war)

### Platform & infra
- [ ] **Sprint 26** — Public publishing + custom domain
- [ ] **Sprint 27** — i18n + l10n (en-US first, then es/fr/de)
- [ ] **Sprint 28** — Player profiles, badges, lifetime stats, leaderboards
- [ ] **Sprint 29** — Modding support: country configs as user-uploaded JSON
- [ ] **Sprint 30** — Mobile-responsive SPA (currently desktop-first)

### Milestone
- [ ] **Sprint 100** — **v0.1.x final-alpha** banner: tag the last alpha release and add a "Final release: v0.1.x" milestone (AHD did this on Apr 10, 2026)

## 🎯 Next 2 weeks

- Sprint 3 (elections resolution) is the next shippable unit
- Sprint 5 (UK + JP configs) — needs the FX plumbing from Sprint 10 first ✅
- Update weekly changelog with country-tag prefixes (🇺🇸) starting with Sprint 3

## Notes for future-me

- AHD released ~1/week for 18 months straight. Discipline matters.
- Always include date and version on every release. AHD's "Feb 24" v0.0.18
  is dated after v0.0.20 — don't be that sloppy.
- Per-week rate snapshots are the right pattern for *all* time-varying values
  (FX, interest, inflation, polls). Never read "current" for historical values.
