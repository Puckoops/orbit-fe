"use client";

import {
  Board,
  BoardCard,
  BoardColumn,
  Checkbox,
  ChoiceGroup,
  Page,
  PageHeader,
  PriorityMark,
  SearchInput,
  Select,
  Skeleton,
  toast,
} from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type DragEvent } from "react";
import { api } from "@/lib/api/client";
import { useLookups, useTasks } from "@/lib/api/hooks";
import type { Task } from "@/lib/api/models";
import { BLOCKED, ITEM_TYPE, TASK_STATUS, options, priorityLevel, taskStatus, type ItemType, type TaskStatus } from "@/lib/domain";
import { isoDay, longDate, shortDate } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { actionLabel, canMove, nextStep } from "@/lib/transitions";
import { useWorkspace } from "@/lib/workspace";
import { AddNewMenu } from "../create/CreateProvider";
import common from "../common/common.module.css";
import { TaskDrawer } from "./TaskDrawer";
import styles from "./tracker.module.css";

type Quick = "all" | "mine" | "week" | "risk";
type ColumnKey = "backlog" | "in_progress" | "in_review" | "redo" | "blocked" | "done";

const COLUMNS: { key: ColumnKey; label: string; glyph: (typeof TASK_STATUS)[TaskStatus]["glyph"] }[] = [
  { key: "backlog", label: TASK_STATUS.backlog.label, glyph: TASK_STATUS.backlog.glyph },
  { key: "in_progress", label: TASK_STATUS.in_progress.label, glyph: TASK_STATUS.in_progress.glyph },
  { key: "in_review", label: TASK_STATUS.in_review.label, glyph: TASK_STATUS.in_review.glyph },
  { key: "redo", label: TASK_STATUS.redo.label, glyph: TASK_STATUS.redo.glyph },
  { key: "blocked", label: BLOCKED.label, glyph: BLOCKED.glyph },
  { key: "done", label: TASK_STATUS.done.label, glyph: TASK_STATUS.done.glyph },
];

function columnOf(t: Task): ColumnKey | null {
  const s = taskStatus(t.status);
  if (s === "cancelled") return null;
  if (t.blocked?.is_blocked && s !== "done") return "blocked";
  if (s === "todo") return "backlog";
  return s;
}

function weekRange() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: isoDay(monday)!, to: isoDay(sunday)! };
}

export function Tracker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { path, workspace } = useWorkspace();
  const lookups = useLookups();

  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const [quick, setQuick] = useState<Quick>("all");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("");
  const [assignee, setAssignee] = useState("");
  const [archived, setArchived] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<ColumnKey | null>(null);
  const openTaskId = params.get("task");

  const week = weekRange();
  const query = {
    q,
    client_id: clientId,
    project_id: projectId,
    type,
    assignee_id: quick === "mine" ? "me" : assignee,
    archived: archived ? "include" : undefined,
    target_from: quick === "week" ? week.from : undefined,
    target_to: quick === "week" ? week.to : undefined,
    at_risk: quick === "risk" ? true : undefined,
  };
  const tasks = useTasks(query);
  const all = useTasks({ page_size: 1 });

  const columns = useMemo(() => {
    const map = new Map<ColumnKey, Task[]>(COLUMNS.map((c) => [c.key, []]));
    for (const t of tasks.data?.items ?? []) {
      const col = columnOf(t);
      if (col) map.get(col)!.push(t);
    }
    return map;
  }, [tasks.data]);

  const filtered = quick !== "all" || q || clientId || projectId || type || assignee || archived;
  const clientProjects = lookups.projects.filter((p) => (!clientId || p.client_id === clientId) && !p.is_draft);

  const openTask = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("task", id);
    else next.delete("task");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const refresh = () =>
    Promise.all(["tasks", "dashboard", "calendar", "files"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));

  const move = async (task: Task, to: ColumnKey) => {
    const from = columnOf(task);
    if (!from || from === to) return;
    const status = taskStatus(task.status);
    try {
      if (to === "blocked") {
        await api.put(path(`/tasks/${task.id}/blocked`), { version: task.version, is_blocked: true });
        toast("Marked as blocked", { description: task.title ?? undefined });
        return;
      }
      let version = task.version;
      if (from === "blocked") {
        const unblocked = await api.put<Task>(path(`/tasks/${task.id}/blocked`), { version, is_blocked: false });
        version = unblocked.version;
      }
      const target = (to === "backlog" && status === "todo" ? "todo" : to) as TaskStatus;
      if (target === status) return;
      if (!canMove(status, target)) {
        const step = nextStep(status, target);
        toast.error(
          `${TASK_STATUS[status].label} can't go straight to ${TASK_STATUS[target].label}`,
          step ? `${actionLabel(status, step)} first.` : undefined,
        );
        return;
      }
      await api.post(path(`/tasks/${task.id}/transitions`), { version, to: target });
    } catch (e) {
      toast.error("Couldn't move the card", e instanceof Error ? e.message : undefined);
    } finally {
      await refresh();
    }
  };

  const onDrop = (e: DragEvent, col: ColumnKey) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/task-id");
    const task = tasks.data?.items.find((t) => t.id === id);
    setDragging(null);
    if (task) void move(task, col);
  };

  const clear = () => {
    setSearch("");
    setQuick("all");
    setClientId("");
    setProjectId("");
    setType("");
    setAssignee("");
    setArchived(false);
  };

  return (
    <Page wide>
      <PageHeader title="Tracker" subtitle="Every piece of work across the studio, by status." actions={<AddNewMenu />} />

      <SearchInput placeholder="Search tasks, bugs, deliverables" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className={styles.filters}>
        <ChoiceGroup<Quick>
          look="pill"
          aria-label="Quick filter"
          value={quick}
          onValueChange={setQuick}
          options={[
            { value: "all", label: "All work" },
            { value: "mine", label: "Mine" },
            { value: "week", label: "Due this week" },
            { value: "risk", label: "At risk" },
          ]}
        />
        <span className={styles.divider} aria-hidden="true" />
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
        <Select variant="filter" allLabel="All types" value={type} onValueChange={setType} options={options(ITEM_TYPE)} aria-label="Type" />
        <Select
          variant="filter"
          allLabel="Anyone"
          value={quick === "mine" ? "" : assignee}
          onValueChange={(v) => {
            setAssignee(v);
            if (quick === "mine") setQuick("all");
          }}
          options={lookups.members.map((m) => ({ value: m.user_id!, label: m.display_name ?? "Member" }))}
          aria-label="Assignee"
        />
        <Checkbox label="Include archived" checked={archived} onCheckedChange={setArchived} />
        <span className={common.spacer} />
        <button type="button" className={common.clear} onClick={clear} disabled={!filtered}>
          Clear
        </button>
      </div>
      <p className={`num-sm ${styles.count}`}>
        {tasks.data ? `${tasks.data.total} of ${all.data?.total ?? tasks.data.total} items` : " "}
        {tasks.data && tasks.data.total > tasks.data.items.length ? ` · showing the first ${tasks.data.items.length}` : ""}
      </p>

      <Board className={styles.board}>
        {COLUMNS.map((col) => {
          const items = columns.get(col.key) ?? [];
          return (
            <BoardColumn
              key={col.key}
              title={col.label}
              glyph={col.glyph}
              count={tasks.isLoading ? undefined : items.length}
              over={over === col.key}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOver(col.key);
              }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={(e) => onDrop(e, col.key)}
            >
              {tasks.isLoading
                ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} height={84} radius="8px" />)
                : items.map((t) => (
                    <BoardCard
                      key={t.id}
                      draggable
                      dragging={dragging === t.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/task-id", t.id!);
                        e.dataTransfer.effectAllowed = "move";
                        setDragging(t.id!);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      onOpen={() => openTask(t.id!)}
                      title={t.title}
                      meta={lookups.clientName(t.client_id)}
                      start={<span title={longDate(t.dates?.target_at)}>{t.dates?.target_at ? shortDate(t.dates.target_at) : "—"}</span>}
                      end={t.status === "done" ? <span className="text-4">—</span> : <PriorityMark level={priorityLevel(t.priority)} glyph={false} />}
                      aria-label={`${t.title}, ${ITEM_TYPE[(t.type as ItemType) ?? "task"]?.label ?? "Task"}`}
                    />
                  ))}
            </BoardColumn>
          );
        })}
      </Board>
      <p className={`caption ${styles.footnote}`}>
        Re-do sits between In Review and Done on purpose — work that bounces back keeps its original due date so the slip stays visible.
      </p>

      <TaskDrawer taskId={openTaskId} onClose={() => openTask(null)} />
    </Page>
  );
}
