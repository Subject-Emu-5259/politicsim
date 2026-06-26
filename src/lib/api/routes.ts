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
  extractToken,
} from "../auth";
import type {
  Politician, Bill, Election, Party, DemographicGroup, Country, GameEvent,
} from "../game/types";
import { realMsToWeek, weekToGameDate } from "../game/types";
import { subscribe } from "../metrics/emitter";
import { emit } from "../metrics/emitter";
import { loadCountryConfigs, seedWorld, seedNpcs } from "../countries/seed";
import {
  logCareer,
  logAction,
  checkAchievements,
  getCareerHistory,
  getAchievements,
  getActionLog,
  getActionCounts,
  getElectionWins,
  type AchievementContext,
  buildAchievementContext,
} from "../game/career";

function logEvent(countryId: string | null, kind: string, message: string, payload: Record<string, unknown> = {}) {
  const id = nanoid(14);
  const now = Date.now();
  const week = realMsToWeek(now);
  db.run(
    "INSERT INTO events (id, countryId, week, kind, message, payloadJson, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, countryId, week, kind, message, JSON.stringify(payload), now],
  );
  emit("event", { id, countryId, week, kind, message, payload });
}

const api = new Hono();

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

api.get("/auth/me", (c) => {
  const token = extractToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const session = getUserFromSession(token);
  if (!session) return c.json({ error: "Session expired" }, 401);
  const user = getUserById(session.userId);
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({ user });
});

api.post("/auth/register-with-politician", async (c) => {
  const body = await c.req.json<{
    email?: string; password?: string; displayName?: string;
    politicianName?: string; countryId?: string; ideology?: string;
    partyId?: string | null; homeRegion?: string;
  }>();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const displayName = (body.displayName ?? "").trim();
  const polName = (body.politicianName ?? "").trim();
  if (!email || !password || !displayName || !polName || !body.countryId)
    return c.json({ error: "Missing fields" }, 400);
  if (password.length < 8) return c.json({ error: "Password must be ≥8 chars" }, 400);
  if (getUserByEmail(email)) return c.json({ error: "Email already registered" }, 409);

  const passwordHash = await hashPassword(password);
  const user = createUser({ email, displayName, passwordHash });
  const { token, expiresAt } = createSession(user.id);
  setSessionCookie(c, token, expiresAt);

  // Create the first politician
  const polId = nanoid(14);
  const createdAt = realMsToWeek(Date.now());
  const stats = { charisma: 50, competence: 50, integrity: 50, stamina: 100, approval: 50, fundraising: 0 };
  const demog = { age: 40, gender: "nonbinary" as const, ethnicity: "Unspecified" };
  db.run(
    `INSERT INTO politicians (id, ownerUserId, countryId, name, partyId, ideology, status, officeId, homeRegion, demographicsJson, statsJson, createdAt, portraitUrl)
     VALUES (?, ?, ?, ?, ?, ?, 'private', NULL, ?, ?, ?, ?, NULL)`,
    [
      polId, user.id, body.countryId, polName, body.partyId ?? null,
      body.ideology ?? "center", body.homeRegion ?? "Unknown",
      JSON.stringify(demog), JSON.stringify(stats), createdAt,
    ],
  );
  logEvent(body.countryId, "politician-joined", `${polName} entered politics.`);
  return c.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    politicianId: polId,
    token,
  });
});

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
  return c.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    token,
  });
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
  return c.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    token,
  });
});

api.post("/auth/logout", (c) => {
  const token = extractToken(c);
  if (token) destroySession(token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

// ─────────────────────────────────────────────
// World
// ─────────────────────────────────────────────

api.get("/world", (c) => {
  const world = prep<[], any>("SELECT * FROM world WHERE id = 'world'").get();
  return c.json({ world });
});

api.post("/world/update", async (c) => {
  const guard = requireAuth(c);
  if ("error" in guard) return guard.error;
  const body = await c.req.json<{ isPaused?: number; tickSpeedMultiplier?: number }>();
  if (body.isPaused !== undefined) db.run("UPDATE world SET isPaused = ? WHERE id = 'world'", [body.isPaused]);
  if (body.tickSpeedMultiplier !== undefined) db.run("UPDATE world SET tickSpeedMultiplier = ? WHERE id = 'world'", [body.tickSpeedMultiplier]);
  return c.json({ success: true });
});

api.post("/world/reset", async (c) => {
  const guard = requireAuth(c);
  if ("error" in guard) return guard.error;
  db.exec("DELETE FROM politicians; DELETE FROM bills; DELETE FROM elections;");
  db.run("UPDATE world SET currentWeek = 0, lastTickAt = ? WHERE id = 'world'", [Date.now()]);
  return c.json({ success: true });
});

api.post("/world/seed-npcs", async (c) => {
  const guard = requireAuth(c);
  if ("error" in guard) return guard.error;
  seedNpcs();
  return c.json({ success: true });
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
    const statsBefore = { ...stats };
    stats.fundraising += gain;
    stats.stamina = Math.max(0, stats.stamina - 5);
    db.run("UPDATE politicians SET statsJson = ? WHERE id = ?", [JSON.stringify(stats), id]);
    logAction(id, "fundraise", `Raised $${gain.toLocaleString()}`, statsBefore, stats);
    logCareer(id, "fundraise", "Fundraiser", `Raised $${gain.toLocaleString()} for the campaign.`, { gain });
    const achCtx = buildAchievementContext(id);
    const newAch = checkAchievements(achCtx);
    return c.json({ message: `Raised $${gain.toLocaleString()}`, stats, newAchievements: newAch });
  }

  if (action === "rally") {
    if (stats.stamina < 10) return c.json({ error: "Not enough stamina" }, 400);
    const approvalGain = 1 + Math.round(Math.random() * 4) + Math.round(stats.charisma / 25);
    const statsBefore = { ...stats };
    stats.approval = Math.min(100, stats.approval + approvalGain);
    stats.stamina = Math.max(0, stats.stamina - 10);
    db.run("UPDATE politicians SET statsJson = ? WHERE id = ?", [JSON.stringify(stats), id]);
    logAction(id, "rally", `Approval +${approvalGain}`, statsBefore, stats);
    logCareer(id, "rally", "Campaign Rally", `Held a rally, approval rose by ${approvalGain} points.`, { approvalGain, region: row.name });
    const achCtx = buildAchievementContext(id);
    const newAch = checkAchievements(achCtx);
    return c.json({ message: `Approval +${approvalGain}`, stats, newAchievements: newAch });
  }

  if (action === "rest") {
    const recover = 15 + Math.round(Math.random() * 15);
    const statsBefore = { ...stats };
    stats.stamina = Math.min(100, stats.stamina + recover);
    db.run("UPDATE politicians SET statsJson = ? WHERE id = ?", [JSON.stringify(stats), id]);
    logAction(id, "rest", `Stamina +${recover}`, statsBefore, stats);
    logCareer(id, "rest", "Rest Period", `Recovered ${recover} stamina.`, { recover });
    const achCtx = buildAchievementContext(id);
    const newAch = checkAchievements(achCtx);
    return c.json({ message: `Stamina +${recover}`, stats, newAchievements: newAch });
  }

  if (action === "retire") {
    db.run("UPDATE politicians SET status = 'retired' WHERE id = ?", [id]);
    logAction(id, "retire", "Retired from politics", stats, null);
    logCareer(id, "retire", "Retirement", `${row.name} retired from politics.`, {});
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
    logAction(id, "propose-bill", `Introduced: ${title}`, stats, stats);
    logCareer(id, "propose-bill", "Bill Introduced", `"${title}" entered committee. Topic: ${topic}.`, { billId, title, topic });
    const achCtx = buildAchievementContext(id);
    const newAch = checkAchievements(achCtx);
    return c.json({ message: `${title} introduced to committee`, bill: { id: billId, title }, newAchievements: newAch });
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
// Cabinet Office
// ─────────────────────────────────────────────

api.get("/cabinet/seats", (c) => {
  const countryId = c.req.query("country");
  if (!countryId) return c.json({ error: "Country ID required" }, 400);
  
  const seats = prep<[string], { id: string; name: string; type: string; holderName: string | null; holderId: string | null }>(
    "SELECT o.id, o.name, o.type, p.name as holderName, p.id as holderId FROM offices o LEFT JOIN politicians p ON o.id = p.officeId WHERE o.countryId = ? AND o.type = 'cabinet' ORDER BY o.name",
  ).all(countryId);
  
  return c.json({ seats });
});

api.get("/cabinet/office/:id", (c) => {
  const id = c.req.param("id");
  const office = prep<[string], any>(
    "SELECT * FROM offices WHERE id = ?",
  ).get(id);
  if (!office) return c.json({ error: "Office not found" }, 404);
  
  return c.json({
    name: office.name,
    type: office.type,
    specialization: "General Administration",
    budgetUSD: 500_000_000,
    metrics: [
      { label: "Public Trust", value: "64%", trend: "up" },
      { label: "Efficiency", value: "72%", trend: "stable" },
      { label: "Budget Adherence", value: "91%", trend: "down" },
    ],
    actions: [
      { id: "budget-review", title: "Budget Review", desc: "Audit department spending and reallocate funds.", cost: 1 },
      { id: "policy-push", title: "Policy Push", desc: "Accelerate a pending bill through the chamber.", cost: 2 },
      { id: "public-address", title: "Public Address", desc: "Issue a departmental statement to boost approval.", cost: 1 },
    ],
  });
});

api.post("/cabinet/action", async (c) => {
  const guard = requireAuth(c);
  if ("error" in guard) return guard.error;
  
  const { officeId, actionId } = await c.req.json<{ officeId: string; actionId: string }>();
  
  const office = prep<[string, string, string], any>(
    "SELECT id FROM offices WHERE id = ? AND EXISTS (SELECT 1 FROM politicians WHERE id = ? AND officeId = ?)",
  ).get(officeId, guard.userId, officeId);
  
  if (!office) return c.json({ error: "You do not hold this office" }, 403);
  
  const actionCost = 1;
  const current = prep<[string], { remaining: number }>(
    "SELECT remaining FROM cabinet_actions WHERE politicianId = ?",
  ).get(guard.userId);
  
  if (!current || current.remaining < actionCost) {
    return c.json({ error: "Insufficient action points" }, 400);
  }
  
  db.run(
    "UPDATE cabinet_actions SET remaining = remaining - ? WHERE politicianId = ? AND seatId = ?",
    [actionCost, guard.userId, officeId]
  );
  
  return c.json({ success: true, message: "Order issued" });
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
// Profile (bio, stats, career history, political standing, achievements)
// ─────────────────────────────────────────────

api.get("/profile/:politicianId", (c) => {
  const id = c.req.param("politicianId");
  const pol = prep<[string], any>(
    "SELECT id, ownerUserId, countryId, name, partyId, ideology, status, officeId, homeRegion, demographicsJson, statsJson, createdAt, portraitUrl FROM politicians WHERE id = ?",
  ).get(id);
  if (!pol) return c.json({ error: "Politician not found" }, 404);

  const demographics = JSON.parse(pol.demographicsJson);
  const stats = JSON.parse(pol.statsJson);

  // Party info
  const party = pol.partyId
    ? prep<[string], any>("SELECT id, name, shortName, color, ideology FROM parties WHERE id = ?").get(pol.partyId)
    : null;

  // Office info
  const office = pol.officeId
    ? prep<[string], any>("SELECT id, name, type, region, chamber FROM offices WHERE id = ?").get(pol.officeId)
    : null;

  // Country info
  const country = prep<[string], any>("SELECT id, name, code FROM countries WHERE id = ?").get(pol.countryId);

  // Career history
  const careerHistory = prep<[string], any>(
    "SELECT id, politicianId, kind, title, description, metadataJson, week, createdAt FROM career_history WHERE politicianId = ? ORDER BY createdAt DESC LIMIT 100",
  ).all(id).map((r: any) => ({
    ...r,
    metadata: jsonGet(r.metadataJson, {}),
  }));

  // Achievements
  const achievements = prep<[string], any>(
    "SELECT id, politicianId, kind, title, description, unlockedAt FROM achievements WHERE politicianId = ? ORDER BY unlockedAt DESC",
  ).all(id);

  // Bills sponsored
  const billsSponsored = prep<[string], any>(
    "SELECT id, title, summary, topic, stage, proposedWeek, signedWeek FROM bills WHERE sponsorPoliticianId = ? ORDER BY proposedWeek DESC",
  ).all(id);

  // Elections participated in
  const elections = db.query(
    "SELECT e.id, e.officeId, e.week, e.stage, e.winnerId, o.name as officeName FROM elections e JOIN offices o ON o.id = e.officeId WHERE EXISTS (SELECT 1 FROM json_each(e.candidatesJson) WHERE json_each.value = ?)",
  ).all(id) as any[];

  // Action log (recent)
  const actionLog = prep<[string], any>(
    "SELECT id, politicianId, action, result, statsBeforeJson, statsAfterJson, week, createdAt FROM action_log WHERE politicianId = ? ORDER BY createdAt DESC LIMIT 50",
  ).all(id).map((r: any) => ({
    ...r,
    statsBefore: jsonGet(r.statsBeforeJson, {}),
    statsAfter: jsonGet(r.statsAfterJson, {}),
  }));

  // Political standing summary
  const influenceScore = Math.round(
    (stats.approval * 0.3) +
    (stats.charisma * 0.15) +
    (stats.competence * 0.15) +
    (stats.integrity * 0.1) +
    (stats.fundraising / 100000 * 0.15) +
    (achievements.length * 5 * 0.15)
  );

  const standing = {
    influenceScore: Math.min(100, influenceScore),
    officeName: office?.name ?? "No office held",
    status: pol.status,
    approval: stats.approval,
    warChest: stats.fundraising,
    billsSponsoredCount: billsSponsored.length,
    billsPassedCount: billsSponsored.filter((b: any) => b.stage === "signed").length,
    electionsWonCount: elections.filter((e: any) => e.winnerId === id).length,
    achievementsCount: achievements.length,
  };

  return c.json({
    politician: {
      id: pol.id,
      name: pol.name,
      ideology: pol.ideology,
      status: pol.status,
      homeRegion: pol.homeRegion,
      portraitUrl: pol.portraitUrl,
      createdAt: pol.createdAt,
    },
    bio: {
      age: demographics.age,
      gender: demographics.gender,
      ethnicity: demographics.ethnicity,
      party: party ? { name: party.name, shortName: party.shortName, color: party.color, ideology: party.ideology } : null,
      country: country ? { name: country.name, code: country.code } : null,
      homeRegion: pol.homeRegion,
    },
    stats,
    office,
    standing,
    careerHistory,
    achievements,
    billsSponsored,
    elections,
    actionLog,
  });
});

// ─────────────────────────────────────────────
// Actions (action log for a politician)
// ─────────────────────────────────────────────

api.get("/actions/:politicianId", (c) => {
  const id = c.req.param("politicianId");
  const pol = prep<[string], { ownerUserId: string }>(
    "SELECT ownerUserId FROM politicians WHERE id = ?",
  ).get(id);
  if (!pol) return c.json({ error: "Politician not found" }, 404);

  const actionLog = prep<[string], any>(
    "SELECT id, politicianId, action, result, statsBeforeJson, statsAfterJson, week, createdAt FROM action_log WHERE politicianId = ? ORDER BY createdAt DESC LIMIT 100",
  ).all(id).map((r: any) => ({
    ...r,
    statsBefore: jsonGet(r.statsBeforeJson, {}),
    statsAfter: jsonGet(r.statsAfterJson, {}),
  }));

  // Action counts
  const counts = getActionCounts(id);

  return c.json({ actions: actionLog, counts });
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