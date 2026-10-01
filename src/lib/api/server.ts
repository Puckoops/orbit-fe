import "server-only";
import { cache } from "react";
import { accountGet } from "../account";
import { apiBase, sessionToken } from "../session";
import { ApiError, unwrap } from "./envelope";
import type { Me, Membership, User } from "./models";

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await sessionToken();
  if (!token) throw new ApiError(401, "Not signed in");
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...init.headers },
    cache: "no-store",
  });
  return unwrap<T>(res);
}

/**
 * The signed-in person, from user-svc, and their Orbit memberships, from orbit-be; once per request.
 * Null when the session is missing or rejected, or its account is gone.
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const token = await sessionToken();
  if (!token) return null;
  try {
    const [account, memberships] = await Promise.all([accountGet<User>("/users/me", token), serverFetch<Membership[]>("/workspaces")]);
    return { user: { id: account.id, name: account.name, email: account.email, avatar_url: account.avatar_url }, memberships: memberships ?? [] };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 404)) return null;
    throw e;
  }
});
