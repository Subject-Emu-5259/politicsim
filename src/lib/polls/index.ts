// Polling engine. Once per game week, samples a snapshot of public opinion on
// each policy topic in each country. Used by the Polls page and as a leading
// indicator for the tick engine (AHD's Wire ticker draws from this same idea).
//
// Design notes:
// - Polls are *descriptive*, not *prescriptive*: they report current approval on
//   each topic, not what the policy outcome should be.
// - "Approval" here is the approval delta on the topic if a bill of that topic
//   were signed, weighted by demographic preference + current approval baseline.
// - sample size + margin of error are cosmetic for now but reserve space for
//   future sampling noise / pollster-quality mechanics.

import { db, prep, jsonGet } from "../db";
import { nanoid } from "nanoid";
import type { PolicyTopic } from "../game/types";

const TOPICS: PolicyTopic[] = [
  "economy",
  "healthcare",
  "education",
  "environment",
  "immigration",
  "defense",
  "civil-rights",
  "taxation",
  "housing",
  "transportation",
  "foreign-affairs",
  "crime",
];

const DEFAULT_SAMPLE_SIZE = 1000;
const DEFAULT_MARGIN = 3.0; // ±3% for a national poll of 1000

type DemoRow = {
  populationShare: number;
  preferencesJson: string;
};

export function samplePolls(week: number): number {
  const countries = db
    .query<{ id: string }, []>("SELECT id FROM countries")
    .all();
  const insert = db.prepare(
    "INSERT INTO polls (id, countryId, week, topic, optionsJson, sampleSize, marginOfError) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const demoStmt = db.prepare<DemoRow, [string]>(
    "SELECT populationShare, preferencesJson FROM demographic_groups WHERE countryId = ?",
  );
  const countryStmt = db.prepare<{ approvalBaseline: number }, [string]>(
    "SELECT approvalBaseline FROM countries WHERE id = ?",
  );

  let written = 0;
  for (const { id: countryId } of countries) {
    const country = countryStmt.get(countryId);
    if (!country) continue;
    const demos = demoStmt.all(countryId);
    if (demos.length === 0) continue;

    for (const topic of TOPICS) {
      // Weighted approval on this topic.
      // Start at country baseline, then for each demographic, shift by their
      // preference on the topic (each pref is 0..1, where 0.5 is neutral).
      let approval = country.approvalBaseline;
      for (const demo of demos) {
        const prefs = JSON.parse(demo.preferencesJson) as Partial<
          Record<PolicyTopic, number>
        >;
        const pref = prefs[topic];
        if (pref === undefined) continue;
        // pref of 0.5 = neutral, 1 = strongly approve, 0 = strongly disapprove
        const normalized = (pref - 0.5) * 20; // ±10 approval points at extremes
        approval += normalized * demo.populationShare;
      }
      approval = Math.max(0, Math.min(100, approval));

      const opposing = 100 - approval;
      insert.run(
        nanoid(12),
        countryId,
        week,
        topic,
        JSON.stringify({
          approve: Number(approval.toFixed(1)),
          disapprove: Number(opposing.toFixed(1)),
          undecided: 0,
        }),
        DEFAULT_SAMPLE_SIZE,
        DEFAULT_MARGIN,
      );
      written++;
    }
  }

  return written;
}
