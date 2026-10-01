import { NextResponse } from "next/server";
import type { Reply } from "@/lib/account";

/** Answers the browser for a user-svc call that failed, in Orbit's words where there are some for that status. */
export function failure(reply: Reply<unknown>, messages: Partial<Record<number, string>>) {
  const status = reply.status >= 400 ? reply.status : 502;
  const fallback = status >= 500 ? "Something went wrong. Try again in a moment." : reply.message;
  return NextResponse.json({ status, error: true, message: messages[status] ?? fallback ?? "That didn't work. Try again." }, { status });
}
