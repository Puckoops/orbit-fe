"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import {
  AppShell,
  Avatar,
  Breadcrumbs,
  IconButton,
  Sidebar,
  SidebarBrand,
  SidebarFooter,
  SidebarItem,
  SidebarSection,
  SidebarUser,
  Topbar,
  useTheme,
} from "@puckoops/camelot";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useWorkspace } from "@/lib/workspace";
import { CreateProvider } from "../create/CreateProvider";
import { UploadProvider } from "../upload/UploadProvider";
import { CrumbProvider, useCrumbExtra } from "./crumbs";
import { GlobalSearch } from "./GlobalSearch";
import { NAV, TITLES } from "./nav";
import { UserMenu } from "./UserMenu";

function ThemeToggle() {
  const { resolved, setPreference } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <IconButton
      icon={resolved === "dark" ? Moon02Icon : Sun03Icon}
      aria-label={`Switch to ${next} theme`}
      variant="bare"
      size="sm"
      onClick={() => setPreference(next)}
    />
  );
}

function Crumbs() {
  const pathname = usePathname();
  const extra = useCrumbExtra();
  const base = Object.keys(TITLES).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  const items = [{ label: "ORBIT", href: "/dashboard" }];
  if (base && (pathname !== base || !extra)) items.push({ label: TITLES[base]!, href: base });
  if (extra) items.push({ label: extra, href: pathname });
  return <Breadcrumbs items={items} linkAs={Link} />;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, workspace } = useWorkspace();
  const name = user.name ?? user.email ?? "You";
  return (
    <CrumbProvider>
      <CreateProvider>
        <UploadProvider>
        <AppShell
          sidebar={
            <Sidebar aria-label="Primary">
              <SidebarBrand name="ORBIT" as={Link} href="/dashboard" end={<ThemeToggle />} />
              {NAV.map((section) => (
                <SidebarSection key={section.label} label={section.label}>
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      as={Link}
                      href={item.href}
                      icon={item.icon}
                      current={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    >
                      {item.label}
                    </SidebarItem>
                  ))}
                </SidebarSection>
              ))}
              <SidebarFooter note={workspace.name ?? undefined}>
                <SidebarUser name={name} email={user.email ?? undefined} avatar={<Avatar name={name} src={user.avatar_url} />} menu={<UserMenu />} />
              </SidebarFooter>
            </Sidebar>
          }
        >
          <Topbar start={<Crumbs />} end={<GlobalSearch />} />
          {children}
        </AppShell>
        </UploadProvider>
      </CreateProvider>
    </CrumbProvider>
  );
}
