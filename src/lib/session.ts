import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "orbit_session";
export const WORKSPACE_COOKIE = "orbit_ws";

/** The product user-svc signs people up and in for; signing in adds it to an account. */
export const PRODUCT = "orbit";

export function apiBase() {
  const base = process.env.ORBIT_API_URL;
  if (!base) throw new Error("ORBIT_API_URL is not set");
  return base.replace(/\/+$/, "");
}

export function userSvcBase() {
  const base = process.env.USER_SVC_URL;
  if (!base) throw new Error("USER_SVC_URL is not set");
  return base.replace(/\/+$/, "");
}

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export function sessionCookieOptions(expiresAtUnix?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(expiresAtUnix ? { expires: new Date(expiresAtUnix * 1000) } : {}),
  };
}
