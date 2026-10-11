import { NextResponse } from "next/server";
import { accountPost } from "@/lib/account";
import { SESSION_COOKIE, sessionCookieOptions, WORKSPACE_COOKIE } from "@/lib/session";
import { failure } from "../shared";

interface Login {
  token: string;
  expire_at: number;
  user: { id: string; name: string; email: string };
}

/** Signs in with the credential from Google's button; the first sign-in creates the account. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const credential = typeof body?.credential === "string" ? body.credential : "";
  if (!credential) {
    return NextResponse.json({ status: 400, error: true, message: "Google didn't send a sign-in. Try again." }, { status: 400 });
  }
  const reply = await accountPost<Login>("/user/oauth", { provider: "google", id_token: credential });
  if (!reply.ok || !reply.data?.token) {
    return failure(reply, {
      400: "Google sign-in isn't available right now. Sign in with your email instead.",
      401: "Google couldn't confirm it's you. Try again.",
      403: "This Google account can't sign in to Orbit. Sign in with your email instead.",
      409: "This email is linked to a different Google account. Sign in with your email and password instead.",
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
