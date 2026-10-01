"use client";

import { Logout03Icon, MoreHorizontalIcon, Settings02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { IconButton, Menu, MenuGroup, MenuItem, MenuLabel, MenuSeparator, SegmentedControl, useTheme, type ThemePreference } from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace";

export function UserMenu() {
  const router = useRouter();
  const qc = useQueryClient();
  const { preference, setPreference } = useTheme();
  const { memberships, workspace } = useWorkspace();

  const switchTo = async (id: string) => {
    await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspace_id: id }) });
    qc.clear();
    router.push("/dashboard");
    router.refresh();
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.clear();
    router.push("/login");
    router.refresh();
  };

  return (
    <Menu trigger={<IconButton icon={MoreHorizontalIcon} aria-label="Account" variant="bare" size="sm" />} side="top" align="start" minWidth={232}>
      <MenuItem icon={Settings02Icon} onSelect={() => router.push("/settings")}>
        Profile settings
      </MenuItem>
      <MenuLabel>Appearance</MenuLabel>
      <MenuGroup>
        <SegmentedControl<ThemePreference>
          aria-label="Appearance"
          size="sm"
          value={preference}
          onValueChange={setPreference}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ]}
        />
      </MenuGroup>
      {memberships.length > 1 && (
        <>
          <MenuSeparator />
          <MenuLabel>Workspaces</MenuLabel>
          {memberships.map((m) => (
            <MenuItem
              key={m.workspace!.id!}
              icon={m.workspace!.id === workspace.id ? Tick02Icon : undefined}
              onSelect={() => m.workspace!.id !== workspace.id && switchTo(m.workspace!.id!)}
            >
              {m.workspace!.name}
            </MenuItem>
          ))}
        </>
      )}
      <MenuSeparator />
      <MenuItem icon={Logout03Icon} onSelect={signOut}>
        Sign out
      </MenuItem>
    </Menu>
  );
}
