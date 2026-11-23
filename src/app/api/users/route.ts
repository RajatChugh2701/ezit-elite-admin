import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, audit, fail, isResponse, pool } from "@/lib/api";
import { makePassword } from "@/lib/auth";

export const runtime = "nodejs";
const roles = ["Admin", "City Admin", "Operations Admin", "Finance Admin", "Manager"] as const;
const rolePermissions: Record<(typeof roles)[number], string[]> = {
  Admin: ["dashboard", "members", "plans", "services", "requests", "dispatch", "payments", "reports"],
  "City Admin": ["dashboard", "members", "requests", "dispatch"],
  "Operations Admin": ["dashboard", "members", "plans", "services", "requests", "dispatch", "payments", "reports"],
  "Finance Admin": ["dashboard", "payments", "reports"],
  Manager: ["dashboard", "members", "requests", "dispatch"],
};
const schema = z.object({ role: z.enum(roles), name: z.string().trim().min(1).max(120), email: z.email(), password: z.string().min(12).max(200), city: z.string().trim().max(100).optional() });

export async function GET(request: Request) {
  const actor = await apiUser("dispatch");
  if (isResponse(actor)) return actor;
  const url = new URL(request.url), q = url.searchParams.get("q")?.trim() || "";
  const roles = (url.searchParams.get("type") || "").split(",").filter(Boolean);
  const statuses = (url.searchParams.get("status") || "").split(",").filter(Boolean);
  const cities = (url.searchParams.get("city") || "").split(",").filter(Boolean);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1)), size = Math.min(100, Math.max(10, Number(url.searchParams.get("size") || 20)));
  const source = actor.role === "Admin" ? `SELECT id,name,email,role user_type,city,active,CASE WHEN active THEN 'Active' ELSE 'Inactive' END status,created_at,'account' kind FROM users WHERE role <> 'PE'
    UNION ALL SELECT id,name,email,'Personal Executive' user_type,city,true active,status,created_at,'pe' kind FROM pes` :
    `SELECT id,name,email,'Personal Executive' user_type,city,true active,status,created_at,'pe' kind FROM pes`;
  const args: unknown[] = [], where: string[] = [];
  if (q) { args.push(`%${q}%`); where.push(`(name ILIKE $${args.length} OR email ILIKE $${args.length} OR user_type ILIKE $${args.length})`); }
  if (actor.role !== "Admin") where.push("user_type='Personal Executive'");
  if (roles.length) { args.push(roles); where.push(`user_type=ANY($${args.length}::text[])`); }
  if (statuses.length) { args.push(statuses); where.push(`status=ANY($${args.length}::text[])`); }
  if (cities.length) { args.push(cities); where.push(`city=ANY($${args.length}::text[])`); }
  if (actor.role === "City Admin") { if (!actor.city) return fail("A city must be assigned to this account",403); args.push(actor.city); where.push(`city=$${args.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const count = await pool.query(`SELECT count(*)::int total FROM (${source}) all_users ${clause}`, args);
  const sort = ["name","email","user_type","city","status","created_at"].includes(url.searchParams.get("sort") || "") ? url.searchParams.get("sort") : "created_at";
  const direction = url.searchParams.get("direction")?.toLowerCase()==="asc"?"ASC":"DESC";
  const rows = await pool.query(`SELECT * FROM (${source}) all_users ${clause} ORDER BY ${sort} ${direction} LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, size, (page - 1) * size]);
  return NextResponse.json({ items: rows.rows, total: count.rows[0].total, page, pages: Math.ceil(count.rows[0].total / size) });
}

export async function POST(request: Request) {
  const actor = await apiUser();
  if (isResponse(actor)) return actor;
  if (actor.role !== "Admin") return fail("Only Admin can create user accounts", 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid user details");
  const data = parsed.data;
  if (data.role === "City Admin" && !data.city) return fail("Select a city for the City Admin");
  try {
    const result = await pool.query(`INSERT INTO users(email,name,role,city,password_hash,permissions,active)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,true) RETURNING id`, [data.email.toLowerCase(), data.name, data.role, data.role === "City Admin" ? data.city : null, await makePassword(data.password), JSON.stringify(rolePermissions[data.role])]);
    await audit(pool, actor.email, "create", "user", result.rows[0].id, { role: data.role, city: data.role === "City Admin" ? data.city : null });
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return fail("That email already has an account", 409);
    return fail("Could not create user", 500);
  }
}
