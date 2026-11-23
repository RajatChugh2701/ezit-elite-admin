import { z } from "zod";
import { pool } from "@/lib/db";
import { audit, fail } from "@/lib/api";
import { createSession, makePassword } from "@/lib/auth";

export const runtime = "nodejs";
const schema = z.object({ name: z.string().trim().min(1).max(120), email: z.email(), password: z.string().min(12).max(200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid setup details");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE users IN EXCLUSIVE MODE");
    const exists = await client.query("SELECT id FROM users WHERE role='Admin' LIMIT 1");
    if (exists.rowCount) { await client.query("ROLLBACK"); return fail("Initial setup is already complete", 409); }
    const { name, email, password } = parsed.data;
    const result = await client.query(`INSERT INTO users(email,name,role,password_hash,permissions,active)
      VALUES($1,$2,'Admin',$3,'["dashboard","members","plans","services","requests","dispatch","payments","reports"]'::jsonb,true)
      RETURNING id,email,name,role,city,permissions,active`, [email.toLowerCase(), name, await makePassword(password)]);
    const user = result.rows[0];
    await audit(client, user.email, "initial_setup", "user", user.id, { role: "Admin" });
    await client.query("COMMIT");
    return await createSession(client, user);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Initial setup failed", error);
    return fail("Could not complete initial setup", 500);
  } finally { client.release(); }
}
