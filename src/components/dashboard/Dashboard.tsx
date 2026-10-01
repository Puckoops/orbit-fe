"use client";

import { CloudUploadIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import {
  ActionCard,
  Band,
  Button,
  Card,
  Chip,
  EmptyState,
  FigureCard,
  Grid,
  GridItem,
  ListCard,
  MeterCard,
  Page,
  PageHeader,
  SearchInput,
  Skeleton,
  Sparkbars,
  Table,
  TBody,
  Td,
  TextLink,
  Th,
  THead,
  Tr,
} from "@puckoops/camelot";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useDashboard, useFiles, useLookups, useObligations } from "@/lib/api/hooks";
import type { Money } from "@/lib/api/models";
import { FILE_CATEGORY, HEALTH, type FileCategory, type Health } from "@/lib/domain";
import { count, longDate, money, shortDate, spelled } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { useWorkspace } from "@/lib/workspace";
import { AddNewMenu } from "../create/CreateProvider";
import { FileName } from "../common/FileName";
import { ObligationChip } from "../common/ObligationChip";
import common from "../common/common.module.css";
import { useUpload } from "../upload/UploadProvider";
import styles from "./dashboard.module.css";

function billedLabel(billed: Money[] | null | undefined, preferred: string) {
  if (!billed?.length) return money(0, preferred);
  const pick = billed.find((b) => b.currency === preferred) ?? billed[0]!;
  return money(pick.amount ?? 0, pick.currency ?? preferred);
}

export function Dashboard() {
  const router = useRouter();
  const { isManager, currency } = useWorkspace();
  const upload = useUpload();
  const dash = useDashboard();
  const obligations = useObligations({ bucket: "open" }, isManager);
  const lookups = useLookups();
  const [fileQuery, setFileQuery] = useState("");
  const q = useDebounced(fileQuery.trim(), 250);
  const files = useFiles({ q, page_size: 5 });

  const d = dash.data;
  const receivable = d?.obligations?.find((o) => o.direction === "receivable" && o.currency === currency);
  const payable = d?.obligations?.find((o) => o.direction === "payable" && o.currency === currency);
  const overdueCount = (d?.obligations ?? []).reduce((n, o) => n + (o.overdue_count ?? 0), 0);
  const clients = d?.clients ?? [];
  const months = d?.invoiced_by_month?.find((m) => m.currency === currency)?.months ?? [];
  const cap = d?.studio_capacity;
  const capPct = cap?.capacity_minutes ? Math.round(((cap.booked_minutes ?? 0) / cap.capacity_minutes) * 100) : 0;
  const openTasks = clients.reduce((n, c) => n + (c.tasks?.open ?? 0), 0);

  const openRows = useMemo(() => {
    const items = obligations.data?.items ?? [];
    return [...items]
      .sort((a, b) => Number(Boolean(b.is_overdue)) - Number(Boolean(a.is_overdue)) || String(a.due_at).localeCompare(String(b.due_at)))
      .slice(0, 8);
  }, [obligations.data]);

  const subtitle = d
    ? `${spelled(clients.length)} ${clients.length === 1 ? "client" : "clients"} active, ${spelled(overdueCount).toLowerCase()} ${
        overdueCount === 1 ? "obligation" : "obligations"
      } past due, ${count(d.files_total ?? d.recent_files?.length ?? 0, "file")} in inventory.`
    : " ";

  return (
    <Page>
      <PageHeader title="Dashboard" subtitle={subtitle} actions={<AddNewMenu />} />

      <Grid>
        <GridItem span={5}>
          {dash.isLoading ? (
            <Card>
              <Skeleton width={96} height={12} />
              <Skeleton width={220} height={48} style={{ marginTop: 20 }} />
              <Skeleton width="80%" height={14} style={{ marginTop: 16 }} />
            </Card>
          ) : isManager ? (
            <FigureCard
              label="Outstanding"
              hero
              value={receivable?.outstanding ?? 0}
              format={(n) => money(Math.round(n), currency)}
              caption={
                receivable?.open_count
                  ? `Receivable across ${count(receivable.open_count, "open invoice")}${
                      receivable.overdue_count ? `, ${receivable.overdue_count} of them past their due date` : ""
                    }.`
                  : "Nothing is owed to the studio right now."
              }
              footer={months.length ? <Sparkbars values={months.map((m) => m.amount ?? 0)} label="Invoiced by month, last twelve months" /> : undefined}
            />
          ) : (
            <FigureCard label="Open work" hero value={openTasks} caption={`Across ${count(clients.length, "client")}.`} />
          )}
        </GridItem>
        <GridItem span={4}>
          <ListCard
            title="This month"
            caption="Four frozen numbers, one list."
            rows={[
              { label: "Active projects", value: d?.this_month?.active_projects ?? "—" },
              { label: "Hours logged", value: d?.this_month ? Math.round((d.this_month.minutes_logged ?? 0) / 60) : "—" },
              { label: "Invoices issued", value: d?.this_month?.invoices_issued ?? "—" },
              { label: "Files added", value: d?.this_month?.files_added ?? "—" },
            ]}
          />
        </GridItem>
        <GridItem span={3}>
          <div className={styles.stack}>
            {dash.isLoading ? (
              <Skeleton height={132} radius="14px" />
            ) : (
              <MeterCard
                title="Studio capacity"
                percent={capPct}
                caption={cap ? `${Math.round((cap.booked_minutes ?? 0) / 60)} of ${Math.round((cap.capacity_minutes ?? 0) / 60)} booked hours` : " "}
              />
            )}
            <ActionCard icon={CloudUploadIcon} title="Upload files" caption="Contracts, receipts, deliverables." onClick={() => upload.open()} />
          </div>
        </GridItem>
      </Grid>

      {isManager && (
        <Band heading="Open obligations" caption="Payable and receivable in one list. Overdue rises to the top.">
          <Table
            isEmpty={!obligations.isLoading && openRows.length === 0}
            empty={<EmptyState icon={UserGroupIcon} title="Nothing is owed in or out." description="Issued invoices and recorded payables land here." />}
            footer={
              <>
                <span>
                  Receivable {money(receivable?.outstanding ?? 0, currency)} · Payable {money(payable?.outstanding ?? 0, currency)}
                </span>
                <span>{count(overdueCount, "item")} overdue</span>
              </>
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
              {obligations.isLoading
                ? Array.from({ length: 4 }, (_, i) => (
                    <Tr key={i}>
                      <Td colSpan={5}>
                        <Skeleton width={`${60 - i * 8}%`} />
                      </Td>
                    </Tr>
                  ))
                : openRows.map((o) => (
                    <Tr key={o.id} interactive onClick={() => router.push(`/obligations?obligation=${o.id}`)}>
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
      )}

      <Band heading="Clients" actions={<TextLink as={Link} href="/clients" arrow="forward">All clients A–Z</TextLink>}>
        {clients.length === 0 && !dash.isLoading ? (
          <EmptyState framed icon={UserGroupIcon} title="No clients yet." action={isManager ? <Button onClick={() => router.push("/clients?new=1")}>Add client</Button> : undefined} />
        ) : (
          <Grid>
            {(dash.isLoading ? Array.from({ length: 3 }, () => null) : clients).map((c, i) => (
              <GridItem span={4} key={c?.client?.id ?? i}>
                {c ? (
                  <Link href={`/clients/${c.client?.id}`} className={styles.clientCard}>
                    <div className={styles.clientHead}>
                      <h3 className="h3">{c.client?.name}</h3>
                      {c.client?.health && HEALTH[c.client.health as Health] && (
                        <Chip tone={HEALTH[c.client.health as Health].tone} glyph={HEALTH[c.client.health as Health].glyph}>
                          {HEALTH[c.client.health as Health].label}
                        </Chip>
                      )}
                    </div>
                    <dl className={styles.clientStats}>
                      <div>
                        <dd className="kpi">{(c.projects?.active ?? 0) + (c.projects?.closed ?? 0)}</dd>
                        <dt className="caption">Projects</dt>
                      </div>
                      <div>
                        <dd className="kpi">{c.projects?.open ?? c.projects?.active ?? 0}</dd>
                        <dt className="caption">Open</dt>
                      </div>
                      {isManager && (
                        <div>
                          <dd className="kpi">{billedLabel(c.billed, currency)}</dd>
                          <dt className="caption">Billed</dt>
                        </div>
                      )}
                    </dl>
                  </Link>
                ) : (
                  <Card>
                    <Skeleton width="50%" />
                    <Skeleton width="70%" height={30} style={{ marginTop: 24 }} />
                  </Card>
                )}
              </GridItem>
            ))}
          </Grid>
        )}
      </Band>

      <Band heading="File inventory">
        <div className={common.toolbar}>
          <SearchInput className={common.toolbarSearch} placeholder="Search files" value={fileQuery} onChange={(e) => setFileQuery(e.target.value)} />
          <Button variant="primary" onClick={() => upload.open()}>
            Upload files
          </Button>
        </div>
        <Table
          density="compact"
          isEmpty={!files.isLoading && (files.data?.items ?? []).length === 0}
          empty={<EmptyState icon={CloudUploadIcon} title={q ? `No file matches “${q}”.` : "Nothing filed yet."} action={<Button onClick={() => upload.open()}>Upload files</Button>} />}
          footer={<span className="num-sm">{count(files.data?.total ?? 0, "file")} in inventory</span>}
        >
          <THead>
            <tr>
              <Th>File</Th>
              <Th>Client</Th>
              <Th>Category</Th>
              <Th numeric>Added</Th>
            </tr>
          </THead>
          <TBody>
            {(files.data?.items ?? []).map((f) => (
              <Tr key={f.id}>
                <Td primary truncate>{f.name}</Td>
                <Td>{lookups.clientName(f.client_id)}</Td>
                <Td>{FILE_CATEGORY[f.category as FileCategory] ?? f.category}</Td>
                <Td numeric title={longDate(f.created_at)}>
                  {shortDate(f.created_at)}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Band>
    </Page>
  );
}
