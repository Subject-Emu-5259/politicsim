// Loads country configs from /data/countries/*.json and seeds the DB on first boot.
// Uses INSERT OR IGNORE (NOT REPLACE) to avoid cascade-deleting politicians/parties/offices
// on restart. REPLACE = DELETE + INSERT, which triggers ON DELETE CASCADE and wipes all
// child rows (politicians, bills, elections, etc).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db, prep } from "../db";
import type { CountryConfig } from "../game/types";
import { seedNpcPoliticians } from "../game/npc";

const COUNTRY_FILES = ["usa.json"];

export function loadCountryConfigs(): CountryConfig[] {
  return COUNTRY_FILES.map((file) => {
    const full = join(process.cwd(), "data", "countries", file);
    const raw = readFileSync(full, "utf-8");
    return JSON.parse(raw) as CountryConfig;
  });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function seedWorld(configs: CountryConfig[]): void {
  // Use INSERT OR IGNORE — if the row exists, skip it. Never DELETE existing rows.
  const insertCountry = prep<[string, string, string, string, number, number, number, number, number]>(
    `INSERT OR IGNORE INTO countries
      (id, code, name, configPath, gdp, population, unemploymentPct, inflationPct, approvalBaseline, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  );

  const insertParty = prep<[string, string, string, string, string, string, number]>(
    `INSERT OR IGNORE INTO parties
      (id, countryId, name, shortName, color, ideology, memberCount, treasuryUSD, foundedWeek)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0)`,
  );

  const insertOffice = prep<[string, string, string, string, string, number, string | null, number, number]>(
    `INSERT OR IGNORE INTO offices
      (id, countryId, type, name, region, seatCount, chamber, termLengthWeeks, nextElectionWeek)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const insertDemo = prep<[string, string, string, number, string, number]>(
    `INSERT OR IGNORE INTO demographic_groups
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
      const id = `${cfg.id}-${o.type}-${slug(o.region)}`;
      insertOffice.run(
        id, cfg.id, o.type, o.name, o.region,
        o.seatCount ?? 1, o.chamber, o.termLengthWeeks,
        o.termLengthWeeks,
      );
    }
  }
}

export function seedNpcs(): void {
  const npcCount = db
    .query<{ c: number }, []>("SELECT COUNT(*) as c FROM politicians WHERE ownerUserId = 'system-npc'")
    .get();
  if (npcCount && npcCount.c > 0) return;

  for (const cfg of loadCountryConfigs()) {
    const parties = db
      .query<{ id: string; ideology: string }, [string]>("SELECT id, ideology FROM parties WHERE countryId = ?")
      .all(cfg.id);
    const offices = db
      .query("SELECT id, type, name, region, chamber, seatCount, termLengthWeeks, nextElectionWeek FROM offices WHERE countryId = ?")
      .all(cfg.id) as any[];
    seedNpcPoliticians(cfg.id, parties, offices, 40);
  }

  const cabinetOffices = db.query("SELECT id, countryId FROM offices WHERE type = 'cabinet'").all() as any[];
  for (const office of cabinetOffices) {
    const topNpc = db
      .query<{ id: string }, [string]>("SELECT id FROM politicians WHERE countryId = ? AND ownerUserId = 'system-npc' ORDER BY (statsJson) DESC LIMIT 1")
      .get(office.countryId);
    if (topNpc) {
      db.run("UPDATE politicians SET officeId = ?, status = 'elected' WHERE id = ?", [office.id, topNpc.id]);
      db.run("INSERT OR IGNORE INTO cabinet_actions (politicianId, remaining, lastResetAt) VALUES (?, 4, ?)", [topNpc.id, Date.now()]);
    }
  }
}
