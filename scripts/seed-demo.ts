import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(await readFile(new URL("../drizzle/seed-demo.sql", import.meta.url), "utf8"));
  const { rows } = await pool.query(`SELECT
    (SELECT count(*)::int FROM plans) plans,
    (SELECT count(*)::int FROM service_categories) categories,
    (SELECT count(*)::int FROM services) services,
    (SELECT count(*)::int FROM pes) personal_executives,
    (SELECT count(*)::int FROM applications) applications,
    (SELECT count(*)::int FROM members) members,
    (SELECT count(*)::int FROM requests) requests,
    (SELECT count(*)::int FROM payments) payments,
    (SELECT count(*)::int FROM invoices) invoices,
    (SELECT count(*)::int FROM audit_events) audit_events`);
  console.log("Demo seed applied; database record totals:", rows[0]);
} finally {
  await pool.end();
}
