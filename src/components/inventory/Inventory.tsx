"use client";

import { CloudUploadIcon, Download01Icon } from "@hugeicons/core-free-icons";
import { Button, EmptyState, IconButton, Page, PageHeader, SearchInput, Select, Skeleton, Table, TBody, Td, Th, THead, Tr, toast } from "@puckoops/camelot";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFiles, useLookups } from "@/lib/api/hooks";
import { FILE_CATEGORY, options, type FileCategory } from "@/lib/domain";
import { openDownload } from "@/lib/download";
import { bytes, count, isoDay, longDate, shortDate } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { useWorkspace } from "@/lib/workspace";
import { AddNewMenu } from "../create/CreateProvider";
import { FileName } from "../common/FileName";
import common from "../common/common.module.css";
import { useUpload } from "../upload/UploadProvider";

const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

function since(days: string) {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return isoDay(d) ?? undefined;
}

export function Inventory() {
  const params = useSearchParams();
  const { path } = useWorkspace();
  const upload = useUpload();
  const lookups = useLookups();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const q = useDebounced(search.trim(), 250);
  const [clientId, setClientId] = useState("");
  const [category, setCategory] = useState("");
  const [range, setRange] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const files = useFiles({
    q,
    client_id: clientId === "internal" ? undefined : clientId,
    internal: clientId === "internal" ? true : undefined,
    category,
    added_from: since(range),
    page,
    page_size: pageSize,
  });
  const totalAll = useFiles({ page_size: 1 });

  const items = files.data?.items ?? [];
  const total = files.data?.total ?? 0;
  const filtered = Boolean(q || clientId || category || range);

  const download = (id: string) => openDownload(path, id).catch((e) => toast.error("Couldn't download the file", e instanceof Error ? e.message : undefined));

  return (
    <Page>
      <PageHeader title="Inventory" subtitle="Everything the studio has filed, searchable and filtered." actions={<AddNewMenu />} />
      <div className={common.toolbar}>
        <SearchInput
          className={common.toolbarSearch}
          placeholder="Search inventory"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <Select
          variant="filter"
          allLabel="All clients"
          value={clientId}
          onValueChange={(v) => {
            setClientId(v);
            setPage(0);
          }}
          options={[{ value: "internal", label: "Internal" }, ...lookups.clients.map((c) => ({ value: c.id!, label: c.name ?? "Client" }))]}
          aria-label="Client"
        />
        <Select
          variant="filter"
          allLabel="All categories"
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(0);
          }}
          options={options(FILE_CATEGORY)}
          aria-label="Category"
        />
        <Select
          variant="filter"
          allLabel="Any date"
          value={range}
          onValueChange={(v) => {
            setRange(v);
            setPage(0);
          }}
          options={DATE_RANGES}
          aria-label="Added"
        />
        <button
          type="button"
          className={common.clear}
          disabled={!filtered}
          onClick={() => {
            setSearch("");
            setClientId("");
            setCategory("");
            setRange("");
            setPage(0);
          }}
        >
          Clear
        </button>
      </div>
      <Table
        isEmpty={!files.isLoading && items.length === 0}
        empty={
          <EmptyState
            icon={CloudUploadIcon}
            title={filtered ? "Nothing filed matches these filters." : "Nothing filed yet."}
            action={<Button onClick={() => upload.open()}>Upload files</Button>}
          />
        }
        footer={
          <>
            <span className="num-sm">
              {count(totalAll.data?.total ?? total, "file")} · {items.length} shown
            </span>
            {total > pageSize && (
              <span>
                <Button size="sm" variant="quiet" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>{" "}
                <Button size="sm" variant="quiet" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </span>
            )}
          </>
        }
      >
        <THead>
          <tr>
            <Th>File</Th>
            <Th>Client</Th>
            <Th>Category</Th>
            <Th numeric>Size</Th>
            <Th numeric>Added</Th>
            <Th aria-label="Actions" />
          </tr>
        </THead>
        <TBody>
          {files.isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <Tr key={i}>
                  <Td colSpan={6}>
                    <Skeleton width={`${72 - i * 7}%`} />
                  </Td>
                </Tr>
              ))
            : items.map((f) => (
                <Tr key={f.id}>
                  <Td primary truncate>
                    <FileName name={f.name ?? "File"} />
                  </Td>
                  <Td>{lookups.clientName(f.client_id)}</Td>
                  <Td>{FILE_CATEGORY[f.category as FileCategory] ?? f.category}</Td>
                  <Td numeric>{bytes(f.size_bytes)}</Td>
                  <Td numeric title={longDate(f.created_at)}>
                    {shortDate(f.created_at)}
                  </Td>
                  <Td>
                    <IconButton icon={Download01Icon} size="sm" variant="bare" aria-label={`Download ${f.name}`} onClick={() => download(f.id!)} />
                  </Td>
                </Tr>
              ))}
        </TBody>
      </Table>
    </Page>
  );
}
