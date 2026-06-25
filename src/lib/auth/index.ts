// Auth helpers: bcrypt password hashing + opaque session tokens persisted in DB.
// Session cookies are HttpOnly, SameSite=Lax, and live 30 days.

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { Context } from "hono";
import { db, prep, jsonGet } from "../db";
import type { AuthSession, User, UserRole } from "../game/types";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = "ps_session";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = nanoid(40);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  db.run(
    "INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)",
    [token, userId, now, expiresAt],
  );
  return { token, expiresAt };
}

export function destroySession(token: string): void {
  db.run("DELETE FROM sessions WHERE token = ?", [token]);
}

export function getUserFromSession(token: string): AuthSession | null {
  const row = prep<[string], {
    userId: string; expiresAt: number; email: string; role: UserRole;
  }>(
    `SELECT s.userId as userId, s.expiresAt as expiresAt, u.email as email, u.role as role
     FROM sessions s JOIN users u ON u.id = s.userId
     WHERE s.token = ?`,
  ).get(token);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    destroySession(token);
    return null;
  }
  return { userId: row.userId, email: row.email, role: row.role };
}

export function setSessionCookie(c: Context, token: string, expiresAt: number) {
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`,
  );
}

export function clearSessionCookie(c: Context) {
  c.header("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function readSessionCookie(c: Context): string | null {
  const header = c.req.header("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

export function requireAuth(c: Context): AuthSession | { error: Response } {
  const token = readSessionCookie(c);
  if (!token) {
    return { error: c.json({ error: "Authentication required" }, 401) };
  }
  const session = getUserFromSession(token);
  if (!session) {
    return { error: c.json({ error: "Session expired" }, 401) };
  }
  return session;
}

export function getUserById(id: string): User | null {
  const row = prep<[string], {
    id: string; email: string; displayName: string;
    passwordHash: string; role: UserRole; createdAt: number;
  }>(
    "SELECT id, email, displayName, passwordHash, role, createdAt FROM users WHERE id = ?",
  ).get(id);
  if (!row) return null;
  return { ...row, role: row.role ?? "user" };
}

export function getUserByEmail(email: string): User | null {
  const row = prep<[string], {
    id: string; email: string; displayName: string;
    passwordHash: string; role: UserRole; createdAt: number;
  }>(
    "SELECT id, email, displayName, passwordHash, role, createdAt FROM users WHERE email = ?",
  ).get(email.toLowerCase());
  if (!row) return null;
  return { ...row, role: row.role ?? "user" };
}

export function createUser(input: {
  email: string; displayName: string; passwordHash: string;
}): User {
  const id = nanoid(16);
  const createdAt = Date.now();
  db.run(
    "INSERT INTO users (id, email, displayName, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, 'user', ?)",
    [id, input.email.toLowerCase(), input.displayName, input.passwordHash, createdAt],
  );
  return {
    id, email: input.email.toLowerCase(), displayName: input.displayName,
    passwordHash: input.passwordHash, role: "user", createdAt,
  };
}