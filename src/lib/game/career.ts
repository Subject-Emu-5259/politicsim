// Career history logging + achievement system.
// Every meaningful politician action gets logged to career_history,
// and milestones trigger achievements.

import { db, prep } from "../db";
import { nanoid } from "nanoid";
import { realMsToWeek } from "../game/types";

export interface CareerEntry {
  id: string;
  politicianId: string;
  week: number;
  kind: string;
  title: string;
  description: string;
  metadataJson: string;
  createdAt: number;
}

export interface Achievement {
  id: string;
  politicianId: string;
  kind: string;
  title: string;
  description: string;
  unlockedAt: number;
}

/** Log a career event for a politician. */
export function logCareer(
  politicianId: string,
  kind: string,
  title: string,
  description: string,
  metadata: Record<string, unknown> = {},
): void {
  const id = nanoid(12);
  const now = Date.now();
  const week = realMsToWeek(now);
  db.run(
    `INSERT INTO career_history (id, politicianId, week, kind, title, description, metadataJson, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, politicianId, week, kind, title, description, JSON.stringify(metadata), now],
  );
}

/** Log an action taken by a politician (for the Actions page history). */
export function logAction(
  politicianId: string,
  action: string,
  result: string,
  statsBefore: Record<string, number> | null,
  statsAfter: Record<string, number> | null,
): void {
  const id = nanoid(12);
  const now = Date.now();
  const week = realMsToWeek(now);
  db.run(
    `INSERT INTO action_log (id, politicianId, action, result, week, statsBeforeJson, statsAfterJson, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, politicianId, action, result, week, statsBefore ? JSON.stringify(statsBefore) : null, statsAfter ? JSON.stringify(statsAfter) : null, now],
  );
}

// ─────────────────────────────────────────────
// Achievement definitions
// ─────────────────────────────────────────────

interface AchievementDef {
  kind: string;
  title: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  politicianId: string;
  stats: Record<string, number>;
  status: string;
  officeId: string | null;
  rallyCount: number;
  fundraiserCount: number;
  billCount: number;
  electionWins: number;
  actionCount: number;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    kind: "first-rally",
    title: "First Rally",
    description: "Held your first campaign rally.",
    check: (c) => c.rallyCount >= 1,
  },
  {
    kind: "first-fundraise",
    title: "Show Me The Money",
    description: "Raised your first campaign funds.",
    check: (c) => c.fundraiserCount >= 1,
  },
  {
    kind: "first-bill",
    title: "Legislator",
    description: "Proposed your first bill.",
    check: (c) => c.billCount >= 1,
  },
  {
    kind: "elected",
    title: "The People Have Spoken",
    description: "Won your first election.",
    check: (c) => c.electionWins >= 1,
  },
  {
    kind: "war-chest-100k",
    title: "Big Spender",
    description: "Accumulated $100k in your war chest.",
    check: (c) => c.stats.fundraising >= 100_000,
  },
  {
    kind: "approval-70",
    title: "Beloved",
    description: "Reached 70% approval rating.",
    check: (c) => c.stats.approval >= 70,
  },
  {
    kind: "stamina-max",
    title: "Energizer",
    description: "Maintained max stamina (100).",
    check: (c) => c.stats.stamina >= 100,
  },
  {
    kind: "action-junkie",
    title: "Action Junkie",
    description: "Took 25 total actions.",
    check: (c) => c.actionCount >= 25,
  },
  {
    kind: "bill-machine",
    title: "Bill Machine",
    description: "Proposed 10 bills.",
    check: (c) => c.billCount >= 10,
  },
  {
    kind: "rally-master",
    title: "Rally Master",
    description: "Held 10 campaign rallies.",
    check: (c) => c.rallyCount >= 10,
  },
];

/** Check all achievements for a politician and unlock any newly-earned ones. */
export function checkAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    // Check if already unlocked
    const existing = prep<[string, string], { id: string }>(
      "SELECT id FROM achievements WHERE politicianId = ? AND kind = ?",
    ).get(ctx.politicianId, def.kind);
    if (existing) continue;
    if (def.check(ctx)) {
      const id = nanoid(12);
      db.run(
        `INSERT INTO achievements (id, politicianId, kind, title, description, unlockedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, ctx.politicianId, def.kind, def.title, def.description, Date.now()],
      );
      unlocked.push(def.kind);
      logCareer(ctx.politicianId, "achievement", def.title, def.description, { kind: def.kind });
    }
  }
  return unlocked;
}

/** Get career history for a politician, newest first. */
export function getCareerHistory(politicianId: string, limit = 50): CareerEntry[] {
  return prep<[string, number], CareerEntry>(
    "SELECT id, politicianId, week, kind, title, description, metadataJson, createdAt FROM career_history WHERE politicianId = ? ORDER BY createdAt DESC LIMIT ?",
  ).all(politicianId, limit);
}

/** Get achievements for a politician. */
export function getAchievements(politicianId: string): Achievement[] {
  return prep<[string], Achievement>(
    "SELECT id, politicianId, kind, title, description, unlockedAt FROM achievements WHERE politicianId = ? ORDER BY unlockedAt DESC",
  ).all(politicianId);
}

/** Get action log for a politician, newest first. */
export function getActionLog(politicianId: string, limit = 30): Array<{
  id: string; politicianId: string; action: string; result: string; week: number;
  statsBeforeJson: string | null; statsAfterJson: string | null; createdAt: number;
}> {
  return prep<[string, number], any>(
    "SELECT id, politicianId, action, result, week, statsBeforeJson, statsAfterJson, createdAt FROM action_log WHERE politicianId = ? ORDER BY createdAt DESC LIMIT ?",
  ).all(politicianId, limit);
}

/** Count actions by type for a politician. */
export function getActionCounts(politicianId: string): Record<string, number> {
  const rows = prep<[string], { action: string; c: number }>(
    "SELECT action, COUNT(*) as c FROM action_log WHERE politicianId = ? GROUP BY action",
  ).all(politicianId);
  const map: Record<string, number> = {};
  for (const r of rows) map[r.action] = r.c;
  return map;
}

/** Build the full achievement context for a politician. */
export function buildAchievementContext(politicianId: string): AchievementContext {
  const pol = prep<[string], { statsJson: string; status: string; officeId: string | null }>(
    "SELECT statsJson, status, officeId FROM politicians WHERE id = ?",
  ).get(politicianId);
  if (!pol) throw new Error("Politician not found");
  const stats = JSON.parse(pol.statsJson);
  const counts = getActionCounts(politicianId);
  return {
    politicianId,
    stats,
    status: pol.status,
    officeId: pol.officeId,
    rallyCount: counts.rally ?? 0,
    fundraiserCount: counts.fundraise ?? 0,
    billCount: counts["propose-bill"] ?? 0,
    electionWins: getElectionWins(politicianId),
    actionCount: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

/** Count election wins for a politician. */
export function getElectionWins(politicianId: string): number {
  const row = prep<[string], { c: number }>(
    "SELECT COUNT(*) as c FROM elections WHERE winnerId = ? AND stage = 'certifying'",
  ).get(politicianId);
  return row?.c ?? 0;
}
