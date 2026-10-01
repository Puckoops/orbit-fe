"use client";

import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { Avatar, AzStrip, Button, Chip, EmptyState, Page, PageHeader, SearchInput, Skeleton, Table, TBody, Td, TextLink, Tr } from "@puckoops/camelot";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useClients } from "@/lib/api/hooks";
import type { Client } from "@/lib/api/models";
import { HEALTH, type Health } from "@/lib/domain";
import { count, money, spelled } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { useWorkspace } from "@/lib/workspace";
import { AddNewMenu, useCreate } from "../create/CreateProvider";
import common from "../common/common.module.css";
import styles from "./clients.module.css";

function billed(c: Client, fallback: string) {
  const b = c.stats?.billed;
  if (!b?.length) return money(0, c.currency ?? fallback);
  const pick = b.find((x) => x.currency === c.currency) ?? b[0]!;
  return money(pick.amount, pick.currency);
}

export function Clients() {
  const router = useRouter();
  const params = useSearchParams();
  const { open } = useCreate();
  const { isManager, currency } = useWorkspace();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const [letter, setLetter] = useState<string | null>(null);
  const clients = useClients({ search: q, with_stats: true });

  useEffect(() => {
    if (params.get("new") === "1" && isManager) open("client");
  }, [params, isManager, open]);

  const items = useMemo(() => clients.data?.items ?? [], [clients.data]);
  const letters = useMemo(() => new Set(items.map((c) => (c.name ?? "").trim().charAt(0).toUpperCase()).filter(Boolean)), [items]);

  const jump = (l: string) => {
    setLetter(l);
    document.querySelector(`[data-letter="${l}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  let seen = "";

  return (
    <Page>
      <PageHeader
        title="Clients"
        subtitle={clients.data ? `${spelled(clients.data.total)} ${clients.data.total === 1 ? "client" : "clients"}, their open work and what they have been billed.` : " "}
        actions={<AddNewMenu />}
      />
      <div className={common.toolbar}>
        <SearchInput className={styles.search} placeholder="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className={common.spacer} />
        <AzStrip available={letters} active={letter} onSelect={jump} />
      </div>
      <Table
        density="relaxed"
        minWidth={560}
        isEmpty={!clients.isLoading && items.length === 0}
        empty={
          <EmptyState
            icon={UserGroupIcon}
            title={q ? `No client matches “${q}”.` : "No clients yet."}
            action={isManager ? <Button onClick={() => open("client")}>Add client</Button> : undefined}
          />
        }
      >
        <TBody>
          {clients.isLoading
            ? Array.from({ length: 5 }, (_, i) => (
                <Tr key={i}>
                  <Td colSpan={5}>
                    <Skeleton width={`${60 - i * 6}%`} />
                  </Td>
                </Tr>
              ))
            : items.map((c) => {
                const initial = (c.name ?? "").trim().charAt(0).toUpperCase();
                const first = initial !== seen;
                seen = initial;
                const health = HEALTH[(c.health as Health) ?? "on_track"];
                return (
                  <Tr key={c.id} interactive tabIndex={-1} onClick={() => router.push(`/clients/${c.id}`)} data-letter={first ? initial : undefined}>
                    <Td primary>
                      <Link href={`/clients/${c.id}`} className={styles.name} onClick={(e) => e.stopPropagation()}>
                        <Avatar name={c.name ?? "?"} square size={28} />
                        <span>{c.name}</span>
                      </Link>
                    </Td>
                    <Td>
                      {health && (
                        <Chip tone={health.tone} glyph={health.glyph}>
                          {health.label}
                        </Chip>
                      )}
                    </Td>
                    <Td mono>{count(c.stats?.projects ?? 0, "project")}</Td>
                    <Td mono>{count(c.stats?.files ?? 0, "file")}</Td>
                    <Td numeric>{isManager ? billed(c, currency) : ""}</Td>
                  </Tr>
                );
              })}
        </TBody>
      </Table>
      <div className={styles.back}>
        <TextLink as={Link} href="/dashboard" arrow="back">
          Dashboard
        </TextLink>
      </div>
    </Page>
  );
}
