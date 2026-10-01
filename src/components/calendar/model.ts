import type { Calendar } from "@/lib/api/models";
import { isoDay } from "@/lib/format";

export type Overlay = "targets" | "invoices" | "payables" | "workorders" | "capacity";
export type Marker = "task" | "invoice" | "payable" | "workorder" | "capacity";

export interface CalItem {
  id: string;
  day: string;
  label: string;
  marker: Marker;
  clientId?: string | null;
  projectId?: string | null;
  href?: string;
}

export const OVERLAYS: { key: Overlay; label: string; layer: string }[] = [
  { key: "targets", label: "Deliverable targets", layer: "tasks" },
  { key: "invoices", label: "Invoice due dates", layer: "obligations" },
  { key: "payables", label: "Payable due dates", layer: "obligations" },
  { key: "workorders", label: "Work order start / end", layer: "work_orders" },
  { key: "capacity", label: "Reviewer capacity", layer: "reviewer_load" },
];

export function layersFor(on: Set<Overlay>) {
  return [...new Set(OVERLAYS.filter((o) => on.has(o.key)).map((o) => o.layer))];
}

/** Flattens the API's layers into per-day items, applying the overlay toggles and the client/project filters. */
export function toItems(cal: Calendar | undefined, on: Set<Overlay>, projectClient: (projectId?: string | null) => string | undefined) {
  const items: CalItem[] = [];
  if (!cal) return items;
  if (on.has("targets")) {
    for (const t of cal.tasks ?? []) {
      const day = isoDay(t.target_at);
      if (!day) continue;
      items.push({
        id: `t${t.task_id}`,
        day,
        label: t.title ?? "Task",
        marker: "task",
        clientId: t.client_id ?? projectClient(t.project_id),
        projectId: t.project_id,
        href: `/tracker?task=${t.task_id}`,
      });
    }
  }
  for (const o of cal.obligations ?? []) {
    const receivable = o.direction === "receivable";
    if ((receivable && !on.has("invoices")) || (!receivable && !on.has("payables"))) continue;
    const day = isoDay(o.due_at);
    if (!day) continue;
    items.push({
      id: `o${o.obligation_id}`,
      day,
      label: receivable ? `${o.title || o.ref} due` : (o.title || o.ref || "Payable"),
      marker: receivable ? "invoice" : "payable",
      clientId: o.client_id,
      projectId: o.project_id,
      href: `/obligations?obligation=${o.obligation_id}`,
    });
  }
  if (on.has("workorders")) {
    for (const w of cal.work_orders ?? []) {
      const start = isoDay(w.start_at);
      const end = isoDay(w.end_at);
      const name = w.name || w.code || "Work order";
      const href = w.client_id ? `/clients/${w.client_id}?project=${w.project_id}` : undefined;
      const base = { marker: "workorder" as const, clientId: w.client_id, projectId: w.project_id, href };
      if (start) items.push({ ...base, id: `ws${w.project_id}`, day: start, label: `${name} starts` });
      if (end) items.push({ ...base, id: `we${w.project_id}`, day: end, label: `${name} ends` });
    }
  }
  if (on.has("capacity")) {
    const byDay = new Map<string, { pending: number; capacity: number }>();
    for (const r of cal.reviewer_load ?? []) {
      for (const d of r.days ?? []) {
        if (!d.date) continue;
        const cur = byDay.get(d.date) ?? { pending: 0, capacity: 0 };
        cur.pending += d.pending ?? 0;
        cur.capacity += d.capacity ?? 0;
        byDay.set(d.date, cur);
      }
    }
    for (const [day, v] of byDay) {
      if (!v.capacity || !v.pending) continue;
      const pct = Math.round((v.pending / v.capacity) * 100);
      if (pct >= 50) items.push({ id: `c${day}`, day, label: `Reviewer capacity ${pct}%`, marker: "capacity" });
    }
  }
  return items;
}

export function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const last = new Date(year, month + 1, 0);
  const cells = Math.ceil((offset + last.getDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { day: isoDay(d)!, date: d, inMonth: d.getMonth() === month };
  });
}

export function weekOf(anchor: Date) {
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { day: isoDay(d)!, date: d };
  });
}
