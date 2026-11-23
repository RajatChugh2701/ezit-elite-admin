import { NextResponse } from "next/server";
import { apiUser, isResponse, pool } from "@/lib/api";

export const runtime="nodejs";
export async function GET(){
 const user=await apiUser("reports");if(isResponse(user))return user;
 const {rows}=await pool.query(`SELECT
  (SELECT count(*)::int FROM members) members,
  (SELECT count(*)::int FROM requests) requests,
  (SELECT count(*)::int FROM pes) pes,
  (SELECT count(*)::int FROM payments) payments,
  (SELECT count(*)::int FROM invoices) invoices,
  (SELECT count(*)::int FROM invoices WHERE status='Unpaid') unpaid_invoices`);
 return NextResponse.json({generated_at:new Date().toISOString(),summary:rows[0]});
}
