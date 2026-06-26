// NPC politician generator — creates synthetic AI-driven politicians to fill
// the world. Each NPC belongs to a synthetic "system" user so they can be
// queried alongside human-owned politicians.

import { nanoid } from "nanoid";
import { db } from "../db";
import { realMsToWeek } from "../game/types";

const SYSTEM_USER_ID = "system-npc";

const FIRST_NAMES_M = [
  "James", "Robert", "John", "Michael", "David", "William", "Richard",
  "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Mark", "Steven",
  "Andrew", "Kenneth", "Paul", "Kevin", "Brian", "Edward", "Ronald",
];
const FIRST_NAMES_F = [
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan",
  "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Sandra", "Ashley", "Kimberly",
  "Emily", "Donna", "Michelle", "Carol", "Amanda", "Melissa", "Deborah",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson",
  "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez",
  "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis",
];
const REGIONS_US = [
  "California", "Texas", "New York", "Florida", "Illinois", "Pennsylvania",
  "Ohio", "Georgia", "North Carolina", "Michigan", "Virginia", "Washington",
  "Arizona", "Massachusetts", "Tennessee", "Indiana", "Missouri", "Maryland",
];
const ETHNICITIES = ["White", "Black", "Hispanic", "Asian", "Mixed"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName(): { name: string; gender: "male" | "female" } {
  const gender = Math.random() < 0.5 ? "male" : "female";
  const first = gender === "male" ? rand(FIRST_NAMES_M) : rand(FIRST_NAMES_F);
  const last = rand(LAST_NAMES);
  return { name: `${first} ${last}`, gender };
}

function ideologyForParty(partyIdeology: string): string {
  // Slight variation around party ideology
  const map: Record<string, string[]> = {
    "far-left": ["far-left", "left"],
    "left": ["left", "far-left", "center-left"],
    "center-left": ["center-left", "left", "center"],
    "center": ["center", "center-left", "center-right"],
    "center-right": ["center-right", "right", "center"],
    "right": ["right", "center-right", "far-right"],
    "far-right": ["far-right", "right"],
  };
  return rand(map[partyIdeology] ?? ["center"]);
}

function generateStats(quality: "backbencher" | "mid-tier" | "elite") {
  const base = quality === "elite" ? 65 : quality === "mid-tier" ? 55 : 45;
  const spread = quality === "elite" ? 25 : 20;
  return {
    charisma: Math.min(100, randInt(base, base + spread)),
    competence: Math.min(100, randInt(base, base + spread)),
    integrity: Math.min(100, randInt(base - 5, base + spread - 5)),
    stamina: randInt(70, 100),
    approval: randInt(35, 65),
    fundraising: quality === "elite" ? randInt(50_000, 500_000) : randInt(0, 50_000),
  };
}

interface PartyRow {
  id: string;
  ideology: string;
}

interface OfficeRow {
  id: string;
  type: string;
  name: string;
  region: string;
  chamber: string | null;
  seatCount: number;
  termLengthWeeks: number;
  nextElectionWeek: number;
}

function ensureSystemUser() {
  const existing = db
    .query("SELECT id FROM users WHERE id = ?")
    .get(SYSTEM_USER_ID);
  if (!existing) {
    db.run(
      "INSERT INTO users (id, email, displayName, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, 'admin', ?)",
      [SYSTEM_USER_ID, "system@npc.politysim", "NPC System", "!", Date.now()],
    );
  }
}

export function seedNpcPoliticians(countryId: string, parties: PartyRow[], offices: OfficeRow[], count = 40) {
  ensureSystemUser();
  const now = realMsToWeek(Date.now());

  for (let i = 0; i < count; i++) {
    const party = rand(parties);
    const { name, gender } = generateName();
    const ideology = ideologyForParty(party.ideology);
    const quality = Math.random() < 0.15 ? "elite" : Math.random() < 0.5 ? "mid-tier" : "backbencher";
    const stats = generateStats(quality);
    const region = rand(REGIONS_US);
    const age = randInt(32, 75);
    const ethnicity = rand(ETHNICITIES);
    const id = nanoid(14);

    db.run(
      `INSERT INTO politicians (id, ownerUserId, countryId, name, partyId, ideology, status, officeId, homeRegion, demographicsJson, statsJson, createdAt, portraitUrl)
       VALUES (?, ?, ?, ?, ?, ?, 'private', NULL, ?, ?, ?, ?, NULL)`,
      [
        id,
        SYSTEM_USER_ID,
        countryId,
        name,
        party.id,
        ideology,
        region,
        JSON.stringify({ age, gender, ethnicity }),
        JSON.stringify(stats),
        now,
      ],
    );
  }

  console.log(`[npc] seeded ${count} NPC politicians for ${countryId}`);
}
