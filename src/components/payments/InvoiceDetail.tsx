"use client";

import { Download01Icon } from "@hugeicons/core-free-icons";
import { Button, DescriptionList, Dialog, Drawer, DrawerSection, Field, IconButton, Input, Skeleton, Stack, toast } from "@puckoops/camelot";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useFiles, useLookups, useObligation, useWsKey } from "@/lib/api/hooks";
import type { Invoice } from "@/lib/api/models";
import { INVOICE_STAGE, type PaymentStatus } from "@/lib/domain";
import { openDownload } from "@/lib/download";
import { bytes, longDate, money, shortDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { StateChip } from "../common/StateChip";
import { RecordPayment } from "../finance/RecordPayment";
import { useUpload } from "../upload/UploadProvider";
import styles from "./payments.module.css";

function useInvoice(id: string | null) {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({ queryKey: key("invoices", id), queryFn: () => api.get<Invoice>(path(`/invoices/${id}`)), enabled: Boolean(id) });
}

export function InvoiceDrawer({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const { data } = useInvoice(invoiceId);
  return (
    <Drawer open={Boolean(invoiceId)} onOpenChange={(o) => !o && onClose()} title={data ? `${data.number ?? "Draft invoice"}${data.name ? ` — ${data.name}` : ""}` : "Invoice"} width={520}>
      {invoiceId && <Body id={invoiceId} onDeleted={onClose} />}
    </Drawer>
  );
}

function Body({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const { path, workspace } = useWorkspace();
  const qc = useQueryClient();
  const lookups = useLookups();
  const upload = useUpload();
  const { data: inv, isLoading } = useInvoice(id);
  const obligation = useObligation(inv?.obligation_id);
  const files = useFiles({ invoice_id: id, page_size: 20 });
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading || !inv) {
    return (
      <Stack gap={12}>
        <Skeleton width="50%" />
        <Skeleton width="75%" />
      </Stack>
    );
  }

  const cur = inv.currency ?? workspace.base_currency ?? "GBP";
  const stage = INVOICE_STAGE[(inv.payment_status as PaymentStatus) ?? "draft"] ?? INVOICE_STAGE.draft;
  const settled = inv.payment_status === "paid" || inv.payment_status === "written_off";

  const refresh = () =>
    Promise.all(["invoices", "obligations", "obligations-summary", "dashboard", "activity", "projects"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      await refresh();
      return true;
    } catch (e) {
      toast.error("That didn't work", e instanceof Error ? e.message : undefined);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <StateChip state={stage} />
      </div>

      <DrawerSection>
        <DescriptionList
          items={[
            { label: "Client", value: lookups.clientName(inv.client_id) },
            { label: "Project", value: inv.project_id ? lookups.projectName(inv.project_id) : "—" },
            { label: "Issued", value: <span className="num">{shortDate(inv.issued_at)}</span> },
            { label: "Due", value: <span className="num" title={longDate(inv.due_at)}>{shortDate(inv.due_at)}</span> },
            { label: "Amount", value: <span className="num">{money(inv.total, cur)}</span> },
            { label: "Paid", value: <span className="num">{money(obligation.data?.paid_amount ?? 0, cur)}</span> },
            { label: "Outstanding", value: <span className="num">{money(inv.outstanding ?? 0, cur)}</span> },
            ...(inv.void_reason ? [{ label: "Voided", value: inv.void_reason }] : []),
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Lines">
        <ul className={styles.lines}>
          {(inv.line_items ?? []).map((l) => (
            <li key={l.id}>
              <span>{l.description}</span>
              <span className="num">{money(l.amount, cur)}</span>
            </li>
          ))}
        </ul>
        <div className={styles.totals}>
          <div>
            <span>Subtotal</span>
            <span className="num">{money(inv.subtotal, cur)}</span>
          </div>
          {(inv.tax_lines ?? []).map((t) => (
            <div key={t.name}>
              <span>{t.name}</span>
              <span className="num">{money(t.amount, cur)}</span>
            </div>
          ))}
          <div>
            <span>Total</span>
            <span className="num">{money(inv.total, cur)}</span>
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Actions">
        {paying && inv.obligation_id ? (
          <RecordPayment
            obligationId={inv.obligation_id}
            currency={cur}
            outstanding={inv.outstanding ?? 0}
            paid={obligation.data?.paid_amount ?? 0}
            onDone={() => setPaying(false)}
          />
        ) : (
          <Stack direction="row" gap={8} wrap>
            {inv.status === "draft" && (
              <>
                <Button variant="primary" loading={busy} onClick={() => act(() => api.post(path(`/invoices/${inv.id}/issue`), { version: inv.version }), "Invoice issued")}>
                  Issue
                </Button>
                <Button
                  variant="quiet"
                  disabled={busy}
                  onClick={async () => {
                    if (await act(() => api.delete(path(`/invoices/${inv.id}`), { version: inv.version }), "Draft deleted")) onDeleted();
                  }}
                >
                  Delete draft
                </Button>
              </>
            )}
            {inv.status === "issued" && !settled && (
              <Button variant="primary" onClick={() => setPaying(true)}>
                Record payment
              </Button>
            )}
            {inv.status === "issued" && !(obligation.data?.paid_amount) && (
              <Button variant="ghost" disabled={busy} onClick={() => setVoiding(true)}>
                Void
              </Button>
            )}
            {(inv.status === "void" || settled) && inv.is_active !== false && (
              <Button variant="quiet" disabled={busy} onClick={() => act(() => api.post(path(`/invoices/${inv.id}/archive`), { version: inv.version }), "Invoice archived")}>
                Archive
              </Button>
            )}
          </Stack>
        )}
      </DrawerSection>

      <DrawerSection title={`Attached files (${files.data?.items.length ?? 0})`}>
        <ul className={styles.lines}>
          {(files.data?.items ?? []).map((f) => (
            <li key={f.id}>
              <span>{f.name}</span>
              <span>
                <span className="num-sm text-4">{bytes(f.size_bytes)}</span>{" "}
                <IconButton icon={Download01Icon} size="sm" variant="bare" aria-label={`Download ${f.name}`} onClick={() => openDownload(path, f.id!)} />
              </span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 12 }}>
          <Button size="sm" onClick={() => upload.open({ clientId: inv.client_id ?? undefined, projectId: inv.project_id ?? undefined, category: "invoice" })}>
            Attach the PDF
          </Button>
        </div>
      </DrawerSection>

      <Dialog
        open={voiding}
        onOpenChange={setVoiding}
        title="Void this invoice?"
        description="The receivable is credited in full and its time entries are released. There is no un-void."
        footer={
          <>
            <Button variant="quiet" onClick={() => setVoiding(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!reason.trim() || busy}
              onClick={async () => {
                if (await act(() => api.post(path(`/invoices/${inv.id}/void`), { version: inv.version, reason: reason.trim() }), "Invoice voided")) {
                  setVoiding(false);
                  setReason("");
                }
              }}
            >
              Void invoice
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Issued to the wrong entity" autoFocus />
        </Field>
      </Dialog>
    </>
  );
}
