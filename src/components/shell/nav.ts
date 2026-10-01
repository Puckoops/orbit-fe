import {
  Calendar03Icon,
  DashboardSquare02Icon,
  Invoice01Icon,
  MoneyExchange01Icon,
  PackageIcon,
  Task01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import type { IconDefinition } from "@puckoops/camelot";

export interface NavItem {
  href: string;
  label: string;
  icon: IconDefinition;
}

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: DashboardSquare02Icon },
      { href: "/tracker", label: "Tracker", icon: Task01Icon },
      { href: "/calendar", label: "Calendar", icon: Calendar03Icon },
    ],
  },
  { label: "Ledger", items: [{ href: "/obligations", label: "Obligations", icon: MoneyExchange01Icon }] },
  {
    label: "Files & people",
    items: [
      { href: "/inventory", label: "Inventory", icon: PackageIcon },
      { href: "/clients", label: "Clients", icon: UserIcon },
    ],
  },
  { label: "Money", items: [{ href: "/payments", label: "Payments", icon: Invoice01Icon }] },
];

export const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tracker": "Tracker",
  "/calendar": "Calendar",
  "/obligations": "Obligations",
  "/inventory": "Inventory",
  "/clients": "Clients",
  "/payments": "Payments",
  "/projects/new": "New project",
  "/settings": "Profile settings",
};
