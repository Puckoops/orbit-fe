import { NextResponse, type NextRequest } from "next/server";
import { apiBase, SESSION_COOKIE } from "@/lib/session";

const FORWARDED_REQUEST_HEADERS = ["content-type", "idempotency-key", "accept"];

async function forward(request: NextRequest, ctx: RouteContext<"/api/orbit/[...path]">) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ status: 401, error: true, message: "Not signed in" }, { status: 401 });
  }
  const { path } = await ctx.params;
  if (path.some((segment) => segment === "." || segment === ".." || segment.includes("/"))) {
    return NextResponse.json({ status: 400, error: true, message: "Bad path" }, { status: 400 });
  }
  const target = `${apiBase()}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers({ Authorization: `Bearer ${token}` });
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const body = await upstream.arrayBuffer();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
  if (upstream.status === 401) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
