// Cabinet action pool management.
// Actions reset daily at midnight Eastern Time (UTC-5/UTC-4).

import { db, prep } from "../db";
import type { ID } from "../game/types";

export const CABINET_ACTION_CAP = 4;

/** Calculates the start of the current day in Eastern Time. */
export function getMidnightEastern(): number {
  const now = new Date();
  // Shift to UTC-5 (approximate, ignoring DST for simplicity or using a robust lib)
  const eastern = new Date(now.getTime() - (now.getTimezoneOffset() * 60000) - (5 * 3600000));
  eastern.setHours(0, 0, 0, 0);
  return eastern.getTime();
}

export function getCabinetActions(politicianId: ID): { remaining: number; lastResetAt: number } {
  const row = prep<[string], { remaining: number; lastResetAt: number }>(
    "SELECT remaining, lastResetAt FROM cabinet_actions WHERE politicianId = ?",
  ).get(politicianId);

  if (!row) {
    // Auto-initialize on first access
    const now = Date.now();
    db.run(
      "INSERT INTO cabinet_actions (politicianId, remaining, lastResetAt) VALUES (?, ?, ?)",
      [politicianId, CABINET_ACTION_CAP, now],
    );
    return { remaining: CABINET_ACTION_CAP, lastResetAt: now };
  }

  // Check if we need to reset based on wall clock
  const midnight = getMidnightEastern();
  if (row.lastResetAt < midnight) {
    db.run(
      "UPDATE cabinet_actions SET remaining = ?, lastResetAt = ? WHERE politicianId = ?",
      [CABINET_ACTION_CAP, midnight, politicianId],
    );
    return { remaining: CABINET_ACTION_CAP, lastResetAt: midnight };
  }

  return row;
}

export function consumeCabinetAction(politicianId: ID): { success: boolean; remaining: number } {
  const { remaining } = getCabinetActions(politicianId);
  if (remaining <= 0) return { success: false, remaining: 0 };

  db.run(
    "UPDATE cabinet_actions SET remaining = remaining - 1 WHERE politicianId = ?",
    [politicianId],
  );
  return { success: true, remaining: remaining - 1 };
}
