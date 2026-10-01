import { unwrap } from "./envelope";

type Query = Record<string, string | number | boolean | null | undefined>;

function qs(query?: Query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`/api/orbit${path}${qs(query)}`, {
    method,
    headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    // A route handler, not a page: it clears the httpOnly cookie, so only a full navigation reaches it.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/auth/expired?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  return unwrap<T>(res);
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown, headers?: HeadersInit) => request<T>("POST", path, body ?? {}, undefined, headers),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string, query?: Query) => request<T>("DELETE", path, undefined, query),
};

export type { Query };
