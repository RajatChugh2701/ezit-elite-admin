import { NextResponse } from "next/server";
import { apiUser, audit, fail, isResponse, pool } from "@/lib/api";

export const runtime = "nodejs";
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await apiUser("services");
  if (isResponse(user)) return user;
  if (user.role !== "Admin") return fail("Only Admin can manage service categories", 403);
  const { id } = await context.params;
  try {
    const { rows } = await pool.query("DELETE FROM service_categories WHERE id=$1 RETURNING id,name", [id]);
    if (!rows[0]) return fail("Category not found", 404);
    await audit(pool, user.email, "delete", "service_category", id, { name: rows[0].name });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as { code?: string }).code === "23503") return fail("Category is used by existing services", 409);
    return fail("Could not remove category", 500);
  }
}
