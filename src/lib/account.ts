import "server-only";
import { unwrap } from "./api/envelope";
import { PRODUCT, userSvcBase } from "./session";

export interface Reply<T> {
  status: number;
  ok: boolean;
  message?: string;
  data?: T;
}

/** One sign-in flow call to user-svc, always naming Orbit as the product. */
export async function accountPost<T>(path: string, body: Record<string, unknown>): Promise<Reply<T>> {
  try {
    const res = await fetch(`${userSvcBase()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, type: PRODUCT }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { error?: boolean; message?: string; data?: T } | null;
    return { status: res.status, ok: res.ok && !!json && !json.error, message: json?.message, data: json?.data };
  } catch {
    return { status: 502, ok: false };
  }
}

/** Reads from user-svc as the signed-in person; throws ApiError like serverFetch. */
export async function accountGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${userSvcBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  return unwrap<T>(res);
}

/** A path on this site to return to after signing in, or null for anything that could leave it. */
export function safeNext(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.startsWith("/api/")
    ? value
    : null;
}

/** Where a confirmation link lands: /verify here, carrying where to go after signing in. */
export function verifyUrl(origin: string, next: string | null) {
  const url = new URL("/verify", origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}
