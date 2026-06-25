// Tick engine: runs on a fixed interval, advances the world by 1 game week per real hour.
// Each tick: advances elections, bills, applies policy effects, updates demographics,
// records events, and broadcasts updates via the SSE channel.

import { db, prep, jsonGet } from "../db";
import { nanoid } from "nanoid";
import {
  REAL_MS_PER_GAME_WEEK,
  realMsToWeek,
  weekToGameDate,
  type GameEvent,
  type EventKind,
} from "./types";
import { recordTick } from "../metrics/emitter";

const TICK_INTERVAL_MS = 60 * 1000; // check every minute; advance weeks as needed
let timer: Timer | null = null;

export function startTickEngine() {
  if (timer) return;
  // Run one immediate tick check so an idle world doesn't drift
  tick();
  timer = setInterval(tick, TICK_INTERVAL_MS);
  console.log("[tick] engine started, checking every 60s");
}

export function stopTickEngine() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function getWorld(): { currentWeek: number; lastTickAt: number; isPaused: number; tickSpeedMultiplier: number } {
  type Row = { currentWeek: number; lastTickAt: number; isPaused: number; tickSpeedMultiplier: number };
  return (
    prep<[], Row>(
      "SELECT currentWeek, lastTickAt, isPaused, tickSpeedMultiplier FROM world WHERE id = 'world'",
    ).get() ?? { currentWeek: 0, lastTickAt: Date.now(), isPaused: 0, tickSpeedMultiplier: 1 }
  );
}

function setWorld(week: number, now: number) {
  db.run(
    "UPDATE world SET currentWeek = ?, lastTickAt = ? WHERE id = 'world'",
    [week, now],
  );
}

function logEvent(
  countryId: string | null,
  week: number,
  kind: EventKind,
  message: string,
  payload: Record<string, unknown> = {},
) {
  const id = nanoid(12);
  db.run(
    `INSERT INTO events (id, countryId, week, kind, message, payloadJson, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, countryId, week, kind, message, JSON.stringify(payload), Date.now()],
  );
}

function tick() {
  const w = getWorld();
  if (w.isPaused) return;

  const now = Date.now();
  const effectiveMs = (now - w.lastTickAt) * (w.tickSpeedMultiplier ?? 1);
  const currentRealWeek = realMsToWeek(now - (w.lastTickAt === 0 ? 0 : 0));
  // Simple model: 1 game week per hour since lastTickAt
  const weeksElapsed = w.lastTickAt === 0 ? 0 : Math.floor(effectiveMs / REAL_MS_PER_GAME_WEEK);
  if (weeksElapsed <= 0) return;

  for (let i = 0; i < weeksElapsed; i++) {
    const newWeek = w.currentWeek + i + 1;
    advanceWeek(newWeek);
    setWorld(newWeek, now);
    logEvent(null, newWeek, "world-tick", `Week ${newWeek} (${weekToGameDate(newWeek)})`, {});
  }

  recordTick(weeksElapsed);
  console.log(`[tick] advanced ${weeksElapsed} week(s); now at week ${w.currentWeek + weeksElapsed}`);
}

function advanceWeek(week: number) {
  // 1. Update elections: any that are "scheduled" and week >= scheduled week move to "campaigning"
  const elections = prep<[number], { id: string; week: number; stage: string }>(
    "SELECT id, week, stage FROM elections WHERE week = ?",
  ).all(week);
  for (const e of elections) {
    if (e.stage === "scheduled") {
      db.run("UPDATE elections SET stage = 'campaigning' WHERE id = ?", [e.id]);
      logEvent(null, week, "election-scheduled", `Election ${e.id} enters campaign phase`, { electionId: e.id });
    }
  }

  // 2. Any elections in "voting" stage at this week get resolved
  const voting = prep<[], { id: string; officeId: string; candidatesJson: string }>(
    "SELECT id, officeId, candidatesJson FROM elections WHERE stage = 'voting'",
  ).all();
  for (const e of voting) {
    const cands = jsonGet<string[]>(e.candidatesJson, []);
    if (cands.length === 0) {
      // No candidates: stage stays voting; NPC will be seeded later
      continue;
    }
    resolveElection(e.id, e.officeId, cands, week);
  }

  // 3. Bills in committee → floor-vote after 2 weeks
  const committeeBills = prep<[], { id: string; countryId: string; proposedWeek: number }>(
    "SELECT id, countryId, proposedWeek FROM bills WHERE stage = 'committee'",
  ).all();
  for (const b of committeeBills) {
    if (week - b.proposedWeek >= 2) {
      db.run("UPDATE bills SET stage = 'floor-vote' WHERE id = ?", [b.id]);
    }
  }

  // 4. Bills in floor-vote get resolved this week (random outcome weighted by sponsor approval)
  const floorBills = prep<[], { id: string; countryId: string; sponsorPoliticianId: string; topic: string }>(
    "SELECT id, countryId, sponsorPoliticianId, topic FROM bills WHERE stage = 'floor-vote'",
  ).all();
  for (const b of floorBills) {
    const sponsor = prep<[string], { statsJson: string }>(
      "SELECT statsJson FROM politicians WHERE id = ?",
    ).get(b.sponsorPoliticianId);
    const stats = sponsor ? jsonGet<{ approval?: number; competence?: number }>(sponsor.statsJson, {}) : {};
    const passProb = ((stats.approval ?? 50) + (stats.competence ?? 50)) / 200; // 0-1
    const passes = Math.random() < passProb;
    db.run(
      `UPDATE bills SET stage = ?, signedWeek = ? WHERE id = ?`,
      [passes ? "signed" : "rejected", passes ? week : null, b.id],
    );
    logEvent(
      b.countryId,
      week,
      passes ? "bill-signed" : "bill-rejected",
      passes ? `Bill ${b.id} signed into law` : `Bill ${b.id} rejected`,
      { billId: b.id, topic: b.topic },
    );
  }

  // 5. Apply macro effects: each signed bill nudges macro stats by its effects
  const signedBills = prep<[], { id: string; countryId: string; effectsJson: string }>(
    "SELECT id, countryId, effectsJson FROM bills WHERE stage = 'signed'",
  ).all();
  for (const b of signedBills) {
    const effects = jsonGet<Array<{ metric: string; delta: number }>>(b.effectsJson, []);
    for (const eff of effects) {
      applyPolicyEffect(b.countryId, eff.metric, eff.delta);
    }
  }

  // 6. Drift approval baselines slightly toward 50 (mean reversion)
  const countries = prep<[], { id: string; approvalBaseline: number }>(
    "SELECT id, approvalBaseline FROM countries",
  ).all();
  for (const c of countries) {
    const next = c.approvalBaseline + (50 - c.approvalBaseline) * 0.01;
    db.run("UPDATE countries SET approvalBaseline = ?, updatedAt = ? WHERE id = ?", [next, week, c.id]);
  }
}

function applyPolicyEffect(countryId: string, metric: string, delta: number) {
  switch (metric) {
    case "gdp":
      db.run("UPDATE countries SET gdp = gdp + ? WHERE id = ?", [delta * 10, countryId]);
      break;
    case "unemployment":
      db.run("UPDATE countries SET unemploymentPct = unemploymentPct + ? WHERE id = ?", [delta, countryId]);
      break;
    case "inflation":
      db.run("UPDATE countries SET inflationPct = inflationPct + ? WHERE id = ?", [delta, countryId]);
      break;
    case "approval":
      db.run("UPDATE countries SET approvalBaseline = approvalBaseline + ? WHERE id = ?", [delta * 2, countryId]);
      break;
  }
}

function resolveElection(
  electionId: string,
  officeId: string,
  candidateIds: string[],
  week: number,
) {
  // Pull candidate approval; pick winner stochastically weighted by approval
  const rows = candidateIds.map((cid) => {
    const stats = prep<[string], { statsJson: string }>(
      "SELECT statsJson FROM politicians WHERE id = ?",
    ).get(cid);
    const approval = stats
      ? jsonGet<{ approval?: number }>(stats.statsJson, {}).approval ?? 50
      : 50;
    return { id: cid, approval };
  });
  const total = rows.reduce((s, r) => s + Math.max(1, r.approval), 0);
  const results = rows.map((r) => ({
    politicianId: r.id,
    voteShare: Math.max(1, r.approval) / total,
  }));
  const winner = results.reduce((a, b) => (a.voteShare > b.voteShare ? a : b));

  db.run(
    `UPDATE elections SET stage = 'certifying', resultsJson = ?, winnerId = ? WHERE id = ?`,
    [JSON.stringify(results), winner.politicianId, electionId],
  );
  db.run(
    "UPDATE politicians SET status = 'elected', officeId = ? WHERE id = ?",
    [officeId, winner.politicianId],
  );
  logEvent(null, week, "election-result", `Election ${electionId} decided`, {
    electionId,
    winnerId: winner.politicianId,
    shares: results,
  });
}