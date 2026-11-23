import { NextResponse } from "next/server";
import { apiUser, createRecord, entityConfig, entityName, fail, isResponse, permissionFor, pool } from "@/lib/api";

export const runtime = "nodejs";
type Context = { params: Promise<{ entity: string }> };

export async function GET(request: Request, context: Context) {
  const { entity: rawEntity } = await context.params;
  const entity = entityName(rawEntity);
  if (!entity) return fail("Unknown data type", 404);
  const user = await apiUser(permissionFor(entity));
  if (isResponse(user)) return user;

  const cfg = entityConfig[entity];
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const size = Math.min(100, Math.max(10, Number(url.searchParams.get("size") || 20)));
  const args: unknown[] = [];
  const filters: string[] = [];
  const add = (value: unknown) => { args.push(value); return `$${args.length}`; };
  const q = url.searchParams.get("q")?.trim();
  if (q) {
    const searchFields = cfg.fields.filter((field) => ["name","first_name","last_name","email","phone","city","plan","code","category","service","member","ticket","invoice_number","reference","status"].includes(field));
    const param = add(`%${q}%`);
    filters.push(`(${searchFields.map((field) => `${field} ILIKE ${param}`).join(" OR ")})`);
  }
  const statuses = (url.searchParams.get("status") || "").split(",").filter(Boolean);
  if (statuses.length && cfg.fields.includes("status")) filters.push(`status = ANY(${add(statuses)}::text[])`);
  const cities = (url.searchParams.get("city") || "").split(",").filter(Boolean);
  if (cities.length && ["applications","members","requests","pes"].includes(entity)) filters.push(`city = ANY(${add(cities)}::text[])`);
  if (user.role === "City Admin" && ["applications","members","requests","pes"].includes(entity)) {
    if (!user.city) return fail("A city must be assigned to this account", 403);
    filters.push(`city = ${add(user.city)}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const sortParam = url.searchParams.get("sort") || "created_at";
  const sort = ["id","created_at","updated_at",...cfg.fields].includes(sortParam) ? sortParam : "created_at";
  const direction = url.searchParams.get("direction")?.toLowerCase() === "asc" ? "ASC" : "DESC";
  const count = await pool.query(`SELECT count(*)::int AS total FROM ${cfg.table} ${where}`, args);
  const rows = await pool.query(
    `SELECT * FROM ${cfg.table} ${where} ORDER BY ${sort} ${direction} LIMIT ${add(size)} OFFSET ${add((page - 1) * size)}`,
    args,
  );
  const total = count.rows[0].total as number;
  return NextResponse.json({ items: rows.rows, total, page, pages: Math.max(1, Math.ceil(total / size)) });
}

export async function POST(request: Request, context: Context) {
  const { entity: rawEntity } = await context.params;
  const entity = entityName(rawEntity);
  if (!entity) return fail("Unknown data type", 404);
  const user = await apiUser(permissionFor(entity));
  if (isResponse(user)) return user;
  const data = await request.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) return fail("Invalid record details");
  try {
    const id = await createRecord(user, entity, data as Record<string, unknown>);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return fail("A record with those details already exists", 409);
    if (code === "23503") return fail("A related record does not exist", 400);
    if (error instanceof Error) return fail(error.message);
    console.error("Record creation failed", error);
    return fail("Could not create record", 500);
  }
}
