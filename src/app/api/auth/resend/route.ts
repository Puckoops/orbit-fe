import { NextResponse, type NextRequest } from "next/server";
import { accountPost, safeNext, verifyUrl } from "@/lib/account";
import { failure } from "../shared";

/** Sends a fresh confirmation link. user-svc answers the same whether or not the address has an unconfirmed account. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const reply = await accountPost("/user/resend-verification", {
    email: body?.email,
    verify_url: verifyUrl(request.nextUrl.origin, safeNext(body?.next)),
  });
  if (!reply.ok) return failure(reply, {});
  return NextResponse.json({ status: 200, error: false });
}
