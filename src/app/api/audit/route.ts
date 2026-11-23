import { NextResponse } from "next/server";
import { apiUser, fail, isResponse, pool } from "@/lib/api";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const user=await apiUser();
  if(isResponse(user))return user;
  if(user.role!=="Admin"&&!user.permissions.includes("reports"))return fail("Permission denied",403);
  const url=new URL(request.url),page=Math.max(1,Number(url.searchParams.get("page")||1)),size=Math.min(100,Math.max(10,Number(url.searchParams.get("size")||20)));
  const count=await pool.query("SELECT count(*)::int total FROM audit_events");
  const {rows}=await pool.query("SELECT * FROM audit_events ORDER BY id DESC LIMIT $1 OFFSET $2",[size,(page-1)*size]);
  return NextResponse.json({items:rows,total:count.rows[0].total,page,pages:Math.max(1,Math.ceil(count.rows[0].total/size))});
}
