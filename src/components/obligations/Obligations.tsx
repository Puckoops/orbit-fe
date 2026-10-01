"use client";

import { UserGroupIcon } from "@hugeicons/core-free-icons";
import {
  Card,
  EmptyState,
  FigureCard,
  Grid,
  GridItem,
  ListCard,
  MeterCard,
  Page,
  PageHeader,
  SearchInput,
  SegmentedControl,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Band,
} from "@puckoops/camelot";
import { useMemo, useState } from "react";
import { useLookups, useObligationSummary, useObligations } from "@/lib/api/hooks";
import { count, longDate, money, shortDate } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { useParamState } from "@/lib/hooks/useParamState";
import { useWorkspace } from "@/lib/workspace";
import { AddNewMenu } from "../create/CreateProvider";
import { FileName } from "../common/FileName";
import { ManagersOnly } from "../common/ManagersOnly";
import { ObligationChip } from "../common/ObligationChip";
import common from "../common/common.module.css";
import { ObligationDrawer } from "./ObligationDrawer";

type Direction = "both" | "payable" | "receivable";

export function Obligations() {
  const { isManager, currency } = useWorkspace();
  const lookups = useLookups();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const [direction, setDirection] = useState<Direction>("both");
  const [openId, setOpenId] = useParamState("obligation");
  const summary = useObligationSummary(isManager);
  const list = useObligations({ bucket: "open", q, direction: direction === "both" ? undefined : direction }, isManager);

  const s = summary.data?.find((x) => x.currency === currency) ?? summary.data?.[0];
  const rows = useMemo(
    () =>
      [...(list.data?.items ?? [])].sort(
        (a, b) => Number(Boolean(b.is_overdue)) - Number(Boolean(a.is_overdue)) || String(a.due_at).localeCompare(String(b.due_at)),
      ),
    [list.data],
  );

  if (!isManager) {
    return (
      <Page>
        <PageHeader title="Obligations" subtitle="Payable and receivable in a single ledger." actions={<AddNewMenu />} />
        <ManagersOnly what="the ledger" />
      </Page>
    );
  }

  const cur = s?.currency ?? currency;
  const ageing = s?.ageing;

  return (
    <Page>
      <PageHeader title="Obligations" subtitle="Payable and receivable in a single ledger." actions={<AddNewMenu extra={[{ label: "New payable", kind: "payable" }]} />} />

      <Grid>
        <GridItem span={5}>
          {summary.isLoading ? (
            <Skeleton height={180} radius="14px" />
          ) : (
            <FigureCard
              label="Net position"
              hero
              value={s?.net ?? 0}
              format={(n) => money(Math.round(n), cur)}
              caption="Receivable minus payable across all open obligations."
            />
          )}
        </GridItem>
        <GridItem span={4}>
          <ListCard
            title="Ageing"
            rows={[
              { label: "Not yet due", value: ageing ? money(ageing.not_due ?? 0, cur) : "—" },
              { label: "1–30 days", value: ageing ? money(ageing.d1_30 ?? 0, cur) : "—" },
              { label: "31–60 days", value: ageing ? money(ageing.d31_60 ?? 0, cur) : "—" },
              { label: "60+ days", value: ageing ? money(ageing.d60_plus ?? 0, cur) : "—" },
            ]}
          />
        </GridItem>
        <GridItem span={3}>
          {summary.isLoading ? (
            <Skeleton height={180} radius="14px" />
          ) : s?.collected_on_time_pct == null ? (
            <Card>
              <h3 className="h3">Collected on time</h3>
              <p className="kpi text-4">—</p>
              <p className="caption text-3">No invoices settled yet</p>
            </Card>
          ) : (
            <MeterCard title="Collected on time" percent={s.collected_on_time_pct} caption={`Last ${count(s.collected_sample ?? 0, "invoice")}`} />
          )}
        </GridItem>
      </Grid>

      <Band>
        <div className={common.toolbar}>
          <SearchInput className={common.toolbarSearch} placeholder="Search obligations" value={search} onChange={(e) => setSearch(e.target.value)} />
          <SegmentedControl<Direction>
            aria-label="Direction"
            value={direction}
            onValueChange={setDirection}
            options={[
              { value: "both", label: "Both" },
              { value: "payable", label: "Payable" },
              { value: "receivable", label: "Receivable" },
            ]}
          />
        </div>
        <Table
          density="relaxed"
          isEmpty={!list.isLoading && rows.length === 0}
          empty={
            <EmptyState
              icon={UserGroupIcon}
              title={q || direction !== "both" ? "Nothing open matches these filters." : "Nothing is owed in or out."}
              description="Issued invoices and recorded payables land here."
            />
          }
          footer={
            s ? (
              <>
                <span>
                  Receivable {money(s.receivable_outstanding, cur)} · Payable {money(s.payable_outstanding, cur)}
                </span>
                <span>{count(s.overdue_receivables ?? 0, "receivable")} overdue</span>
              </>
            ) : undefined
          }
        >
          <THead>
            <tr>
              <Th>Item</Th>
              <Th>Client</Th>
              <Th>Direction</Th>
              <Th>Due</Th>
              <Th numeric>Amount</Th>
            </tr>
          </THead>
          <TBody>
            {list.isLoading
              ? Array.from({ length: 5 }, (_, i) => (
                  <Tr key={i}>
                    <Td colSpan={5}>
                      <Skeleton width={`${70 - i * 9}%`} />
                    </Td>
                  </Tr>
                ))
              : rows.map((o) => (
                  <Tr key={o.id} interactive selected={openId === o.id} onClick={() => setOpenId(o.id!)}>
                    <Td primary>
                      <FileName name={o.title || o.ref || "Obligation"} />
                    </Td>
                    <Td>{lookups.clientName(o.client_id)}</Td>
                    <Td>
                      <ObligationChip direction={o.direction} overdue={o.is_overdue} />
                    </Td>
                    <Td mono title={longDate(o.due_at)}>
                      {shortDate(o.due_at)}
                    </Td>
                    <Td numeric>{money(o.outstanding ?? o.amount, o.currency)}</Td>
                  </Tr>
                ))}
          </TBody>
        </Table>
      </Band>

      <ObligationDrawer obligationId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
