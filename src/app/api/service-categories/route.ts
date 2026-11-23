import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, audit, fail, isResponse, pool } from "@/lib/api";

export const runtime = "nodejs";
export async function GET() {
  const user = await apiUser("services");
  if (isResponse(user)) return user;
  const { rows } = await pool.query("SELECT c.id,c.name,count(s.id)::int service_count FROM service_categories c LEFT JOIN services s ON s.category=c.name GROUP BY c.id ORDER BY c.name");
  return NextResponse.json({ items: rows });
}
export async function POST(request: Request) {
  const user = await apiUser("services");
  if (isResponse(user)) return user;
  if (user.role !== "Admin") return fail("Only Admin can manage service categories", 403);
  const parsed = z.object({ name: z.string().trim().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid category");
  try {
    const { rows } = await pool.query("INSERT INTO service_categories(name) VALUES($1) RETURNING id,name", [parsed.data.name]);
    await audit(pool, user.email, "create", "service_category", rows[0].id, { name: rows[0].name });
    return NextResponse.json({ ...rows[0], service_count: 0 }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return fail("That category already exists", 409);
    return fail("Could not create category", 500);
  }
}
