import { NextResponse } from "next/server";
import { SESSION_COOKIE, WORKSPACE_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ status: 200, error: false });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(WORKSPACE_COOKIE);
  return response;
}
