import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppFrame } from "@/components/shell/AppFrame";
import { getMe } from "@/lib/api/server";
import { WORKSPACE_COOKIE } from "@/lib/session";
import { WorkspaceProvider } from "@/lib/workspace";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();
  if (!me?.user) {
    const next = (await headers()).get("x-orbit-path") ?? "/dashboard";
    redirect(`/api/auth/expired?next=${encodeURIComponent(next)}`);
  }
  const memberships = (me.memberships ?? []).filter((m) => m.workspace?.id);
  if (memberships.length === 0) redirect("/onboarding");
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const current = memberships.find((m) => m.workspace?.id === wanted) ?? memberships[0]!;
  return (
    <WorkspaceProvider user={me.user} membership={current} memberships={memberships}>
      <AppFrame>{children}</AppFrame>
    </WorkspaceProvider>
  );
}
