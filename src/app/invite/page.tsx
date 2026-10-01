import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { AcceptInvite } from "@/components/auth/AcceptInvite";

export const metadata: Metadata = { title: "Join a workspace" };

export default function InvitePage() {
  return (
    <AuthFrame>
      <Suspense>
        <AcceptInvite />
      </Suspense>
    </AuthFrame>
  );
}
