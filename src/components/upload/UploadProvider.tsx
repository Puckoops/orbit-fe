"use client";

import { Button, Drawer, DrawerSection, Dropzone, Field, Select, Stack, Table, TBody, Td, Th, THead, Tr, UploadItem, toast } from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useFiles, useLookups, useTasks } from "@/lib/api/hooks";
import { FILE_CATEGORY, options, type FileCategory } from "@/lib/domain";
import { bytes, fileKind, longDate, shortDate } from "@/lib/format";
import { MAX_UPLOAD_BYTES, uploadToInventory } from "@/lib/upload";
import { useWorkspace } from "@/lib/workspace";

interface Defaults {
  clientId?: string;
  projectId?: string;
  taskId?: string;
  category?: FileCategory;
}

interface UploadState {
  open: (defaults?: Defaults) => void;
}

const Ctx = createContext<UploadState>({ open: () => {} });

export function useUpload() {
  return useContext(Ctx);
}

interface QueueItem {
  id: number;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "failed";
  error?: string;
}

let seq = 1;

export function UploadProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<Defaults>({});
  const value = useMemo<UploadState>(
    () => ({
      open: (d = {}) => {
        setDefaults(d);
        setOpen(true);
      },
    }),
    [],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {open && <UploadDrawer defaults={defaults} onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}

function UploadDrawer({ defaults, onClose }: { defaults: Defaults; onClose: () => void }) {
  const { path, workspace } = useWorkspace();
  const qc = useQueryClient();
  const { clients, projects } = useLookups();
  const [clientId, setClientId] = useState(defaults.clientId ?? "");
  const [projectId, setProjectId] = useState(defaults.projectId ?? "");
  const [taskId, setTaskId] = useState(defaults.taskId ?? "");
  const [category, setCategory] = useState<FileCategory | "">(defaults.category ?? "");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const controllers = useRef(new Map<number, AbortController>());
  const tasks = useTasks({ project_id: projectId }, Boolean(projectId));
  const recent = useFiles({ page_size: 5 });

  const clientProjects = projects.filter((p) => p.client_id === clientId && p.is_active !== false && !p.is_draft);
  const patch = (id: number, next: Partial<QueueItem>) => setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...next } : it)));

  const add = useCallback((files: File[]) => {
    const accepted: QueueItem[] = [];
    for (const file of files) {
      if (file.size === 0) toast.error(`${file.name} is empty.`);
      else if (file.size > MAX_UPLOAD_BYTES) toast.error(`${file.name} is larger than 5 GB.`);
      else accepted.push({ id: seq++, file, progress: 0, status: "queued" });
    }
    setQueue((q) => [...q, ...accepted]);
  }, []);

  const start = async () => {
    if (!category) return toast.error("Choose a category first.");
    if (projectId && !clientId) return toast.error("Choose the client for that project.");
    const pending = queue.filter((q) => q.status === "queued" || q.status === "failed");
    if (!pending.length) return;
    setRunning(true);
    let done = 0;
    for (const item of pending) {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patch(item.id, { status: "uploading", progress: 1, error: undefined });
      try {
        await uploadToInventory(
          path,
          item.file,
          { client_id: clientId, project_id: projectId, task_id: taskId, category },
          (pct) => patch(item.id, { progress: pct }),
          controller.signal,
        );
        patch(item.id, { status: "done", progress: 100 });
        done++;
      } catch (e) {
        patch(item.id, { status: "failed", error: e instanceof Error ? e.message : "Upload failed" });
      } finally {
        controllers.current.delete(item.id);
      }
    }
    setRunning(false);
    await Promise.all(["files", "dashboard", "tasks", "clients"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));
    if (done) toast.success(`${done} ${done === 1 ? "file" : "files"} added to the inventory`);
  };

  const remove = (id: number) => {
    controllers.current.get(id)?.abort();
    setQueue((q) => q.filter((it) => it.id !== id));
  };

  const hasPending = queue.some((q) => q.status === "queued" || q.status === "failed");

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && !running && onClose()}
      title="Upload files"
      description="Tag each upload to a client and a category, so the folder view assembles itself."
      width={560}
      footer={
        <>
          <Button variant="quiet" onClick={() => setQueue((q) => q.filter((it) => it.status === "uploading"))} disabled={running || queue.length === 0}>
            Clear queue
          </Button>
          <Button variant="primary" onClick={start} loading={running} disabled={!hasPending}>
            Add to inventory
          </Button>
        </>
      }
    >
      <DrawerSection>
        <Stack gap={0}>
          <Dropzone onFiles={add} hint="Any file up to 5 GB. Contracts, receipts, deliverables, source files." />
          {queue.map((q) => (
            <UploadItem
              key={q.id}
              name={q.file.name}
              kind={fileKind(q.file.name)}
              size={bytes(q.file.size)}
              progress={q.progress}
              status={q.status}
              error={q.error}
              onRemove={q.status === "done" ? undefined : () => remove(q.id)}
            />
          ))}
        </Stack>
      </DrawerSection>
      <DrawerSection>
        <Stack gap={16}>
          <Field label="Client" hint="Leave empty for studio files; they show as Internal.">
            <Select
              value={clientId}
              onValueChange={(v) => {
                setClientId(v);
                setProjectId("");
                setTaskId("");
              }}
              allLabel="Internal"
              options={clients.filter((c) => c.is_active !== false).map((c) => ({ value: c.id!, label: c.name ?? "Client" }))}
            />
          </Field>
          <Field label="Project">
            <Select
              value={projectId}
              onValueChange={(v) => {
                setProjectId(v);
                setTaskId("");
              }}
              allLabel={clientId ? "No project" : "Choose a client first"}
              disabled={!clientId}
              options={clientProjects.map((p) => ({ value: p.id!, label: p.name ?? "Project" }))}
            />
          </Field>
          <Field label="Attach to task (optional)">
            <Select
              value={taskId}
              onValueChange={setTaskId}
              allLabel={projectId ? "No task" : "Choose a project first"}
              disabled={!projectId}
              options={(tasks.data?.items ?? []).map((t) => ({ value: t.id!, label: `${t.key} · ${t.title}`, text: t.title ?? undefined }))}
            />
          </Field>
          <Field label="Category" required>
            <Select value={category} onValueChange={(v) => setCategory(v as FileCategory)} placeholder="Category" options={options(FILE_CATEGORY)} />
          </Field>
        </Stack>
      </DrawerSection>
      <DrawerSection title="Recent uploads">
        <Table density="compact" minWidth={0}>
          <THead>
            <tr>
              <Th>File</Th>
              <Th numeric>Uploaded</Th>
            </tr>
          </THead>
          <TBody>
            {(recent.data?.items ?? []).map((f) => (
              <Tr key={f.id}>
                <Td primary truncate>{f.name}</Td>
                <Td numeric title={longDate(f.created_at)}>
                  {shortDate(f.created_at)}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </DrawerSection>
    </Drawer>
  );
}
