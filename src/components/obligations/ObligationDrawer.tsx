"use client";

import {
  Button,
  Chip,
  DescriptionList,
  Dialog,
  Drawer,
  DrawerSection,
  Field,
  Input,
  Skeleton,
  Stack,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  toast,
} from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useLookups, useObligation } from "@/lib/api/hooks";
import { DIRECTION, OVERDUE } from "@/lib/domain";
import { longDate, money, shortDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { RecordPayment } from "../finance/RecordPayment";

const STATE_LABEL: Record<string, string> = {
  open: "Due",
  scheduled: "Scheduled",
  disputed: "Disputed",
  settled: "Settled",
  written_off: "Written off",
};

const KIND_LABEL: Record<string, string> = { payment: "Payment", credit_note: "Credit note", write_off: "Write-off", refund: "Refund" };

export function ObligationDrawer({ obligationId, onClose }: { obligationId: string | null; onClose: () => void }) {
  const { data } = useObligation(obligationId);
  return (
    <Drawer open={Boolean(obligationId)} onOpenChange={(o) => !o && onClose()} title={data?.title || data?.ref || "Obligation"} width={520}>
      {obligationId && <Body id={obligationId} />}
    </Drawer>
  );
}

function Body({ id }: { id: string }) {
  const { path, workspace } = useWorkspace();
  const qc = useQueryClient();
  const lookups = useLookups();
  const { data: o, isLoading } = useObligation(id);
  const [paying, setPaying] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading || !o) {
    return (
      <Stack gap={12}>
        <Skeleton width="50%" />
        <Skeleton width="80%" />
      </Stack>
    );
  }

  const cur = o.currency ?? workspace.base_currency ?? "GBP";
  const settled = o.state === "settled" || o.state === "written_off";
  const dirState = o.is_overdue ? OVERDUE : DIRECTION[o.direction === "payable" ? "payable" : "receivable"];
  const nextInstallment = o.installments?.find((i) => i.status !== "paid");

  const refresh = () =>
    Promise.all(["obligations", "obligations-summary", "invoices", "dashboard", "activity"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      await refresh();
    } catch (e) {
      toast.error("That didn't work", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack direction="row" gap={8} align="center" style={{ marginBottom: 16 }}>
        <Chip tone={dirState.tone} glyph={dirState.glyph}>
          {dirState.label}
        </Chip>
        <span className="num-sm text-4">{o.ref}</span>
      </Stack>

      <DrawerSection>
        <DescriptionList
          items={[
            { label: "Direction", value: o.direction === "payable" ? "Payable — we owe" : "Receivable — owed to us" },
            { label: "Party", value: o.counterparty?.name ?? "—" },
            { label: "Client", value: lookups.clientName(o.client_id) },
            { label: "Source project", value: o.project_id ? lookups.projectName(o.project_id) : "—" },
            { label: "Amount", value: <span className="num">{money(o.amount, cur)}</span> },
            { label: "Paid", value: <span className="num">{money(o.paid_amount, cur)}</span> },
            { label: "Outstanding", value: <span className="num">{money(o.outstanding, cur)}</span> },
            { label: "Due", value: <span className="num" title={longDate(o.due_at)}>{shortDate(o.due_at)}</span> },
            { label: "Age", value: <span className="num">{o.age_days !== null && o.age_days !== undefined ? `${o.age_days} days` : "—"}</span> },
            { label: "Stage", value: STATE_LABEL[o.state ?? "open"] ?? o.state },
            { label: "Next payment", value: nextInstallment ? `${money(nextInstallment.amount, cur)} on ${shortDate(nextInstallment.due_at)}` : "—" },
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Record payment">
        {settled && !paying ? (
          <p className="small text-3">This one is settled. A refund reopens it.</p>
        ) : null}
        {paying ? (
          <RecordPayment obligationId={o.id!} currency={cur} outstanding={o.outstanding ?? 0} paid={o.paid_amount ?? 0} onDone={() => setPaying(false)} />
        ) : (
          <Stack direction="row" gap={8} wrap>
            <Button variant={settled ? "ghost" : "primary"} onClick={() => setPaying(true)}>
              {settled ? "Record a refund" : "Record payment"}
            </Button>
            {!settled && o.state !== "disputed" && (
              <Button variant="ghost" onClick={() => setDisputeOpen(true)} disabled={busy}>
                Open a dispute
              </Button>
            )}
            {o.state === "disputed" && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => act(() => api.post(path(`/obligations/${o.id}/dispute/resolve`), { version: o.version, resolution: "Resolved" }), "Dispute resolved")}
              >
                Resolve dispute
              </Button>
            )}
            {settled && o.is_active !== false && (
              <Button variant="quiet" disabled={busy} onClick={() => act(() => api.post(path(`/obligations/${o.id}/archive`), { version: o.version }), "Archived")}>
                Archive
              </Button>
            )}
          </Stack>
        )}
      </DrawerSection>

      <DrawerSection title="Ledger">
        <Table density="compact" minWidth={0} isEmpty={!o.payments?.length} empty={<p className="small text-3">Nothing recorded yet.</p>}>
          <THead>
            <tr>
              <Th>Date</Th>
              <Th>Kind</Th>
              <Th numeric>Amount</Th>
            </tr>
          </THead>
          <TBody>
            {(o.payments ?? []).map((p) => (
              <Tr key={p.id}>
                <Td mono title={longDate(p.paid_at)}>
                  {shortDate(p.paid_at)}
                </Td>
                <Td>{KIND_LABEL[p.kind ?? ""] ?? p.kind}</Td>
                <Td numeric>{money(p.amount, p.currency ?? cur)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
        {o.dispute?.reason && (
          <p className="small text-3" style={{ marginTop: 12 }}>
            Disputed {shortDate(o.dispute.opened_at)}: {o.dispute.reason}
            {o.dispute.resolved_at ? ` — resolved ${shortDate(o.dispute.resolved_at)}` : ""}
          </p>
        )}
      </DrawerSection>

      <Dialog
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        title="Open a dispute"
        description="The obligation stays on the books; it just stops counting as simply due."
        footer={
          <>
            <Button variant="quiet" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!reason.trim() || busy}
              onClick={() =>
                act(() => api.post(path(`/obligations/${o.id}/dispute`), { version: o.version, reason: reason.trim() }), "Dispute opened").then(() => {
                  setDisputeOpen(false);
                  setReason("");
                })
              }
            >
              Open dispute
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Client queried the second milestone" autoFocus />
        </Field>
      </Dialog>
    </>
  );
}
