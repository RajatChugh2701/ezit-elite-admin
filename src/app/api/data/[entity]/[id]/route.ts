import { NextResponse } from "next/server";
import { apiUser, audit, entityConfig, entityName, fail, isResponse, permissionFor, pool } from "@/lib/api";

export const runtime = "nodejs";
type Context = { params: Promise<{ entity: string; id: string }> };

async function getRecord(entity: string, id: string, city?: string | null) {
  const table = entityConfig[entity as keyof typeof entityConfig].table;
  return pool.query(`SELECT * FROM ${table} WHERE id=$1${city ? " AND city=$2" : ""}`, city ? [id, city] : [id]);
}

export async function PUT(request: Request, context: Context) {
  const { entity: rawEntity, id } = await context.params;
  const entity = entityName(rawEntity);
  if (!entity) return fail("Unknown data type", 404);
  const user = await apiUser(permissionFor(entity));
  if (isResponse(user)) return user;
  const data = await request.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) return fail("Invalid record details");
  const cfg = entityConfig[entity];
  const values: Record<string, string | null> = {};
  for (const field of cfg.fields) {
    const value = (data as Record<string, unknown>)[field];
    if (value !== undefined) values[field] = value === null || value === "" ? null : String(value);
  }
  const blocked = entity === "applications" ? ["status","rejection_reason"]
    : entity === "requests" ? ["status","pe_id","ticket"] : [];
  for (const field of blocked) delete values[field];
  if (!Object.keys(values).length) return fail("No editable fields supplied");

  const currentResult = await getRecord(entity, id, user.role === "City Admin" ? user.city : null);
  const current = currentResult.rows[0];
  if (!current) return fail("Record not found", 404);
  if (entity === "members" && (values.first_name !== undefined || values.last_name !== undefined)) {
    values.name = `${values.first_name ?? current.first_name ?? ""} ${values.last_name ?? current.last_name ?? ""}`.trim();
  }
  const next = { ...current, ...values };
  const missing = cfg.required.find((field) => !String(next[field] ?? "").trim());
  if (missing) return fail(`${missing.replaceAll("_", " ")} is required`);
  if (next.status && cfg.status && !cfg.status.includes(String(next.status))) return fail("Invalid status");
  if (entity === "members" && current.status !== "Active" && next.status === "Active") return fail("Member activation requires a verified membership payment", 409);
  if (entity === "payments" && next.status !== current.status) return fail("Payment status requires a verified gateway event", 409);
  if (entity === "invoices" && current.status !== "Paid" && next.status === "Paid") return fail("Invoice payment requires a verified gateway event", 409);
  for (const field of cfg.numbers || []) {
    if (next[field] == null) continue;
    const number = Number(next[field]);
    if (!Number.isFinite(number) || number < 0) return fail(`${field.replaceAll("_", " ")} must be zero or more`);
  }
  if (user.role === "City Admin" && ["applications","members","requests","pes"].includes(entity) && (!user.city || current.city !== user.city || (values.city && values.city !== user.city))) return fail("Record not found", 404);

  const columns = Object.keys(values);
  const params = columns.map((column) => values[column]);
  const assignments = columns.map((column, index) => `${column}=$${index + 1}`);
  params.push(id);
  let where = `id=$${params.length}`;
  if (user.role === "City Admin" && ["applications","members","requests","pes"].includes(entity)) {
    params.push(user.city);
    where += ` AND city=$${params.length}`;
  }
  const result = await pool.query(`UPDATE ${cfg.table} SET ${assignments.join(",")},updated_at=now() WHERE ${where} RETURNING id`, params);
  if (!result.rowCount) return fail("Record not found", 404);
  await audit(pool, user.email, "update", entity, id, { fields: columns });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const { entity: rawEntity, id } = await context.params;
  const entity = entityName(rawEntity);
  if (!entity) return fail("Unknown data type", 404);
  const user = await apiUser(permissionFor(entity));
  if (isResponse(user)) return user;
  const cfg = entityConfig[entity];
  const scoped = user.role === "City Admin" && ["applications","members","requests","pes"].includes(entity);
  if (scoped && !user.city) return fail("A city must be assigned to this account", 403);
  const params = scoped ? [id, user.city] : [id];
  const result = await pool.query(`DELETE FROM ${cfg.table} WHERE id=$1${scoped ? " AND city=$2" : ""} RETURNING id`, params);
  if (!result.rowCount) return fail("Record not found", 404);
  await audit(pool, user.email, "delete", entity, id, {});
  return NextResponse.json({ ok: true });
}
