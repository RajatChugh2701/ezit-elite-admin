import { NextResponse } from "next/server";
import { apiUser, isResponse, pool } from "@/lib/api";

export const runtime = "nodejs";
export async function GET() {
  const user=await apiUser("dashboard");
  if(isResponse(user))return user;
  const {rows}=await pool.query(`SELECT
    (SELECT count(*)::int FROM members) AS members,
    (SELECT count(*)::int FROM requests WHERE status NOT IN ('Completed','Cancelled')) AS open_requests,
    (SELECT count(*)::int FROM requests WHERE pe_id IS NULL AND status NOT IN ('Completed','Cancelled')) AS unassigned,
    (SELECT count(*)::int FROM pes WHERE status='Active') AS active_pes,
    (SELECT count(*)::int FROM pes) AS total_pes,
    (SELECT count(*)::int FROM payments WHERE status='Pending') AS pending_payments,
    (SELECT count(*)::int FROM invoices WHERE status='Unpaid') AS open_invoices`);
  const recent=await pool.query("SELECT id,ticket,member,service,city,status,created_at FROM requests ORDER BY created_at DESC LIMIT 5");
  return NextResponse.json({metrics:rows[0],recent:recent.rows});
}
