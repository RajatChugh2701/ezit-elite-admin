import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForPg = globalThis as unknown as { pgPool?: Pool };
export const pool = globalForPg.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});
if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;
export const db = drizzle(pool, { schema });
