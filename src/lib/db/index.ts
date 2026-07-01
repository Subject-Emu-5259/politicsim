// Bun-native SQLite database. Single connection, WAL mode for concurrency.
// Migrations run on first connect; safe to re-run.

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SQLQueryBindings } from "bun:sqlite";

const DB_PATH = process.env.POLITYSIM_DB ?? "/home/workspace/politicsim/data/politicsim.sqlite";

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA synchronous = NORMAL;");

const SCHEMA_VERSION = 3;

const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        displayName TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);

      CREATE TABLE IF NOT EXISTS world (
        id TEXT PRIMARY KEY,
        currentWeek INTEGER NOT NULL DEFAULT 0,
        lastTickAt INTEGER NOT NULL DEFAULT 0,
        isPaused INTEGER NOT NULL DEFAULT 0,
        tickSpeedMultiplier REAL NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS countries (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        configPath TEXT NOT NULL,
        gdp REAL NOT NULL DEFAULT 0,
        population INTEGER NOT NULL DEFAULT 0,
        unemploymentPct REAL NOT NULL DEFAULT 0,
        inflationPct REAL NOT NULL DEFAULT 0,
        approvalBaseline REAL NOT NULL DEFAULT 50,
        updatedAt INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS parties (
        id TEXT PRIMARY KEY,
        countryId TEXT NOT NULL,
        name TEXT NOT NULL,
        shortName TEXT NOT NULL,
        color TEXT NOT NULL,
        ideology TEXT NOT NULL,
        leaderPoliticianId TEXT,
        memberCount INTEGER NOT NULL DEFAULT 0,
        treasuryUSD REAL NOT NULL DEFAULT 0,
        foundedWeek INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (countryId) REFERENCES countries(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_parties_country ON parties(countryId);

      CREATE TABLE IF NOT EXISTS politicians (
        id TEXT PRIMARY KEY,
        ownerUserId TEXT NOT NULL,
        countryId TEXT NOT NULL,
        name TEXT NOT NULL,
        partyId TEXT,
        ideology TEXT NOT NULL,
        status TEXT NOT NULL,
        officeId TEXT,
        homeRegion TEXT NOT NULL,
        demographicsJson TEXT NOT NULL,
        statsJson TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        portraitUrl TEXT,
        FOREIGN KEY (countryId) REFERENCES countries(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_politicians_owner ON politicians(ownerUserId);
      CREATE INDEX IF NOT EXISTS idx_politicians_country ON politicians(countryId);
      CREATE INDEX IF NOT EXISTS idx_politicians_party ON politicians(partyId);

      CREATE TABLE IF NOT EXISTS offices (
        id TEXT PRIMARY KEY,
        countryId TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        region TEXT NOT NULL,
        seatCount INTEGER NOT NULL DEFAULT 1,
        chamber TEXT,
        termLengthWeeks INTEGER NOT NULL,
        nextElectionWeek INTEGER NOT NULL,
        FOREIGN KEY (countryId) REFERENCES countries(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_offices_country ON offices(countryId);

      CREATE TABLE IF NOT EXISTS elections (
        id TEXT PRIMARY KEY,
        officeId TEXT NOT NULL,
        countryId TEXT NOT NULL,
        week INTEGER NOT NULL,
        stage TEXT NOT NULL,
        candidatesJson TEXT NOT NULL,
        resultsJson TEXT NOT NULL DEFAULT '[]',
        winnerId TEXT,
        FOREIGN KEY (officeId) REFERENCES offices(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_elections_country_week ON elections(countryId, week);

      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        countryId TEXT NOT NULL,
        sponsorPoliticianId TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        topic TEXT NOT NULL,
        stage TEXT NOT NULL,
        proposedWeek INTEGER NOT NULL,
        coSponsorsJson TEXT NOT NULL DEFAULT '[]',
        votesForJson TEXT NOT NULL DEFAULT '[]',
        votesAgainstJson TEXT NOT NULL DEFAULT '[]',
        abstentionsJson TEXT NOT NULL DEFAULT '[]',
        effectsJson TEXT NOT NULL DEFAULT '[]',
        signedWeek INTEGER,
        FOREIGN KEY (countryId) REFERENCES countries(id) ON DELETE CASCADE,
        FOREIGN KEY (sponsorPoliticianId) REFERENCES politicians(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_bills_country_stage ON bills(countryId, stage);

      CREATE TABLE IF NOT EXISTS demographic_groups (
        id TEXT PRIMARY KEY,
        countryId TEXT NOT NULL,
        name TEXT NOT NULL,
        populationShare REAL NOT NULL,
        preferencesJson TEXT NOT NULL,
        approvalBaseline REAL NOT NULL,
        FOREIGN KEY (countryId) REFERENCES countries(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_demographics_country ON demographic_groups(countryId);

      CREATE TABLE IF NOT EXISTS polls (
        id TEXT PRIMARY KEY,
        countryId TEXT NOT NULL,
        week INTEGER NOT NULL,
        topic TEXT NOT NULL,
        optionsJson TEXT NOT NULL,
        sampleSize INTEGER NOT NULL,
        marginOfError REAL NOT NULL,
        FOREIGN KEY (countryId) REFERENCES countries(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_polls_country_week ON polls(countryId, week);

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        countryId TEXT,
        week INTEGER NOT NULL,
        kind TEXT NOT NULL,
        message TEXT NOT NULL,
        payloadJson TEXT NOT NULL DEFAULT '{}',
        createdAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_week ON events(week);
      CREATE INDEX IF NOT EXISTS idx_events_country ON events(countryId, week);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS cabinet_actions (
        politicianId TEXT PRIMARY KEY,
        remaining INTEGER NOT NULL DEFAULT 4,
        lastResetAt INTEGER NOT NULL,
        FOREIGN KEY (politicianId) REFERENCES politicians(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_cabinet_reset ON cabinet_actions(lastResetAt);
    `,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS career_history (
        id TEXT PRIMARY KEY,
        politicianId TEXT NOT NULL,
        week INTEGER NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        metadataJson TEXT NOT NULL DEFAULT '{}',
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (politicianId) REFERENCES politicians(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_career_pol ON career_history(politicianId, week);

      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        politicianId TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        unlockedAt INTEGER NOT NULL,
        FOREIGN KEY (politicianId) REFERENCES politicians(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ach_pol ON achievements(politicianId);

      CREATE TABLE IF NOT EXISTS action_log (
        id TEXT PRIMARY KEY,
        politicianId TEXT NOT NULL,
        action TEXT NOT NULL,
        result TEXT NOT NULL,
        week INTEGER NOT NULL,
        statsBeforeJson TEXT,
        statsAfterJson TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (politicianId) REFERENCES politicians(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_actionlog_pol ON action_log(politicianId, createdAt);
    `,
  },
  {
    // Sprint 10: currency normalization + tick hardening.
    // AHD's foreign-currency bug (changelog 2024-12-20): live FX rate was used to convert
    // historical treasury/fundraising values, so reviewing a country's ledger in a
    // different base currency gave different numbers than the source currency. Fix: snapshot
    // a per-week FX rate so conversions are deterministic and historical.
    version: 4,
    sql: `
      CREATE TABLE IF NOT EXISTS currencies (
        code TEXT PRIMARY KEY,           -- ISO 4217, e.g. 'USD', 'GBP', 'JPY'
        name TEXT NOT NULL,
        symbol TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS country_currency (
        countryId TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        FOREIGN KEY (countryId) REFERENCES countries(id) ON DELETE CASCADE,
        FOREIGN KEY (code) REFERENCES currencies(code)
      );

      -- One row per (currency, week). Used to convert any historical monetary value.
      CREATE TABLE IF NOT EXISTS fx_rates (
        code TEXT NOT NULL,
        week INTEGER NOT NULL,
        usdPerUnit REAL NOT NULL,        -- how many USD 1 unit of code was worth that week
        PRIMARY KEY (code, week)
      );
      CREATE INDEX IF NOT EXISTS idx_fx_week ON fx_rates(week);

      -- Seed reference currencies + a single base rate row (week 0) for each.
      -- Tick engine will append a new row per code per week going forward.
      INSERT OR IGNORE INTO currencies (code, name, symbol) VALUES
        ('USD', 'United States Dollar', '$'),
        ('GBP', 'Pound Sterling', '£'),
        ('JPY', 'Japanese Yen', '¥');

      -- Initial rate snapshot: 1 USD = 1 USD, 1 GBP = 1.27 USD, 1 JPY = 0.0067 USD
      -- (approximate Q2 2026 levels — these update weekly via tick).
      INSERT OR IGNORE INTO fx_rates (code, week, usdPerUnit) VALUES
        ('USD', 0, 1.0),
        ('GBP', 0, 1.27),
        ('JPY', 0, 0.0067);

      INSERT OR IGNORE INTO country_currency (countryId, code) VALUES ('usa', 'USD');
    `,
  },
];

export function runMigrations() {
  let current = 0;
  try {
    const row = db
      .query<{ value: string }, []>("SELECT value FROM meta WHERE key = 'schema_version'")
      .get();
    current = row ? parseInt(row.value, 10) : 0;
  } catch {
    // 'meta' table doesn't exist yet — first boot, treat as version 0.
  }
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      db.exec(m.sql);
      db.run(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        ["schema_version", String(m.version)],
      );
      console.log(`[db] applied migration v${m.version}`);
    }
  }
}

runMigrations();

// Helper: prepared statement wrapper
export function prep<Args extends SQLQueryBindings[], Row = unknown>(sql: string) {
  const stmt = db.prepare<Row, Args>(sql);
  return stmt;
}

// Generic JSON helpers
export function jsonGet<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
