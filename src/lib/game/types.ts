// Core domain types for PolitySim
// These are the canonical shapes used across the API, the tick engine, and the React UI.

export type ID = string;

// ─────────────────────────────────────────────────────────────
// Time
// ─────────────────────────────────────────────────────────────

export interface GameTime {
  /** Total real milliseconds since the world started. */
  realMs: number;
  /** Game week number since the world started (0-indexed). */
  week: number;
  /** ISO calendar date in the simulated world. */
  gameDate: string;
}

export const REAL_MS_PER_GAME_WEEK = 60 * 60 * 1000; // 1 real hour = 1 game week

export function realMsToWeek(realMs: number): number {
  return Math.floor(realMs / REAL_MS_PER_GAME_WEEK);
}

export function weekToGameDate(week: number, startYear = 2024): string {
  const totalDays = week * 7;
  const start = new Date(Date.UTC(startYear, 0, 1));
  const d = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────
// World
// ─────────────────────────────────────────────────────────────

export interface Country {
  id: ID;
  code: string; // ISO-3166-1 alpha-2
  name: string;
  configPath: string; // relative to /data/countries
  // Snapshot of headline macro stats
  gdp: number; // USD, billions
  population: number;
  unemploymentPct: number;
  inflationPct: number;
  approvalBaseline: number; // 0-100
  updatedAt: number; // game week
}

export interface WorldState {
  id: "world";
  currentWeek: number;
  lastTickAt: number; // real ms
  isPaused: boolean;
  tickSpeedMultiplier: number; // default 1
}

// ─────────────────────────────────────────────────────────────
// Users, Politicians
// ─────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin";

export interface User {
  id: ID;
  email: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  createdAt: number;
}

export type Ideology =
  | "far-left"
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right"
  | "far-right";

export interface PartyConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  ideology: Ideology;
  treasuryUSD: number;
}

export interface DemographicConfig {
  id: string;
  name: string;
  populationShare: number;
  preferences: Partial<Record<PolicyTopic, number>>;
  approvalBaseline: number;
}

export interface OfficeConfig {
  type: string;
  name: string;
  region: string;
  chamber: string | null;
  termLengthWeeks: number;
  seatCount: number;
}

export interface CountryConfig {
  id: string;
  code: string;
  name: string;
  configPath: string;
  gdp: number;
  population: number;
  unemploymentPct: number;
  inflationPct: number;
  approvalBaseline: number;
  parties: PartyConfig[];
  demographics: DemographicConfig[];
  offices: OfficeConfig[];
}

export type PoliticianStatus =
  | "private"        // created but not yet in public politics
  | "campaigning"    // declared candidacy
  | "elected"        // currently holds office
  | "out-of-office"  // previously held office
  | "defeated"       // lost election
  | "retired";

export interface Politician {
  id: ID;
  ownerUserId: ID; // human player who created them (NPCs use a synthetic user id)
  countryId: ID;
  name: string;
  partyId: ID | null;
  ideology: Ideology;
  status: PoliticianStatus;
  officeId: ID | null; // current office, if any
  homeRegion: string; // e.g. "California", "London"
  demographics: {
    age: number;
    gender: "male" | "female" | "nonbinary";
    ethnicity: string;
  };
  stats: {
    charisma: number;     // 0-100, affects campaigns
    competence: number;   // 0-100, affects legislation
    integrity: number;    // 0-100, affects scandals
    stamina: number;      // 0-100, declines with activity
    approval: number;     // 0-100, public perception
    fundraising: number;  // USD
  };
  createdAt: number; // game week
  portraitUrl: string | null;
}

// ─────────────────────────────────────────────────────────────
// Parties
// ─────────────────────────────────────────────────────────────

export interface Party {
  id: ID;
  countryId: ID;
  name: string;
  shortName: string;
  color: string; // hex
  ideology: Ideology;
  leaderPoliticianId: ID | null;
  memberCount: number;
  treasuryUSD: number;
  foundedWeek: number;
}

// ─────────────────────────────────────────────────────────────
// Offices, Elections
// ─────────────────────────────────────────────────────────────

export type OfficeType =
  | "us-house" | "us-senate" | "us-president" | "us-governor"
  | "uk-mp"   | "uk-pm"
  | "jp-shr"  | "jp-pm";

export interface Office {
  id: ID;
  countryId: ID;
  type: OfficeType;
  name: string; // e.g. "California 12th Congressional District"
  region: string;
  seatCount: number; // 1 for most offices
  chamber: string | null; // "House", "Senate", "Cabinet", etc.
  termLengthWeeks: number;
  nextElectionWeek: number;
}

export type ElectionStage = "scheduled" | "campaigning" | "voting" | "certifying" | "complete";

export interface Election {
  id: ID;
  officeId: ID;
  countryId: ID;
  week: number;
  stage: ElectionStage;
  candidates: ID[]; // politician ids
  results: {
    politicianId: ID;
    voteShare: number; // 0-1
  }[];
  winnerId: ID | null;
}

// ─────────────────────────────────────────────────────────────
// Legislation
// ─────────────────────────────────────────────────────────────

export type BillStage =
  | "drafted"        // sponsor only
  | "introduced"     // open for co-sponsors
  | "committee"      // in committee review
  | "floor-vote"     // up for chamber vote
  | "passed"         // passed one chamber
  | "rejected"       // failed vote
  | "signed"         // enacted into law
  | "vetoed";

export type PolicyTopic =
  | "economy" | "healthcare" | "education" | "environment"
  | "immigration" | "defense" | "civil-rights" | "taxation"
  | "housing" | "transportation" | "foreign-affairs" | "crime";

export interface Bill {
  id: ID;
  countryId: ID;
  sponsorPoliticianId: ID;
  title: string;
  summary: string;
  topic: PolicyTopic;
  stage: BillStage;
  proposedWeek: number;
  coSponsors: ID[];
  votesFor: ID[];
  votesAgainst: ID[];
  abstentions: ID[];
  effects: PolicyEffect[];
  signedWeek: number | null;
}

export interface PolicyEffect {
  metric:
    | "gdp" | "unemployment" | "inflation"
    | "approval" | "crime" | "environment"
    | "health" | "education" | "inequality";
  /** Magnitude in standard units of the metric, per game week the law is in force. */
  delta: number;
  /** Which demographic groups are affected. Empty = all. */
  affectedGroups: string[];
}

// ─────────────────────────────────────────────────────────────
// Demographics, polling
// ─────────────────────────────────────────────────────────────

export interface DemographicGroup {
  id: ID;
  countryId: ID;
  name: string; // e.g. "Urban professionals", "Rural workers"
  populationShare: number; // 0-1
  // Issue preferences, -1 (opposed) to +1 (strongly in favor)
  preferences: Partial<Record<PolicyTopic, number>>;
  // Baseline approval of the ruling party / coalition
  approvalBaseline: number;
}

export interface Poll {
  id: ID;
  countryId: ID;
  week: number;
  topic: "party-approval" | "president-approval" | "pm-approval" | "election";
  options: { id: string; label: string; share: number }[];
  sampleSize: number;
  marginOfError: number;
}

// ─────────────────────────────────────────────────────────────
// Activity log
// ─────────────────────────────────────────────────────────────

export type EventKind =
  | "election-scheduled" | "election-result"
  | "bill-introduced" | "bill-passed" | "bill-rejected" | "bill-signed"
  | "party-formed" | "politician-joined" | "politician-left"
  | "scandal" | "rally" | "coalition-formed" | "world-tick";

export interface GameEvent {
  id: ID;
  countryId: ID | null;
  week: number;
  kind: EventKind;
  message: string;
  payload: Record<string, JSONValue>;
  payloadJson: string;
  createdAt: number;
}

type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };

// ─────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────

export interface AuthSession {
  userId: ID;
  email: string;
  role: UserRole;
}

export interface ApiError {
  error: string;
  code?: string;
}
