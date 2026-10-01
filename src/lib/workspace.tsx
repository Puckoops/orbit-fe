"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Member, Membership, User, Workspace } from "./api/models";

export type Role = "owner" | "manager" | "member";

export interface WorkspaceState {
  user: User;
  workspace: Workspace;
  member: Member;
  memberships: Membership[];
  role: Role;
  isManager: boolean;
  isOwner: boolean;
  currency: string;
  /** Prefixes a path with /workspaces/{id}. */
  path: (p: string) => string;
}

const Ctx = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({
  user,
  membership,
  memberships,
  children,
}: {
  user: User;
  membership: Membership;
  memberships: Membership[];
  children: ReactNode;
}) {
  const value = useMemo<WorkspaceState>(() => {
    const workspace = membership.workspace as Workspace;
    const member = membership.member as Member;
    const role = (member?.role ?? "member") as Role;
    return {
      user,
      workspace,
      member,
      memberships,
      role,
      isManager: role === "owner" || role === "manager",
      isOwner: role === "owner",
      currency: workspace?.base_currency || "GBP",
      path: (p: string) => `/workspaces/${workspace?.id}${p}`,
    };
  }, [user, membership, memberships]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
