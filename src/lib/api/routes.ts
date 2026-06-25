// All HTTP API routes for PolitySim. Mounted in server.ts under /api/*.

import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db, prep, jsonGet } from "../db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  getUserFromSession,
  requireAuth,
  getUserByEmail,
  getUserById,
  createUser,
} from "../auth";
import type {
  Politician, Bill, Election, Party, DemographicGroup, Country, GameEvent,
} from "../game/types";
import { realMsToWeek, weekToGameDate } from "../game/types";
import { subscribe } from "../metrics/emitter";

const api = new Hono();

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

api.post("/auth/register", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; displayName?: string }>();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const displayName = (body.displayName ?? "").trim();
  if (!email || !password || !displayName) return c.json({ error: "Missing fields" }, 400);
  if (password.length < 8) return c.json({ error: "Password must be ≥8 chars" }, 400);
  if (getUserByEmail(email)) return c.json({ error: "Email already registered" }, 409);
  const passwordHash = await hashPassword(password);
  const user = createUser({ email, displayName, passwordHash });
  const { token, expiresAt } = createSession(user.id);
  setSessionCookie(c, token, expiresAt);
  return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
});

api.post("/auth/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const user = getUserByEmail(email);
  if (!user) return c.json({ error: "Invalid credentials" }, 401);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return c.json({ error: "Invalid credentials" }, 401);
  const { token, expiresAt } = createSession(user.id);
  setSessionCookie(c, token, expiresAt);
  return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
});

api.post("/auth/logout", (c) => {
  const token = readSessionCookie(c);
  if (token) destroySession(token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

api.get("/auth/me", (c) => {
  const token = readSessionCookie(c);
  if (!token) return c.json({ user: null });
  const session = getUserFromSession(token);
  if (!session) return c.json({ user: null });
  const user = getUserById(session.userId);
  if (!user) return c.json({ user: null });
  return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } });
});

// ─────────────────────────────────────────────
// World
// ─────────────────────────────────────────────

api.get("/world", (c) => {
  const w = prep<[], { currentWeek: number; lastTickAt: number; isPaused: number; tickSpeedMultiplier: number }>(
    "SELECT currentWeek, lastTickAt, isPaused, tickSpeedMultiplier FROM world WHERE id = 'world'",
  ).get() ?? { currentWeek: 0, lastTickAt: 0, isPaused: 0, tickSpeedMultiplier: 1 };
  return c.json({
    currentWeek: w.currentWeek,
    gameDate: weekToGameDate(w.currentWeek),
    isPaused: !!w.isPaused,
    tickSpeedMultiplier: w.tickSpeedMultiplier,
    lastTickAt: w.lastTickAt,
    nextTickInMs: 60 * 60 * 1000 - ((Date.now() - w.lastTickAt) % (60 * 60 * 1000)),
  });
});

// SSE: streams world updates to the browser
api.get("/world/stream", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      // Initial hello
      send("hello", { now: Date.now() });
      const unsub = subscribe("world", (data) => send("tick", data));
      const heartbeat = setInterval(() => send("heartbeat", { at: Date.now() }), 15_000);
      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        controller.close();
      });
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
});

// ─────────────────────────────────────────────
// Countries, Parties, Demographics
// ─────────────────────────────────────────────

api.get("/countries", (c) => {
  const rows = prep<[], Country>(
    "SELECT id, code, name, configPath, gdp, population, unemploymentPct, inflationPct, approvalBaseline, updatedAt FROM countries ORDER BY name",
  ).all();
  return c.json({ countries: rows });
});

api.get("/countries/:id", (c) => {
  const id = c.req.param("id");
  const country = prep<[string], Country>(
    "SELECT id, code, name, configPath, gdp, population, unemploymentPct, inflationPct, approvalBaseline, updatedAt FROM countries WHERE id = ?",
  ).get(id);
  if (!country) return c.json({ error: "Not found" }, 404);
  const parties = prep<[string], Party>(
    "SELECT id, countryId, name, shortName, color, ideology, leaderPoliticianId, memberCount, treasuryUSD, foundedWeek FROM parties WHERE countryId = ?",
  ).all(id);
  const demographics = prep<[string], { id: string; countryId: string; name: string; populationShare: number; preferencesJson: string; approvalBaseline: number }>(
    "SELECT id, countryId, name, populationShare, preferencesJson, approvalBaseline FROM demographic_groups WHERE countryId = ?",
  ).all(id).map((d) => ({ ...d, preferences: jsonGet(d.preferencesJson, {}) }));
  const offices = prep<[string], { id: string; countryId: string; type: string; name: string; region: string; seatCount: number; chamber: string | null; termLengthWeeks: number; nextElectionWeek: number }>(
    "SELECT id, countryId, type, name, region, seatCount, chamber, termLengthWeeks, nextElectionWeek FROM offices WHERE countryId = ? ORDER BY name",
  ).all(id);
  return c.json({ country, parties, demographics, offices });
});

api.get("/countries/:id/offices", (c) => {
  const id = c.req.param("id");
  const rows = prep(
    "SELECT id, countryId, type, name, region, seatCount, chamber, termLengthWeeks, nextElectionWeek FROM offices WHERE countryId = ? ORDER BY name",
  ).all(id);
  return c.json({ offices: rows });
});

api.get("/countries/:id/parties", (c) => {
  const id = c.req.param("id");
  const rows = prep(
    "SELECT id, countryId, name, shortName, color, ideology, leaderPoliticianId, memberCount, treasuryUSD, foundedWeek FROM parties WHERE countryId = ? ORDER BY name",
  ).all(id);
  return c.json({ parties: rows });
});

// ─────────────────────────────────────────────
// Politicians
// ─────────────────────────────────────────────

api.get("/politicians", (c) => {
  const countryId = c.req.query("country");
  let ownerId = c.req.query("owner");
  if (ownerId === "me") {
    const guard = requireAuth(c);
    if ("error" in guard) return guard.error;
    ownerId = guard.userId;
  }
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (countryId) { where.push("countryId = ?"); args.push(countryId); }
  if (ownerId)   { where.push("ownerUserId = ?"); args.push(ownerId); }
  const sql = `SELECT id, ownerUserId, countryId, name, partyId, ideology, status, officeId, homeRegion,
               demographicsJson, statsJson, createdAt, portraitUrl
               FROM politicians ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY createdAt DESC LIMIT 200`;
  const rows = prep(sql as string).all(...args) as any[];
  const out: Politician[] = rows.map((r) => ({
    ...r,
    demographics: JSON.parse(r.demographicsJson),
    stats: JSON.parse(r.statsJson),
  }));
  return c.json({ politicians: out });
});

api.get("/politicians/:id", (c) => {
  const id = c.req.param("id");
  const r = prep(
    "SELECT id, ownerUserId, countryId, name, partyId, ideology, status, officeId, homeRegion, demographicsJson, statsJson, createdAt, portraitUrl FROM politicians WHERE id = ?",
  ).get(id) as any;
  if (!r) return c.json({ error: "Not found" }, 404);
  const politician: Politician = {
    ...r,
    demographics: JSON.parse(r.demographicsJson),
    stats: JSON.parse(r.statsJson),
  };
  const party = politician.partyId
    ? prep<[string], { id: string; name: string; shortName: string; color: string; ideology: string }>(
        "SELECT id, name, shortName, color, ideology FROM parties WHERE id = ?",
      ).get(politician.partyId)
    : null;
  const country = prep<[string], { id: string; name: string; code: string }>(
    "SELECT id, name, code FROM countries WHERE id = ?",
  ).get(politician.countryId);
  const office = politician.officeId
    ? prep<[string], { id: string; name: string; type: string; chamber: string | null }>(
        "SELECT id, name, type, chamber FROM offices WHERE id = ?",
      ).get(politician.officeId)
    : null;
  const recentBills = prep<[string], { id: string; title: string; stage: string; topic: string; proposedWeek: number }>(
    "SELECT id, title, stage, topic, proposedWeek FROM bills WHERE sponsorPoliticianId = ? ORDER BY proposedWeek DESC LIMIT 10",
  ).all(id);
  const upcomingElections = prep<[string], { id: string; week: number; stage: string }>(
    `SELECT e.id, e.week, e.stage FROM elections e
     JOIN offices o ON o.id = e.officeId
     WHERE o.countryId = ? AND e.stage IN ('scheduled','campaigning','voting') ORDER BY e.week LIMIT 5`,
  ).all(politician.countryId);
  return c.json({ politician, party, country, office, recentBills, upcomingElections });
});

api.post("/politicians", async (c) => {
  const guard = requireAuth(c);
  if ("error" in guard) return guard.error;
  const body = await c.req.json<{
    countryId: string; name: string; partyId?: string | null; ideology?: Politician["ideology"];
    homeRegion?: string; demographics?: Politician["demographics"];
    portraitUrl?: string | null;
  }>();
  if (!body.countryId || !body.name) return c.json({ error: "Missing fields" }, 400);
  const id = nanoid(14);
  const createdAt = realMsToWeek(Date.now());
  const stats = { charisma: 50, competence: 50, integrity: 50, stamina: 100, approval: 50, fundraising: 0 };
  const demographics = body.demographics ?? { age: 40, gender: "nonbinary" as const, ethnicity: "Unspecified" };
  db.run(
    `INSERT INTO politicians (id, ownerUserId, countryId, name, partyId, ideology, status, officeId, homeRegion, demographicsJson, statsJson, createdAt, portraitUrl)
     VALUES (?, ?, ?, ?, ?, ?, 'private', NULL, ?, ?, ?, ?, ?)`,
    [
      id, guard.userId, body.countryId, body.name, body.partyId ?? null, body.ideology ?? "center",
      body.homeRegion ?? "Unspecified", JSON.stringify(demographics), JSON.stringify(stats), createdAt,
      body.portraitUrl ?? null,
    ],
  );
  return c.json({ politician: { id, name: body.name, countryId: body.countryId } });
});

// ─────────────────────────────────────────────
// Politician actions (rally, fundraise, propose-bill, rest, retire, vote-bill)
// ─────────────────────────────────────────────

const VALID_ACTIONS = new Set(["rally", "fundraise", "propose-bill", "rest", "retire", "vote-bill"]);

api.post("/politicians/:id/:action", async (c) => {
  const guard = requireAuth(c);
  if ("error" in guard) return guard.error;
  const id = c.req.param("id");
  const action = c.req.param("action");
  if (!VALID_ACTIONS.has(action)) return c.json({ error: "Unknown action" }, 400);

  const row = prep<[string], { ownerUserId: string; statsJson: string; status: string; countryId: string; officeId: string | null; name: string }>(
    "SELECT ownerUserId, statsJson, status, countryId, officeId, name FROM politicians WHERE id = ?",
  ).get(id);
  if (!row) return c.json({ error: "Politician not found" }, 404);
  if (row.ownerUserId !== guard.userId) return c.json({ error: "Not your politician" }, 403);
  if (row.status === "retired") return c.json({ error: "Politician is retired" }, 400);

  const stats = JSON.parse(row.statsJson);
  const body = (await c.req.json<Record<string, unknown>>().catch(() => ({}))) as Record<string, unknown>;
  const now = realMsToWeek(Date.now());

  if (action === "fundraise") {
    if (stats.stamina < 5) return c.json({ error: "Not enough stamina" }, 400);
    const gain = 25000 + Math.round(Math.random() * 50000) + stats.charisma * 500;
    stats.fundraising += gain;
    stats.stamina = Math.max(0, stats.stamina - 5);
    db.run("UPDATE politicians SET statsJson = ? WHERE id = ?", [JSON.stringify(stats), id]);
    return c.json({ message: `Raised $${gain.toLocaleString()}`, stats });
  }

  if (action === "rally") {
    if (stats.stamina < 10) return c.json({ error: "Not enough stamina" }, 400);
    const approvalGain = 1 + Math.round(Math.random() * 4) + Math.round(stats.charisma / 25);
    stats.approval = Math.min(100, stats.approval + approvalGain);
    stats.stamina = Math.max(0, stats.stamina - 10);
    db.run("UPDATE politicians SET statsJson = ? WHERE id = ?", [JSON.stringify(stats), id]);
    return c.json({ message: `Approval +${approvalGain}`, stats });
  }

  if (action === "rest") {
    const recover = 15 + Math.round(Math.random() * 15);
    stats.stamina = Math.min(100, stats.stamina + recover);
    db.run("UPDATE politicians SET statsJson = ? WHERE id = ?", [JSON.stringify(stats), id]);
    return c.json({ message: `Stamina +${recover}`, stats });
  }

  if (action === "retire") {
    db.run("UPDATE politicians SET status = 'retired' WHERE id = ?", [id]);
    return c.json({ message: `${row.name} has retired`, status: "retired" });
  }

  if (action === "propose-bill") {
    const title = String(body.title ?? "").trim();
    const summary = String(body.summary ?? "").trim();
    const topic = String(body.topic ?? "").trim();
    if (!title || !summary || !topic) return c.json({ error: "Missing bill fields" }, 400);
    const billId = nanoid(14);
    db.run(
      `INSERT INTO bills (id, countryId, sponsorPoliticianId, title, summary, topic, stage, proposedWeek, coSponsorsJson, votesForJson, votesAgainstJson, abstentionsJson, effectsJson, signedWeek)
       VALUES (?, ?, ?, ?, ?, ?, 'committee', ?, '[]', '[]', '[]', '[]', '[]', NULL)`,
      [billId, row.countryId, id, title, summary, topic, now],
    );
    return c.json({ message: `${title} introduced to committee`, bill: { id: billId, title } });
  }

  if (action === "vote-bill") {
    const billId = String(body.billId ?? "").trim();
    const vote = String(body.vote ?? "").trim().toLowerCase();
    if (!["yes", "no", "abstain"].includes(vote)) return c.json({ error: "Invalid vote" }, 400);
    const bill = prep<[string], { stage: string; votesForJson: string; votesAgainstJson: string; abstentionsJson: string }>(
      "SELECT stage, votesForJson, votesAgainstJson, abstentionsJson FROM bills WHERE id = ?",
    ).get(billId);
    if (!bill) return c.json({ error: "Bill not found" }, 400);
    const forIds: string[] = JSON.parse(bill.votesForJson);
    const againstIds: string[] = JSON.parse(bill.votesAgainstJson);
    const abstainIds: string[] = JSON.parse(bill.abstentionsJson);
    forIds.splice(forIds.indexOf(id), 1);
    againstIds.splice(againstIds.indexOf(id), 1);
    abstainIds.splice(abstainIds.indexOf(id), 1);
    if (vote === "yes") forIds.push(id);
    else if (vote === "no") againstIds.push(id);
    else abstainIds.push(id);
    db.run(
      "UPDATE bills SET votesForJson = ?, votesAgainstJson = ?, abstentionsJson = ? WHERE id = ?",
      [JSON.stringify(forIds), JSON.stringify(againstIds), JSON.stringify(abstainIds), billId],
    );
    return c.json({ message: `Vote recorded: ${vote}`, votes: { for: forIds.length, against: againstIds.length, abstain: abstainIds.length } });
  }

  return c.json({ error: "Action not implemented" }, 501);
});

// ─────────────────────────────────────────────
// Elections
// ─────────────────────────────────────────────

api.get("/elections", (c) => {
  const countryId = c.req.query("country");
  const rows = countryId
    ? prep(
        "SELECT id, officeId, countryId, week, stage, candidatesJson, resultsJson, winnerId FROM elections WHERE countryId = ? ORDER BY week DESC",
      ).all(countryId) as any[]
    : prep(
        "SELECT id, officeId, countryId, week, stage, candidatesJson, resultsJson, winnerId FROM elections ORDER BY week DESC LIMIT 100",
      ).all() as any[];
  const out = rows.map((r) => ({
    ...r,
    candidates: JSON.parse(r.candidatesJson),
    results: JSON.parse(r.resultsJson),
  }));
  return c.json({ elections: out });
});

api.post("/elections/:id/declare", async (c) => {
  const guard = requireAuth(c);
  if ("error" in guard) return guard.error;
  const eid = c.req.param("id");
  const body = await c.req.json<{ politicianId: string }>();
  if (!body.politicianId) return c.json({ error: "Missing politicianId" }, 400);
  // Verify ownership
  const owner = prep<[string], { ownerUserId: string }>(
    "SELECT ownerUserId FROM politicians WHERE id = ?",
  ).get(body.politicianId);
  if (!owner || owner.ownerUserId !== guard.userId) {
    return c.json({ error: "Not your politician" }, 403);
  }
  const election = prep<[string], { candidatesJson: string; stage: string }>(
    "SELECT candidatesJson, stage FROM elections WHERE id = ?",
  ).get(eid);
  if (!election) return c.json({ error: "Election not found" }, 404);
  if (election.stage !== "scheduled" && election.stage !== "campaigning") {
    return c.json({ error: "Election not in candidate phase" }, 400);
  }
  const cands = JSON.parse(election.candidatesJson) as string[];
  if (!cands.includes(body.politicianId)) {
    cands.push(body.politicianId);
    db.run("UPDATE elections SET candidatesJson = ? WHERE id = ?", [JSON.stringify(cands), eid]);
    db.run("UPDATE politicians SET status = 'campaigning' WHERE id = ?", [body.politicianId]);
  }
  return c.json({ ok: true, candidates: cands });
});

// ─────────────────────────────────────────────
// Bills
// ─────────────────────────────────────────────

api.get("/bills", (c) => {
  const countryId = c.req.query("country");
  const rows = countryId
    ? prep(
        "SELECT id, countryId, sponsorPoliticianId, title, summary, topic, stage, proposedWeek, coSponsorsJson, votesForJson, votesAgainstJson, abstentionsJson, effectsJson, signedWeek FROM bills WHERE countryId = ? ORDER BY proposedWeek DESC LIMIT 200",
      ).all(countryId) as any[]
    : prep(
        "SELECT id, countryId, sponsorPoliticianId, title, summary, topic, stage, proposedWeek, coSponsorsJson, votesForJson, votesAgainstJson, abstentionsJson, effectsJson, signedWeek FROM bills ORDER BY proposedWeek DESC LIMIT 200",
      ).all() as any[];
  const out: Bill[] = rows.map((r) => ({
    ...r,
    coSponsors: JSON.parse(r.coSponsorsJson),
    votesFor: JSON.parse(r.votesForJson),
    votesAgainst: JSON.parse(r.votesAgainstJson),
    abstentions: JSON.parse(r.abstentionsJson),
    effects: JSON.parse(r.effectsJson),
  }));
  return c.json({ bills: out });
});

api.post("/bills", async (c) => {
  const guard = requireAuth(c);
  if ("error" in guard) return guard.error;
  const body = await c.req.json<{
    countryId: string; sponsorPoliticianId: string; title: string; summary: string;
    topic: Bill["topic"]; effects?: Bill["effects"];
  }>();
  if (!body.countryId || !body.sponsorPoliticianId || !body.title) {
    return c.json({ error: "Missing fields" }, 400);
  }
  const id = nanoid(14);
  const proposedWeek = realMsToWeek(Date.now());
  db.run(
    `INSERT INTO bills (id, countryId, sponsorPoliticianId, title, summary, topic, stage, proposedWeek, coSponsorsJson, votesForJson, votesAgainstJson, abstentionsJson, effectsJson)
     VALUES (?, ?, ?, ?, ?, ?, 'committee', ?, '[]', '[]', '[]', '[]', ?)`,
    [id, body.countryId, body.sponsorPoliticianId, body.title, body.summary, body.topic, proposedWeek, JSON.stringify(body.effects ?? [])],
  );
  return c.json({ bill: { id, title: body.title, sponsorPoliticianId: body.sponsorPoliticianId } });
});

// ─────────────────────────────────────────────
// Events feed
// ─────────────────────────────────────────────

api.get("/events", (c) => {
  const countryId = c.req.query("country");
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  type EventRow = Omit<GameEvent, "payload"> & { payloadJson: string };
  const toEvent = (r: EventRow): GameEvent => ({ ...r, payload: jsonGet(r.payloadJson, {}) as Record<string, never> });
  const rows = countryId
    ? prep<[string, number], EventRow>(
        "SELECT id, countryId, week, kind, message, payloadJson, createdAt FROM events WHERE countryId = ? ORDER BY createdAt DESC LIMIT ?",
      ).all(countryId, limit).map(toEvent)
    : prep<[number], EventRow>(
        "SELECT id, countryId, week, kind, message, payloadJson, createdAt FROM events ORDER BY createdAt DESC LIMIT ?",
      ).all(limit).map(toEvent);
  return c.json({ events: rows });
});

export default api;