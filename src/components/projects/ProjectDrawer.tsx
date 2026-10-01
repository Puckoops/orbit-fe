"use client";

import {
  Button,
  Chip,
  ChoiceGroup,
  DescriptionList,
  Drawer,
  DrawerSection,
  InlineMeter,
  PriorityMark,
  Select,
  Skeleton,
  Stack,
  TextLink,
  toast,
} from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useLookups, useProject, useTasks } from "@/lib/api/hooks";
import type { Project } from "@/lib/api/models";
import { PROJECT_TYPE, TASK_STATUS, WORK_STATUSES, priorityLevel, taskStatus, type ProjectType, type WorkStatus } from "@/lib/domain";
import { longDate, money, shortDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useCreate } from "../create/CreateProvider";
import { useUpload } from "../upload/UploadProvider";
import { CloseWorkOrder } from "./CloseWorkOrder";

export function ProjectDrawer({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const { data } = useProject(projectId);
  return (
    <Drawer open={Boolean(projectId)} onOpenChange={(o) => !o && onClose()} title={data?.name ?? "Project"} width={520}>
      {projectId && <Body id={projectId} />}
    </Drawer>
  );
}

function pct(part: number | null | undefined, whole: number | null | undefined) {
  return whole ? ((part ?? 0) * 100) / whole : 0;
}

function Body({ id }: { id: string }) {
  const { path, workspace, isManager } = useWorkspace();
  const qc = useQueryClient();
  const lookups = useLookups();
  const create = useCreate();
  const upload = useUpload();
  const { data: p, isLoading } = useProject(id);
  const open = useTasks({ project_id: id, page_size: 1, status: "backlog,todo,in_progress,in_review,redo" });
  const done = useTasks({ project_id: id, page_size: 1, status: "done", archived: "include" });
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isLoading || !p) {
    return (
      <Stack gap={12}>
        <Skeleton width="45%" />
        <Skeleton width="70%" />
      </Stack>
    );
  }

  const status = taskStatus(p.status) as WorkStatus;
  const state = TASK_STATUS[status] ?? TASK_STATUS.backlog;
  const closed = p.delivery_status === "closed";
  const warnAt = workspace.budget_policy?.warn_at_pct?.[workspace.budget_policy.warn_at_pct.length - 1] ?? 80;

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await api.patch<Project>(path(`/projects/${p.id}`), { version: p.version, ...body });
      await Promise.all(["projects", "dashboard", "clients"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));
    } catch (e) {
      toast.error("Couldn't update the project", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack direction="row" gap={8} align="center" style={{ marginBottom: 16 }}>
        <Chip tone={state.tone} glyph={state.glyph}>
          {state.label}
        </Chip>
        <span className="num-sm text-4">{p.code}</span>
        {p.is_draft && <Chip glyph="circle-dashed">Draft</Chip>}
        {closed && <Chip glyph="check">Closed</Chip>}
      </Stack>

      {isManager && !closed && (
        <DrawerSection title="Status">
          <ChoiceGroup<WorkStatus>
            look="bare"
            aria-label="Status"
            value={status}
            onValueChange={(v) => patch({ status: v })}
            options={WORK_STATUSES.map((s) => ({
              value: s,
              label: (
                <Chip tone={TASK_STATUS[s].tone} glyph={TASK_STATUS[s].glyph}>
                  {TASK_STATUS[s].label}
                </Chip>
              ),
            }))}
          />
        </DrawerSection>
      )}

      <DrawerSection title="A–Z record">
        <DescriptionList
          items={[
            { label: "Client", value: lookups.clientName(p.client_id) },
            { label: "Type", value: PROJECT_TYPE[(p.type as ProjectType) ?? "design"] ?? "—" },
            { label: "Priority", value: <PriorityMark level={priorityLevel(p.priority)} format="code" /> },
            {
              label: "Assigned to",
              value: isManager ? (
                <Select
                  value={p.assignee_id ?? ""}
                  onValueChange={(v) => patch({ assignee_id: v })}
                  allLabel="Nobody"
                  disabled={busy}
                  options={lookups.members.map((m) => ({ value: m.user_id!, label: m.display_name ?? "Member" }))}
                />
              ) : (
                lookups.personName(p.assignee_id)
              ),
            },
            { label: "Managed by", value: lookups.personName(p.manager_id) },
            { label: "Reviewer", value: lookups.personName(p.reviewer_id) },
            { label: "Team", value: workspace.teams?.find((t) => t.id === p.team_id)?.name ?? "—" },
            { label: "Date assigned", value: <span className="num">{shortDate(p.assigned_at)}</span> },
            { label: "Due", value: <span className="num" title={longDate(p.due_at)}>{shortDate(p.due_at)}</span> },
            { label: "Baseline", value: <span className="num">{shortDate(p.baseline_at)}</span> },
            { label: "Fee", value: <span className="num">{money(p.fee, p.currency)}</span> },
            { label: "Tasks", value: <span className="num">{open.data?.total ?? "—"} open · {done.data?.total ?? "—"} done</span> },
            { label: "Notes", value: p.notes || "—" },
          ]}
        />
      </DrawerSection>

      {isManager && (
        <DrawerSection title="Budget">
          <InlineMeter
            rows={[
              { label: "Allocated", percent: 100 },
              { label: "Committed", percent: pct(p.budget?.committed, p.budget?.allocated), threshold: warnAt },
              { label: "Consumed", percent: pct(p.budget?.consumed, p.budget?.allocated), threshold: warnAt },
              { label: "Invoiced", percent: pct(p.budget?.invoiced, p.budget?.allocated) },
            ]}
          />
          <p className="caption text-3" style={{ marginTop: 10 }}>
            {money(p.budget?.allocated, p.currency)} allocated · {Math.round(p.budget_used_pct ?? 0)}% used
          </p>
        </DrawerSection>
      )}

      <DrawerSection title="Move to">
        <Stack direction="row" gap={8} wrap>
          <Button asChild size="sm">
            <Link href={`/tracker?project=${p.id}`}>All work on the board</Link>
          </Button>
          {!closed && (
            <Button size="sm" variant="quiet" onClick={() => create.open("task", { projectId: p.id ?? undefined })}>
              New task
            </Button>
          )}
          <Button size="sm" variant="quiet" onClick={() => upload.open({ clientId: p.client_id ?? undefined, projectId: p.id ?? undefined })}>
            Upload files
          </Button>
          {isManager && (
            <Button size="sm" variant="quiet" onClick={() => create.open("invoice", { clientId: p.client_id ?? undefined, projectId: p.id ?? undefined })}>
              New invoice
            </Button>
          )}
          {isManager && !closed && !p.is_draft && (
            <Button size="sm" onClick={() => setClosing(true)}>
              Close work order…
            </Button>
          )}
          {isManager && p.is_draft && (
            <Button size="sm" variant="primary" onClick={() => patch({ is_draft: false })} loading={busy}>
              Publish project
            </Button>
          )}
        </Stack>
        <p className="caption text-3" style={{ marginTop: 10 }}>
          <TextLink as={Link} href={`/clients/${p.client_id}`}>
            Client folder
          </TextLink>
        </p>
      </DrawerSection>

      {closing && <CloseWorkOrder project={p} open={closing} onOpenChange={setClosing} />}
    </>
  );
}
