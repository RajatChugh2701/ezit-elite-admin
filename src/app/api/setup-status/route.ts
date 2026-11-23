import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export async function GET() {
  const { rows } = await pool.query("SELECT EXISTS(SELECT 1 FROM users WHERE role='Admin' AND active=true) AS is_setup");
  return NextResponse.json({ setup: !rows[0].is_setup });
}
