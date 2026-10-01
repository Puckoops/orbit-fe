"use client";

import { PackageIcon } from "@hugeicons/core-free-icons";
import {
  Band,
  Button,
  Card,
  Chip,
  EmptyState,
  FigureCard,
  Grid,
  GridItem,
  Page,
  PageHeader,
  Skeleton,
  Table,
  TBody,
  Td,
  TextLink,
  Tr,
} from "@puckoops/camelot";
import Link from "next/link";
import { useClient, useFiles, useProjects, useTasks } from "@/lib/api/hooks";
import { TASK_STATUS, taskStatus } from "@/lib/domain";
import { bytes, longDate, money, shortDate } from "@/lib/format";
import { useParamState } from "@/lib/hooks/useParamState";
import { useWorkspace } from "@/lib/workspace";
import { AddNewMenu } from "../create/CreateProvider";
import { ProjectDrawer } from "../projects/ProjectDrawer";
import { useCrumb } from "../shell/crumbs";
import { ClientDetails } from "./ClientDetails";
import styles from "./clients.module.css";

export function ClientFolder({ clientId }: { clientId: string }) {
  const { isManager } = useWorkspace();
  const client = useClient(clientId);
  const projects = useProjects({ client_id: clientId, include_archived: true, include_drafts: true });
  const files = useFiles({ client_id: clientId, page_size: 5 });
  const wip = useTasks({ client_id: clientId, page_size: 1, status: "in_progress,in_review,redo" });
  const completed = useTasks({ client_id: clientId, page_size: 1, status: "done", archived: "include" });
  const archived = useTasks({ client_id: clientId, page_size: 1, archived: "only" });
  const [projectId, setProjectId] = useParamState("project");
  useCrumb(client.data?.name);

  const rows = (projects.data?.items ?? []).filter((p) => p.is_active !== false || p.deactivation_reason === "archived");

  return (
    <Page>
      <PageHeader
        title={client.data?.name ?? <Skeleton width={220} height={30} />}
        subtitle="Projects, work in progress, completed and archived files."
        actions={
          <>
            {client.data && <ClientDetails client={client.data} />}
            <AddNewMenu clientId={clientId} />
          </>
        }
      />
      <Grid className={styles.folderGrid}>
        <GridItem span={8}>
          <Band first heading="Projects">
            <Table
              minWidth={480}
              isEmpty={!projects.isLoading && rows.length === 0}
              empty={
                <EmptyState
                  icon={PackageIcon}
                  title="No projects for this client yet."
                  action={isManager ? <Button asChild><Link href={`/projects/new?client=${clientId}`}>New project</Link></Button> : undefined}
                />
              }
            >
              <TBody>
                {projects.isLoading
                  ? Array.from({ length: 3 }, (_, i) => (
                      <Tr key={i}>
                        <Td colSpan={4}>
                          <Skeleton width={`${70 - i * 10}%`} />
                        </Td>
                      </Tr>
                    ))
                  : rows.map((p) => {
                      const s = TASK_STATUS[taskStatus(p.status)];
                      return (
                        <Tr key={p.id} interactive selected={projectId === p.id} onClick={() => setProjectId(p.id!)}>
                          <Td primary>
                            {p.name}
                            {p.is_draft ? <span className="caption text-4"> · draft</span> : null}
                            {p.deactivation_reason === "archived" ? <span className="caption text-4"> · archived</span> : null}
                          </Td>
                          <Td>
                            <Chip tone={s.tone} glyph={s.glyph}>
                              {s.label}
                            </Chip>
                          </Td>
                          <Td mono title={longDate(p.due_at)}>
                            {p.due_at ? shortDate(p.due_at) : "—"}
                          </Td>
                          <Td numeric>{isManager ? money(p.fee, p.currency) : ""}</Td>
                        </Tr>
                      );
                    })}
              </TBody>
            </Table>
          </Band>
        </GridItem>
        <GridItem span={4}>
          <div className={styles.side}>
            {wip.isLoading || completed.isLoading || archived.isLoading ? (
              <Skeleton height={140} radius="14px" />
            ) : (
              <FigureCard
                label="Work in progress"
                value={wip.data?.total ?? 0}
                caption={`Completed ${completed.data?.total ?? 0} · Archived (${archived.data?.total ?? 0})`}
              />
            )}
            <Card>
              <h3 className="h3">Files in this folder</h3>
              {(files.data?.items ?? []).length === 0 ? (
                <p className="small text-3" style={{ marginTop: 12 }}>
                  Nothing filed yet.
                </p>
              ) : (
                <ul className={styles.files} style={{ marginTop: 8 }}>
                  {(files.data?.items ?? []).map((f) => (
                    <li key={f.id}>
                      <span title={f.name ?? undefined}>{f.name}</span>
                      <span className="num-sm text-4">{bytes(f.size_bytes)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: "auto", paddingTop: 12 }}>
                <TextLink as={Link} href={`/inventory`} arrow="forward">
                  Inventory
                </TextLink>
              </div>
            </Card>
          </div>
        </GridItem>
      </Grid>
      <div className={styles.back}>
        <TextLink as={Link} href="/clients" arrow="back">
          Clients
        </TextLink>
      </div>
      <ProjectDrawer projectId={projectId} onClose={() => setProjectId(null)} />
    </Page>
  );
}
