import { z } from "zod";
import { pool } from "@/lib/db";
import { fail } from "@/lib/api";
import { createSession, verifyPassword, type User } from "@/lib/auth";

export const runtime = "nodejs";
const schema = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Email or password is incorrect", 401);
  const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [parsed.data.email.toLowerCase()]);
  const row = rows[0];
  if (!row || !row.active) return fail("Email or password is incorrect", 401);
  const password = await verifyPassword(parsed.data.password, row.password_hash);
  if (!password.valid) return fail("Email or password is incorrect", 401);
  if (password.upgraded) await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [password.upgraded, row.id]);
  const user: User = { id: row.id, name: row.name, email: row.email, role: row.role, city: row.city, permissions: row.permissions || [], active: row.active };
  const client = await pool.connect();
  try { await client.query("DELETE FROM sessions WHERE expires_at<now()"); return await createSession(client, user); }
  finally { client.release(); }
}
