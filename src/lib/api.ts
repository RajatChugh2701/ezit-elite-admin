import "server-only";
import { NextResponse } from "next/server";
import { pool } from "./db";
import { can, currentUser, type User } from "./auth";
import { entityConfig, permissionFor, type Entity } from "./entities";
import type { PoolClient } from "pg";

export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
export async function apiUser(permission?: string): Promise<User | NextResponse> {
  const user = await currentUser();
  if (!user) return fail("Sign in required", 401);
  if (permission && !can(user, permission)) return fail("Permission denied", 403);
  return user;
}
export function isResponse(v: User | NextResponse): v is NextResponse { return v instanceof NextResponse; }
export async function audit(q: Pick<PoolClient, "query">, actor: string, action: string, entity: string, entityId: string, details: object) {
  await q.query("INSERT INTO audit_events(actor,action,entity,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)", [actor, action, entity, entityId, JSON.stringify(details)]);
}
export function entityName(value: string): Entity | null {
  return Object.hasOwn(entityConfig, value) ? value as Entity : null;
}
export async function createRecord(user: User, entity: Entity, data: Record<string, unknown>) {
  const cfg = entityConfig[entity];
  const values: Record<string, string | null> = {};
  for (const field of cfg.fields) {
    const value = data[field];
    if (value !== undefined) values[field] = value === null || value === "" ? null : String(value);
  }
  if (entity === "members") values.name = `${values.first_name || ""} ${values.last_name || ""}`.trim();
  if (user.role === "City Admin" && ["applications", "members", "requests", "pes"].includes(entity)) {
    if (!user.city) throw new Error("A city must be assigned to this account");
    if (values.city && values.city !== user.city) throw new Error("You can only create records in your assigned city");
    values.city = user.city;
  }
  const defaults: Partial<Record<Entity, Record<string, string>>> = {
    applications: { status: "Pending" }, members: { status: "Pending Payment" },
    plans: { status: "Active" }, services: { status: "Active" }, requests: { status: "New" },
    pes: { status: "Active" }, payments: { status: "Pending" }, invoices: { status: "Unpaid" },
  };
  Object.assign(values, Object.fromEntries(Object.entries(defaults[entity] || {}).filter(([k]) => !values[k])));
  const missing = cfg.required.find((field) => !values[field]?.trim());
  if (missing) throw new Error(`${missing.replaceAll("_", " ")} is required`);
  if (values.status && cfg.status && !cfg.status.includes(values.status)) throw new Error("Invalid status");
  if (entity === "applications" && values.status !== "Pending") throw new Error("New applications must enter the review queue as Pending");
  for (const field of cfg.numbers || []) {
    if (values[field] === null || values[field] === undefined) continue;
    const n = Number(values[field]);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${field.replaceAll("_", " ")} must be zero or more`);
  }
  if (entity === "members" && values.status !== "Pending Payment") throw new Error("Member activation requires a verified membership payment");
  if (entity === "payments" && values.status !== "Pending") throw new Error("Payment status requires a verified gateway event");
  if (entity === "invoices" && values.status === "Paid") throw new Error("Invoice payment requires a verified gateway event");
  if (entity === "requests" && values.pe_id) throw new Error("Create the request first, then use Assign PE to validate and record dispatch");
  if (entity === "requests") values.ticket = `EZ-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
  const columns = Object.keys(values);
  const args = columns.map((column) => values[column]);
  const placeholders = columns.map((_, i) => `$${i+1}`);
  const result = await pool.query(`INSERT INTO ${cfg.table} (${columns.join(",")}) VALUES (${placeholders.join(",")}) RETURNING id`, args);
  await audit(pool, user.email, "create", entity, result.rows[0].id, { fields: columns });
  return result.rows[0].id as string;
}
export { pool, can, currentUser, entityConfig, permissionFor };
