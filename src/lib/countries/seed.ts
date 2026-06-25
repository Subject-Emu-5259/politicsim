// Loads country configs from /data/countries/*.json and seeds the DB on first boot.
// Idempotent: re-running won't duplicate rows (we INSERT OR REPLACE).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db, prep } from "../db";
import type { CountryConfig } from "../game/types";

const COUNTRY_FILES = ["usa.json"];

export function loadCountryConfigs(): CountryConfig[] {
  return COUNTRY_FILES.map((file) => {
    const full = join(process.cwd(), "data", "countries", file);
    const raw = readFileSync(full, "utf-8");
    return JSON.parse(raw) as CountryConfig;
  });
}

export function seedCountries() {
  const configs = loadCountryConfigs();
  for (const c of configs) {
    db.run(
      `INSERT OR REPLACE INTO countries
        (id, code, name, configPath, gdp, population, unemploymentPct,
         inflationPct, approvalBaseline, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        c.id, c.code, c.name, c.configPath,
        c.gdp, c.population, c.unemploymentPct,
        c.inflationPct, c.approvalBaseline,
      ],
    );

    // Seed parties
    const partyUpsert = prep(
      `INSERT OR REPLACE INTO parties
        (id, countryId, name, shortName, color, ideology, leaderPoliticianId,
         memberCount, treasuryUSD, foundedWeek)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?, 0)`,
    );
    for (const p of c.parties) {
      partyUpsert.run(c.id, c.id, p.name, p.shortName, p.color, p.ideology, p.treasuryUSD);
    }

    // Seed demographics
    const demoUpsert = prep(
      `INSERT OR REPLACE INTO demographic_groups
        (id, countryId, name, populationShare, preferencesJson, approvalBaseline)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const d of c.demographics) {
      demoUpsert.run(
        c.id, c.id, d.name, d.populationShare,
        JSON.stringify(d.preferences ?? {}), d.approvalBaseline,
      );
    }

    // Seed offices (USA: 100 House seats + 50 states for senate + president)
    const officeUpsert = prep(
      `INSERT OR REPLACE INTO offices
        (id, countryId, type, name, region, seatCount, chamber, termLengthWeeks, nextElectionWeek)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const o of c.offices) {
      const officeId = `${c.id}-${o.type}-${slug(o.region)}`;
      officeUpsert.run(
        officeId, c.id, o.type, o.name, o.region, o.seatCount ?? 1,
        o.chamber, o.termLengthWeeks, o.termLengthWeeks, // first election at end of first term
      );
    }

    console.log(`[seed] country ${c.code} (${c.name}) loaded`);
  }
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function seedWorld(configs: CountryConfig[]): void {
  const insertCountry = prep<[string, string, string, string, number, number, number, number, number]>(
    `INSERT OR REPLACE INTO countries
      (id, code, name, configPath, gdp, population, unemploymentPct, inflationPct, approvalBaseline, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  );

  const insertParty = prep<[string, string, string, string, string, string, number]>(
    `INSERT OR REPLACE INTO parties
      (id, countryId, name, shortName, color, ideology, memberCount, treasuryUSD, foundedWeek)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0)`,
  );

  const insertOffice = prep<[string, string, string, string, string, number, string | null, number, number]>(
    `INSERT OR REPLACE INTO offices
      (id, countryId, type, name, region, seatCount, chamber, termLengthWeeks, nextElectionWeek)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const insertDemo = prep<[string, string, string, number, string, number]>(
    `INSERT OR REPLACE INTO demographic_groups
      (id, countryId, name, populationShare, preferencesJson, approvalBaseline)
      VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (const cfg of configs) {
    insertCountry.run(
      cfg.id, cfg.code, cfg.name, cfg.configPath,
      cfg.gdp, cfg.population, cfg.unemploymentPct, cfg.inflationPct, cfg.approvalBaseline,
    );

    for (const p of cfg.parties) {
      insertParty.run(
        `${cfg.id}-${p.id}`, cfg.id, p.name, p.shortName, p.color, p.ideology, p.treasuryUSD,
      );
    }

    for (const d of cfg.demographics) {
      insertDemo.run(
        `${cfg.id}-${d.id}`, cfg.id, d.name, d.populationShare,
        JSON.stringify(d.preferences ?? {}), d.approvalBaseline,
      );
    }

    for (const o of cfg.offices) {
      const id = `${cfg.id}-${o.type}-${o.region.toLowerCase().replace(/\s+/g, "-")}`;
      insertOffice.run(
        id, cfg.id, o.type, o.name, o.region,
        o.seatCount ?? 1, o.chamber, o.termLengthWeeks,
        o.termLengthWeeks, // first election one term out
      );
    }
  }
}