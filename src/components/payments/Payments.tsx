"use client";

import { File01Icon, Invoice01Icon } from "@hugeicons/core-free-icons";
import { Band, Button, Card, EmptyState, Icon, Page, PageHeader, SearchInput, Skeleton, Table, TBody, Td, Th, THead, Tr } from "@puckoops/camelot";
import Link from "next/link";
import { useMemo, useState } from "react";
import { describeAction } from "@/lib/activity";
import { useActivity, useInvoices, useLookups } from "@/lib/api/hooks";
import { INVOICE_STAGE, type PaymentStatus } from "@/lib/domain";
import { longDate, money, shortDate } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { useParamState } from "@/lib/hooks/useParamState";
import { useWorkspace } from "@/lib/workspace";
import { AddNewMenu } from "../create/CreateProvider";
import { ManagersOnly } from "../common/ManagersOnly";
import { StateChip } from "../common/StateChip";
import common from "../common/common.module.css";
import { useUpload } from "../upload/UploadProvider";
import { InvoiceDrawer } from "./InvoiceDetail";
import styles from "./payments.module.css";

const AUDIT_TYPES = "created,invoice_issued,invoice_voided,payment_recorded,obligation_changed,archived,deleted";

export function Payments() {
  const { isManager, workspace } = useWorkspace();
  const upload = useUpload();
  const lookups = useLookups();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const [invoiceId, setInvoiceId] = useParamState("invoice");
  const invoices = useInvoices(q ? { q } : {}, isManager);
  const allInvoices = useInvoices({}, isManager);
  const audit = useActivity({ entity_kind: "invoice,obligation", type: AUDIT_TYPES, page_size: 40 }, isManager);

  const invoiceRef = useMemo(() => {
    const refs = new Map<string, string>();
    for (const i of allInvoices.data?.items ?? []) {
      refs.set(i.id!, i.number ?? "Draft");
      if (i.obligation_id) refs.set(i.obligation_id, i.number ?? "Draft");
    }
    return refs;
  }, [allInvoices.data]);
  const auditRows = (audit.data?.items ?? []).filter((a) => invoiceRef.has(a.entity?.id ?? "")).slice(0, 12);
  const auditLoading = audit.isLoading || allInvoices.isLoading;

  if (!isManager) {
    return (
      <Page>
        <PageHeader title="Payments" subtitle="Invoicing and collection for this workspace." actions={<AddNewMenu />} />
        <ManagersOnly what="invoices and payments" />
      </Page>
    );
  }

  const gatewayOn = Boolean(workspace.features?.payment_gateway);
  const items = invoices.data?.items ?? [];

  return (
    <Page>
      <PageHeader title="Payments" subtitle="Invoicing and collection for this workspace." actions={<AddNewMenu />} />

      {!gatewayOn && (
        <Card className={styles.gateway}>
          <Icon icon={File01Icon} size={28} className="text-3" />
          <h2 className="h2">The payment gateway is not switched on</h2>
          <p className="small text-3">Invoices and the audit trail work as normal. Collecting money in-app needs the gateway enabled on your plan.</p>
          <div className={styles.gatewayActions}>
            <Button asChild variant="primary">
              <a href="mailto:sales@puckoops.com?subject=Orbit%20payment%20gateway">Contact sales</a>
            </Button>
            <Button asChild>
              <Link href="/#pricing">See what&apos;s included</Link>
            </Button>
          </div>
        </Card>
      )}

      <Band heading="Invoices" first={gatewayOn}>
        <div className={common.toolbar}>
          <SearchInput className={common.toolbarSearch} placeholder="Search invoices" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="primary" onClick={() => upload.open({ category: "invoice" })}>
            Upload invoice
          </Button>
        </div>
        <Table
          isEmpty={!invoices.isLoading && items.length === 0}
          empty={<EmptyState icon={Invoice01Icon} title={q ? `No invoice matches “${q}”.` : "No invoices yet."} description="Draft one from Add new, or from a project." />}
        >
          <THead>
            <tr>
              <Th>Invoice</Th>
              <Th>Client</Th>
              <Th>Project</Th>
              <Th numeric>Amount</Th>
              <Th>Due</Th>
              <Th>Stage</Th>
            </tr>
          </THead>
          <TBody>
            {invoices.isLoading
              ? Array.from({ length: 5 }, (_, i) => (
                  <Tr key={i}>
                    <Td colSpan={6}>
                      <Skeleton width={`${75 - i * 8}%`} />
                    </Td>
                  </Tr>
                ))
              : items.map((inv) => (
                  <Tr key={inv.id} interactive selected={invoiceId === inv.id} onClick={() => setInvoiceId(inv.id!)}>
                    <Td mono primary title={inv.name ?? undefined}>
                      {inv.number ?? "Draft"}
                    </Td>
                    <Td>{lookups.clientName(inv.client_id)}</Td>
                    <Td truncate>{inv.project_id ? lookups.projectName(inv.project_id) : (inv.name ?? "—")}</Td>
                    <Td numeric>{money(inv.total, inv.currency)}</Td>
                    <Td mono title={longDate(inv.due_at)}>
                      {inv.due_at ? shortDate(inv.due_at) : "—"}
                    </Td>
                    <Td>
                      <StateChip state={INVOICE_STAGE[(inv.payment_status as PaymentStatus) ?? "draft"] ?? INVOICE_STAGE.draft} />
                    </Td>
                  </Tr>
                ))}
          </TBody>
        </Table>
      </Band>

      <Band heading="Audit" caption="Every change to an invoice, in order.">
        <Table density="compact" isEmpty={!auditLoading && auditRows.length === 0} empty={<p className="small text-3">Nothing has happened yet.</p>}>
          <THead>
            <tr>
              <Th>Date</Th>
              <Th>Action</Th>
              <Th>Invoice</Th>
              <Th>By</Th>
            </tr>
          </THead>
          <TBody>
            {auditRows.map((a) => (
              <Tr key={a.id}>
                <Td mono title={longDate(a.created_at)}>
                  {shortDate(a.created_at)}
                </Td>
                <Td primary>{describeAction(a)}</Td>
                <Td mono>{invoiceRef.get(a.entity?.id ?? "")}</Td>
                <Td>{a.actor?.name ?? "System"}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Band>

      <InvoiceDrawer invoiceId={invoiceId} onClose={() => setInvoiceId(null)} />
    </Page>
  );
}
