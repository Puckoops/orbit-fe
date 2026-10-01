import { NextResponse } from "next/server";
import { accountPost } from "@/lib/account";
import { SESSION_COOKIE, sessionCookieOptions, WORKSPACE_COOKIE } from "@/lib/session";
import { failure } from "../shared";

interface Login {
  token: string;
  expire_at: number;
  user: { id: string; name: string; email: string };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const reply = await accountPost<Login>("/user/login", { email: body?.email, password: body?.password });
  if (!reply.ok || !reply.data?.token) {
    return failure(reply, {
      400: "Invalid email or password.",
      403: "Confirm your email before signing in: open the link we sent you, or send a new one.",
    });
  }
  const response = NextResponse.json({ status: 200, error: false, data: { user: reply.data.user } });
  response.cookies.set(SESSION_COOKIE, reply.data.token, sessionCookieOptions(reply.data.expire_at));
  response.cookies.delete(WORKSPACE_COOKIE);
  return response;
}

export function GET() {
  return NextResponse.json({ status: 405, error: true, message: "Use POST" }, { status: 405 });
}
