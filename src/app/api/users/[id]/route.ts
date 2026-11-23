import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, audit, fail, isResponse, pool } from "@/lib/api";

export const runtime = "nodejs";
const roles = ["Admin", "City Admin", "Operations Admin", "Finance Admin", "Manager"] as const;
const rolePermissions: Record<(typeof roles)[number], string[]> = {
  Admin: ["dashboard", "members", "plans", "services", "requests", "dispatch", "payments", "reports"],
  "City Admin": ["dashboard", "members", "requests", "dispatch"],
  "Operations Admin": ["dashboard", "members", "plans", "services", "requests", "dispatch", "payments", "reports"],
  "Finance Admin": ["dashboard", "payments", "reports"],
  Manager: ["dashboard", "members", "requests", "dispatch"],
};
const schema = z.object({ name: z.string().trim().min(1).max(120), email: z.email(), role: z.enum(roles), city: z.string().trim().max(100).nullable().optional(), active: z.boolean() });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await apiUser();
  if (isResponse(actor)) return actor;
  if (actor.role !== "Admin") return fail("Only Admin can update user accounts", 403);
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid user details");
  const data = parsed.data;
  if (data.role === "City Admin" && !data.city) return fail("Select a city for the City Admin");
  if (id === actor.id && !data.active) return fail("You cannot deactivate your own account", 409);
  const { rows } = await pool.query("SELECT id,role,active FROM users WHERE id=$1", [id]);
  if (!rows[0]) return fail("User not found", 404);
  if (rows[0].role === "Admin" && rows[0].active && (!data.active || data.role !== "Admin")) {
    const count = await pool.query("SELECT count(*)::int total FROM users WHERE role='Admin' AND active=true");
    if (count.rows[0].total <= 1) return fail("Keep at least one active Admin account", 409);
  }
  try {
    await pool.query("UPDATE users SET name=$1,email=$2,role=$3,city=$4,active=$5,permissions=$6::jsonb WHERE id=$7", [data.name, data.email.toLowerCase(), data.role, data.role === "City Admin" ? data.city : null, data.active, JSON.stringify(rolePermissions[data.role]), id]);
    await audit(pool, actor.email, "update", "user", id, { changed_fields: ["name", "email", "role", "city", "active"] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return fail("That email already has an account", 409);
    return fail("Could not update user", 500);
  }
}
