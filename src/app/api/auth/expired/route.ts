import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/account";
import { SESSION_COOKIE, WORKSPACE_COOKIE } from "@/lib/session";

/** Where a page lands when orbit-be rejects the stored token: clear it, then sign in again. */
export function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next") ?? "/dashboard");
  const login = new URL("/login", request.url);
  if (next) login.searchParams.set("next", next);
  const response = NextResponse.redirect(login);
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(WORKSPACE_COOKIE);
  return response;
}
