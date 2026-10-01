import { NextResponse, type NextRequest } from "next/server";
import { accountPost, safeNext, verifyUrl } from "@/lib/account";
import { failure } from "../shared";

/** Creates the account; it can sign in once the address is confirmed through the emailed link. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const reply = await accountPost("/user/signup", {
    name: body?.name,
    email: body?.email,
    password: body?.password,
    role: "member",
    verify_url: verifyUrl(request.nextUrl.origin, safeNext(body?.next)),
  });
  if (!reply.ok) {
    return failure(reply, { 409: "An account with this email already exists. Sign in with it: one Puckoops account works in Orbit too." });
  }
  return NextResponse.json({ status: 201, error: false, data: { email: body?.email } }, { status: 201 });
}
