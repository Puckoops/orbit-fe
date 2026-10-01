import { NextResponse } from "next/server";
import { sessionCookieOptions, WORKSPACE_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { workspace_id?: string } | null;
  if (!body?.workspace_id || !/^[0-9a-f]{24}$/.test(body.workspace_id)) {
    return NextResponse.json({ status: 400, error: true, message: "workspace_id must be a 24-character hex id" }, { status: 400 });
  }
  const response = NextResponse.json({ status: 200, error: false });
  response.cookies.set(WORKSPACE_COOKIE, body.workspace_id, { ...sessionCookieOptions(), maxAge: 60 * 60 * 24 * 365 });
  return response;
}
