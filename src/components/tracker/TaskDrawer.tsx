"use client";

import { Add01Icon, Download01Icon, Link04Icon } from "@hugeicons/core-free-icons";
import {
  Button,
  Chip,
  ChoiceGroup,
  DateInput,
  DescriptionList,
  Drawer,
  DrawerSection,
  Glyph,
  Icon,
  IconButton,
  Input,
  PriorityMark,
  Select,
  Skeleton,
  Stack,
  Textarea,
  toast,
} from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { describe } from "@/lib/activity";
import { api } from "@/lib/api/client";
import { useActivity, useFiles, useLookups, useTask } from "@/lib/api/hooks";
import type { TaskDetail } from "@/lib/api/models";
import { BLOCKED, ITEM_TYPE, TASK_STATUS, priorityLevel, taskStatus, type ItemType, type TaskStatus } from "@/lib/domain";
import { bytes, dayToInstant, isoDay, longDate, shortDate } from "@/lib/format";
import { ALLOWED, actionLabel } from "@/lib/transitions";
import { useWorkspace } from "@/lib/workspace";
import { useUpload } from "../upload/UploadProvider";
import styles from "./taskDrawer.module.css";

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  return (
    <Drawer open={Boolean(taskId)} onOpenChange={(o) => !o && onClose()} title={taskId ? <TaskTitle taskId={taskId} /> : "Task"} width={520}>
      {taskId && <TaskBody taskId={taskId} />}
    </Drawer>
  );
}

function TaskTitle({ taskId }: { taskId: string }) {
  const { data } = useTask(taskId);
  return <>{data?.title ?? "Task"}</>;
}

function TaskBody({ taskId }: { taskId: string }) {
  const { path, workspace, user } = useWorkspace();
  const qc = useQueryClient();
  const lookups = useLookups();
  const upload = useUpload();
  const task = useTask(taskId);
  const activity = useActivity({ entity_kind: "task", entity_id: taskId, page_size: 30 });
  const files = useFiles({ task_id: taskId, page_size: 50 });
  const [comment, setComment] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const t = task.data;
  if (task.isLoading || !t) {
    return (
      <Stack gap={12}>
        <Skeleton width="40%" />
        <Skeleton width="70%" />
        <Skeleton width="55%" />
      </Stack>
    );
  }

  const status = taskStatus(t.status);
  const state = t.blocked?.is_blocked && status !== "done" ? BLOCKED : TASK_STATUS[status];
  const project = lookups.projectById.get(t.project_id ?? "");
  const team = workspace.teams?.find((tm) => tm.id === project?.team_id);
  const category = workspace.task_categories?.find((c) => c.key === t.category);

  const refresh = () =>
    Promise.all(["tasks", "activity", "files", "dashboard", "calendar"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) toast.success(done);
    } catch (e) {
      toast.error("That didn't work", e instanceof Error ? e.message : undefined);
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const patch = (body: Record<string, unknown>) => run(() => api.patch<TaskDetail>(path(`/tasks/${t.id}`), { version: t.version, ...body }));
  const transition = (to: TaskStatus) => run(() => api.post(path(`/tasks/${t.id}/transitions`), { version: t.version, to }), `${actionLabel(status, to)} — done`);
  const setBlocked = (isBlocked: boolean) => run(() => api.put(path(`/tasks/${t.id}/blocked`), { version: t.version, is_blocked: isBlocked }));
  const moveTarget = (day: string | null) => day && run(() => api.patch(path(`/tasks/${t.id}/target`), { version: t.version, target_at: dayToInstant(day, true) }));

  const addComment = () => {
    const text = comment.trim();
    if (!text) return;
    setComment("");
    void run(() => api.post(path(`/tasks/${t.id}/comments`), { text }));
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\/\S+$/.test(url)) return toast.error("Links start with http:// or https://");
    setLinkUrl("");
    void run(() => api.post(path(`/tasks/${t.id}/links`), { version: t.version, url }));
  };

  const download = async (fileId: string) => {
    try {
      const res = await api.get<{ download: { url: string } }>(path(`/files/${fileId}/download`));
      window.open(res.download.url, "_blank", "noopener");
    } catch (e) {
      toast.error("Couldn't download the file", e instanceof Error ? e.message : undefined);
    }
  };

  const moves = ALLOWED[status];
  const attached = files.data?.items ?? [];
  const typeInfo = ITEM_TYPE[(t.type as ItemType) ?? "task"] ?? ITEM_TYPE.task;

  return (
    <>
      <div className={styles.head}>
        <span className="num-sm text-4">{t.key}</span>
        <span className={styles.type}>
          <Glyph shape={typeInfo.glyph} />
          {typeInfo.label}
        </span>
        <Chip tone={state.tone} glyph={state.glyph} struck={state.struck}>
          {state.label}
        </Chip>
      </div>
      {t.description && <p className={`small ${styles.description}`}>{t.description}</p>}

      <DrawerSection title="Activity">
        <div className={styles.composer}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" rows={2} />
          <Button size="sm" onClick={addComment} disabled={!comment.trim() || busy}>
            Comment
          </Button>
        </div>
        <ol className={styles.timeline}>
          {(activity.data?.items ?? []).map((a) => (
            <li key={a.id}>
              <p className="small">{describe(a)}</p>
              {a.type === "comment" && a.text && <p className={`small ${styles.commentText}`}>{a.text}</p>}
              <p className="num-sm text-4" title={longDate(a.created_at)}>
                {shortDate(a.created_at)}
              </p>
            </li>
          ))}
        </ol>
      </DrawerSection>

      <DrawerSection title="Evidence">
        <ul className={styles.links}>
          {(t.links ?? []).map((l) => (
            <li key={l.id}>
              <Icon icon={Link04Icon} size={16} className="text-4" />
              <a href={l.url ?? "#"} target="_blank" rel="noreferrer noopener" className={styles.link}>
                {l.title || l.url}
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.composer}>
          <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" />
          <IconButton icon={Add01Icon} aria-label="Add link" onClick={addLink} disabled={busy} />
        </div>
      </DrawerSection>

      <DrawerSection title={`Attached files (${attached.length})`}>
        <ul className={styles.files}>
          {attached.map((f) => (
            <li key={f.id}>
              <span className={styles.fileName}>{f.name}</span>
              <span className="num-sm text-4">{bytes(f.size_bytes)}</span>
              <IconButton icon={Download01Icon} aria-label={`Download ${f.name}`} size="sm" variant="bare" onClick={() => download(f.id!)} />
            </li>
          ))}
        </ul>
        <Button size="sm" onClick={() => upload.open({ clientId: t.client_id ?? undefined, projectId: t.project_id ?? undefined, taskId: t.id ?? undefined })}>
          Attach files
        </Button>
      </DrawerSection>

      <DrawerSection title="Move to">
        <div className={styles.moves}>
          {moves.map((to) => (
            <Button key={to} size="sm" variant={to === "done" ? "primary" : "ghost"} disabled={busy} onClick={() => transition(to)}>
              {actionLabel(status, to)}
            </Button>
          ))}
          {status !== "done" && status !== "cancelled" && (
            <Button size="sm" variant="quiet" disabled={busy} onClick={() => setBlocked(!t.blocked?.is_blocked)}>
              {t.blocked?.is_blocked ? "Clear block" : "Mark blocked"}
            </Button>
          )}
        </div>
        {t.pending_review && (
          <p className={`caption ${styles.review}`}>
            In review with {t.pending_review.kind === "client" ? "the client" : lookups.personName(t.pending_review.reviewer_id)} since{" "}
            {shortDate(t.pending_review.requested_at)} · round {t.pending_review.round}
          </p>
        )}
      </DrawerSection>

      <DrawerSection title="A–Z record">
        <DescriptionList
          items={[
            {
              label: "Assignee",
              value: (
                <Select
                  value={t.assignee_id ?? ""}
                  onValueChange={(v) => patch({ assignee_id: v })}
                  allLabel="Unassigned"
                  options={lookups.members.map((m) => ({ value: m.user_id!, label: m.user_id === user.id ? `${m.display_name} (you)` : (m.display_name ?? "Member") }))}
                />
              ),
            },
            { label: "Assigned by", value: lookups.personName(t.assigned_by) },
            { label: "Reviewer", value: t.reviewer_id ? lookups.personName(t.reviewer_id) : "—" },
            { label: "Category", value: category?.name ?? "—" },
            { label: "Labels", value: t.labels?.length ? t.labels.join(", ") : "—" },
            {
              label: "Priority",
              value: (
                <ChoiceGroup
                  aria-label="Priority"
                  value={String(priorityLevel(t.priority))}
                  onValueChange={(v) => patch({ priority: Number(v) })}
                  options={[1, 2, 3].map((p) => ({ value: String(p), label: <PriorityMark level={p as 1 | 2 | 3} format="code" /> }))}
                />
              ),
            },
            { label: "Due", value: <DateInput value={isoDay(t.dates?.target_at)} onChange={moveTarget} /> },
            { label: "Baseline", value: <span className="num" title={longDate(t.dates?.baseline_at)}>{shortDate(t.dates?.baseline_at)}</span> },
            { label: "Target", value: <span className="num">{shortDate(t.dates?.target_at)}</span> },
            { label: "Shipped", value: <span className="num">{shortDate(t.dates?.shipped_at)}</span> },
            { label: "Re-do count", value: <span className="num">{t.redo_count ?? 0}</span> },
            { label: "Archived", value: status === "done" && t.dates?.shipped_at ? "When it passes the archive window" : "No" },
            { label: "Project", value: lookups.projectName(t.project_id) },
            { label: "Client", value: lookups.clientName(t.client_id) },
            { label: "Team", value: team?.name ?? "—" },
          ]}
        />
      </DrawerSection>
    </>
  );
}
