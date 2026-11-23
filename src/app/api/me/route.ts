import { NextResponse } from "next/server";
import { currentUser, fail } from "@/lib/api";

export const runtime = "nodejs";
export async function GET() {
  const user = await currentUser();
  return user ? NextResponse.json(user) : fail("Sign in required", 401);
}
