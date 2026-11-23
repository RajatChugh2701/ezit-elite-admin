import "server-only";
import { createHash, randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { pool } from "./db";
import type { PoolClient } from "pg";

const COOKIE = "ezit_session";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export type User = { id: string; email: string; name: string; role: string; city?: string | null; permissions: string[]; active: boolean };

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const { rows } = await pool.query(`
    SELECT u.id,u.email,u.name,u.role,u.city,u.permissions,u.active
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true
  `, [hashToken(token)]);
  return rows[0] ? { ...rows[0], permissions: rows[0].permissions || [] } : null;
}

export function can(user: User, permission: string): boolean {
  return user.role === "Admin" || user.permissions.includes(permission);
}

export async function createSession(client: PoolClient, user: User): Promise<NextResponse> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)", [hashToken(token), user.id, expires]);
  const response = NextResponse.json(user);
  response.cookies.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires });
  return response;
}

export async function clearSession(token?: string): Promise<void> {
  if (token) await pool.query("DELETE FROM sessions WHERE token_hash=$1", [hashToken(token)]);
}

export function clearCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}

export async function makePassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, stored: string): Promise<{ valid: boolean; upgraded?: string }> {
  if (stored.startsWith("$2")) return { valid: await compare(password, stored) };
  const [salt, oldHash] = stored.split(":", 2);
  if (!salt || !oldHash) return { valid: false };
  const derived = pbkdf2Sync(password, salt, 240_000, 32, "sha256");
  const old = Buffer.from(oldHash, "hex");
  const valid = old.length === derived.length && timingSafeEqual(old, derived);
  return { valid, upgraded: valid ? await makePassword(password) : undefined };
}
