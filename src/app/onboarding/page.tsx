import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getMe } from "@/lib/api/server";

export const metadata: Metadata = { title: "Set up your studio" };

export default async function OnboardingPage() {
  const me = await getMe();
  if (!me?.user) redirect("/api/auth/expired?next=/onboarding");
  return (
    <AuthFrame>
      <OnboardingForm name={me.user.name ?? ""} hasWorkspaces={(me.memberships ?? []).length > 0} />
    </AuthFrame>
  );
}
