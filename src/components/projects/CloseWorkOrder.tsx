"use client";

import { Button, Dialog, Field, Glyph, Input, Select, Skeleton, Stack, toast } from "@puckoops/camelot";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useLookups, useWsKey } from "@/lib/api/hooks";
import type { Project } from "@/lib/api/models";
import type { ClosurePreview } from "@/lib/api/types.gen";
import { money } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import styles from "./closeWorkOrder.module.css";

const ACTION_LABEL: Record<string, string> = {
  move: "Move to another project",
  cancel_items: "Cancel them",
  keep_open: "Keep them open here",
  chase: "Chase the reviewers",
  withdraw: "Withdraw from review",
  add_to_final_invoice: "Add to a final invoice",
  write_off: "Write it off",
  settle_now: "Settle it now",
  schedule: "Schedule it",
  transfer: "Transfer to another project",
  dispute: "Mark it disputed",
  leave_open: "Leave it open",
};

const needsTarget = (a: string) => a === "move" || a === "transfer";

/** Close work order…: one decision per open line, then the project closes. Money is never settled or hidden by closing. */
export function CloseWorkOrder({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { path, workspace, isOwner } = useWorkspace();
  const qc = useQueryClient();
  const key = useWsKey();
  const { projects } = useLookups();
  const preview = useQuery({
    queryKey: key("closure-preview", project.id),
    queryFn: () => api.get<ClosurePreview>(path(`/projects/${project.id}/closure-preview`)),
    enabled: open,
  });
  const [choice, setChoice] = useState<Record<string, { action: string; target?: string; note?: string }>>({});
  const [pending, setPending] = useState(false);

  const lines = (preview.data?.lines ?? []).filter((l) => (l.actions ?? []).length > 0);
  const lineKey = (l: { item?: string | null; ref_id?: string | null }) => `${l.item}:${l.ref_id ?? ""}`;

  const chosen = (l: { item?: string | null; ref_id?: string | null; actions?: string[] | null }) =>
    choice[lineKey(l)] ?? (l.actions?.[0] ? { action: l.actions[0] } : undefined);

  const others = projects.filter((p) => p.id !== project.id && p.is_active !== false && p.delivery_status !== "closed" && !p.is_draft);

  const submit = async () => {
    for (const l of lines) {
      const c = chosen(l);
      if (!c) return toast.error("Choose what happens to every line.");
      if (needsTarget(c.action) && !c.target) return toast.error("Choose where to move them.");
      if (c.action === "dispute" && !c.note?.trim()) return toast.error("Say why it is disputed.");
    }
    setPending(true);
    try {
      await api.post(path(`/projects/${project.id}/closure`), {
        version: preview.data?.version ?? project.version,
        resolutions: lines.map((l) => {
          const c = chosen(l)!;
          return { item: l.item, ref_id: l.ref_id || undefined, action: c.action, target_id: c.target || undefined, note: c.note?.trim() || undefined };
        }),
      });
      toast.success("Work order closed", project.name ?? undefined);
      await Promise.all(["projects", "tasks", "obligations", "invoices", "dashboard", "clients"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't close the work order", e instanceof Error ? e.message : undefined);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      width={600}
      title="Close work order…"
      description="Closing or archiving a project never settles or hides its money."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={pending} disabled={preview.isLoading}>
            Close work order
          </Button>
        </>
      }
    >
      {preview.isLoading ? (
        <Stack gap={10}>
          <Skeleton width="80%" />
          <Skeleton width="60%" />
        </Stack>
      ) : (
        <Stack gap={18}>
          {(preview.data?.lines ?? []).map((l) => {
            const k = lineKey(l);
            const c = chosen(l);
            const actionable = (l.actions ?? []).length > 0;
            return (
              <div key={k} className={styles.line}>
                <div className={styles.lineHead}>
                  <Glyph shape={l.satisfied ? "check" : actionable ? "circle" : "dot"} />
                  <p className="small">{l.summary}</p>
                  {l.amount ? <span className="num">{money(l.amount, project.currency)}</span> : null}
                </div>
                {actionable && (
                  <Stack gap={8}>
                    <Select
                      value={c?.action ?? ""}
                      onValueChange={(v) => setChoice((s) => ({ ...s, [k]: { action: v } }))}
                      options={(l.actions ?? [])
                        .filter((a) => a !== "write_off" || isOwner)
                        .map((a) => ({ value: a, label: ACTION_LABEL[a] ?? a }))}
                      aria-label={l.summary ?? "Resolution"}
                    />
                    {c && needsTarget(c.action) && (
                      <Select
                        value={c.target ?? ""}
                        onValueChange={(v) => setChoice((s) => ({ ...s, [k]: { ...c!, target: v } }))}
                        placeholder="Choose the project"
                        options={others
                          .filter((p) => c.action !== "move" || p.client_id === project.client_id)
                          .filter((p) => c.action !== "transfer" || p.currency === project.currency)
                          .map((p) => ({ value: p.id!, label: p.name ?? "Project" }))}
                      />
                    )}
                    {c?.action === "dispute" && (
                      <Field label="Why">
                        <Input value={c.note ?? ""} onChange={(e) => setChoice((s) => ({ ...s, [k]: { ...c!, note: e.target.value } }))} />
                      </Field>
                    )}
                  </Stack>
                )}
              </div>
            );
          })}
          {preview.data?.notice && <p className="caption text-3">{preview.data.notice}</p>}
        </Stack>
      )}
    </Dialog>
  );
}
