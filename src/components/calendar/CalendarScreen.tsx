"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button, Checkbox, Glyph, IconButton, Page, PageHeader, SegmentedControl, Select, Skeleton } from "@puckoops/camelot";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCalendar, useLookups } from "@/lib/api/hooks";
import { isoDay } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { AddNewMenu } from "../create/CreateProvider";
import { layersFor, monthGrid, OVERLAYS, toItems, weekOf, type CalItem, type Overlay } from "./model";
import { Timeline } from "./Timeline";
import styles from "./calendar.module.css";

type View = "month" | "week" | "timeline" | "agenda";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Dot({ marker }: { marker: CalItem["marker"] }) {
  return <span className={`${styles.dot} ${styles[marker]}`} aria-hidden="true" />;
}

function ItemLine({ item }: { item: CalItem }) {
  const body = (
    <>
      <Dot marker={item.marker} />
      <span className={styles.itemLabel}>{item.label}</span>
    </>
  );
  return item.href ? (
    <Link href={item.href} className={styles.item} title={item.label}>
      {body}
    </Link>
  ) : (
    <span className={styles.item} title={item.label}>
      {body}
    </span>
  );
}

export function CalendarScreen() {
  const { isManager } = useWorkspace();
  const lookups = useLookups();
  const today = new Date();
  const [anchor, setAnchor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [view, setView] = useState<View>("month");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [on, setOn] = useState<Set<Overlay>>(new Set(isManager ? ["targets", "invoices", "payables", "workorders"] : ["targets", "workorders"]));

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const week = useMemo(() => weekOf(weekAnchor), [weekAnchor]);
  const from = view === "week" ? week[0]!.day : grid[0]!.day;
  const to = view === "week" ? week[6]!.day : grid[grid.length - 1]!.day;
  const cal = useCalendar(from, to, layersFor(on));

  const projectClient = (id?: string | null) => (id ? (lookups.projectById.get(id)?.client_id ?? undefined) : undefined);
  const items = useMemo(
    () =>
      toItems(cal.data, on, projectClient).filter(
        (it) => (!clientId || it.clientId === clientId) && (!projectId || it.projectId === projectId),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cal.data, on, clientId, projectId, lookups.projectById],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const it of items) m.set(it.day, [...(m.get(it.day) ?? []), it]);
    return m;
  }, [items]);

  const todayIso = isoDay(today);
  const shift = (delta: number) => {
    if (view === "week") {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() + delta * 7);
      setWeekAnchor(d);
      setAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
    } else setAnchor(new Date(year, month + delta, 1));
  };
  const toggle = (k: Overlay, v: boolean) =>
    setOn((s) => {
      const n = new Set(s);
      if (v) n.add(k);
      else n.delete(k);
      return n;
    });

  const years = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);
  const visibleOverlays = OVERLAYS.filter((o) => isManager || (o.key !== "invoices" && o.key !== "payables"));
  const clientProjects = lookups.projects.filter((p) => (!clientId || p.client_id === clientId) && !p.is_draft);

  return (
    <Page wide>
      <PageHeader title="Calendar" subtitle="Deliveries, invoices and studio load across the month." actions={<AddNewMenu />} />

      <div className={styles.controls}>
        <IconButton icon={ArrowLeft01Icon} aria-label={view === "week" ? "Previous week" : "Previous month"} onClick={() => shift(-1)} />
        <h2 className={`h2 ${styles.title}`}>
          {MONTHS[month]} {year}
        </h2>
        <IconButton icon={ArrowRight01Icon} aria-label={view === "week" ? "Next week" : "Next month"} onClick={() => shift(1)} />
        <Select
          variant="filter"
          value={String(month)}
          onValueChange={(v) => setAnchor(new Date(year, Number(v), 1))}
          options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
          aria-label="Month"
        />
        <Select
          variant="filter"
          value={String(year)}
          onValueChange={(v) => setAnchor(new Date(Number(v), month, 1))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          aria-label="Year"
        />
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            setAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
            setWeekAnchor(today);
          }}
        >
          Today
        </Button>
        <span className={styles.grow} />
        <SegmentedControl<View>
          aria-label="View"
          value={view}
          onValueChange={setView}
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
            { value: "timeline", label: "Timeline" },
            { value: "agenda", label: "Agenda" },
          ]}
        />
      </div>

      <div className={styles.filters}>
        <Select
          variant="filter"
          allLabel="All clients"
          value={clientId}
          onValueChange={(v) => {
            setClientId(v);
            setProjectId("");
          }}
          options={lookups.clients.map((c) => ({ value: c.id!, label: c.name ?? "Client" }))}
          aria-label="Client"
        />
        <Select
          variant="filter"
          allLabel="All projects"
          value={projectId}
          onValueChange={setProjectId}
          options={clientProjects.map((p) => ({ value: p.id!, label: p.name ?? "Project" }))}
          aria-label="Project"
        />
        <span className={styles.grow} />
        {visibleOverlays.map((o) => (
          <Checkbox key={o.key} label={o.label} checked={on.has(o.key)} onCheckedChange={(v) => toggle(o.key, v)} />
        ))}
      </div>

      {cal.isLoading ? (
        <Skeleton height={520} radius="14px" />
      ) : view === "month" ? (
        <div className={styles.month} role="grid" aria-label={`${MONTHS[month]} ${year}`}>
          {DOW.map((d) => (
            <div key={d} className={`caps ${styles.dow}`} role="columnheader">
              {d}
            </div>
          ))}
          {grid.map((cell) => {
            const list = byDay.get(cell.day) ?? [];
            return (
              <div key={cell.day} className={`${styles.cell} ${cell.inMonth ? "" : styles.outside}`} role="gridcell">
                <span className={`num ${styles.date} ${cell.day === todayIso ? styles.today : ""}`}>{String(cell.date.getDate()).padStart(2, "0")}</span>
                {list.slice(0, 3).map((it) => (
                  <ItemLine key={it.id} item={it} />
                ))}
                {list.length > 3 && <span className={`caption ${styles.more}`}>+{list.length - 3} more</span>}
              </div>
            );
          })}
        </div>
      ) : view === "week" ? (
        <div className={styles.week}>
          {week.map((d) => (
            <div key={d.day} className={styles.weekCol}>
              <div className={`caps ${styles.weekHead}`}>
                {DOW[(d.date.getDay() + 6) % 7]} <span className={`num ${d.day === todayIso ? styles.today : ""}`}>{String(d.date.getDate()).padStart(2, "0")}</span>
              </div>
              <div className={styles.weekBody}>
                {(byDay.get(d.day) ?? []).map((it) => (
                  <div key={it.id} className={styles.block}>
                    <ItemLine item={it} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : view === "timeline" ? (
        <Timeline data={cal.data} from={grid.find((c) => c.inMonth)!.day} to={[...grid].reverse().find((c) => c.inMonth)!.day} clientName={lookups.clientName} clientId={clientId} projectId={projectId} />
      ) : (
        <div className={styles.agenda}>
          {[...byDay.keys()]
            .filter((day) => day.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
            .sort()
            .map((day) => {
              const d = new Date(`${day}T12:00:00`);
              return (
                <section key={day}>
                  <h3 className={`num-sm ${styles.agendaDay}`}>
                    {DOW[(d.getDay() + 6) % 7]} {String(d.getDate()).padStart(2, "0")} {MONTHS[d.getMonth()]!.slice(0, 3)}
                  </h3>
                  {(byDay.get(day) ?? []).map((it) => (
                    <div key={it.id} className={styles.agendaRow}>
                      <ItemLine item={it} />
                      <span className="small text-4">{lookups.clientName(it.clientId)}</span>
                    </div>
                  ))}
                </section>
              );
            })}
          {items.length === 0 && <p className={`small ${styles.agendaEmpty}`}>Nothing is dated this month with these overlays.</p>}
        </div>
      )}

      <p className={`caption ${styles.key}`}>
        <span>
          <Dot marker="task" /> Deliverable target
        </span>
        {isManager && (
          <>
            <span>
              <Dot marker="invoice" /> Invoice due
            </span>
            <span>
              <Dot marker="payable" /> Payable due
            </span>
          </>
        )}
        <span>
          <Dot marker="workorder" /> Work order
        </span>
        <span>
          <Glyph shape="circle" size={10} /> Reviewer capacity
        </span>
      </p>
    </Page>
  );
}
