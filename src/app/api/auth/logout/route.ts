import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearCookie, clearSession } from "@/lib/auth";

export const runtime = "nodejs";
export async function POST() {
  const cookieStore = await cookies();
  await clearSession(cookieStore.get("ezit_session")?.value);
  return clearCookie(NextResponse.json({ ok: true }));
}
