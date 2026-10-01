"use client";

import {
  Button,
  Card,
  Chip,
  ChoiceGroup,
  DateInput,
  Dropzone,
  Field,
  FormFooter,
  Grid,
  GridItem,
  Input,
  Page,
  PageHeader,
  PriorityMark,
  SearchSelect,
  Select,
  Stack,
  Textarea,
  UploadItem,
  toast,
} from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useLookups } from "@/lib/api/hooks";
import type { Project } from "@/lib/api/models";
import { FILE_CATEGORY, PROJECT_TYPE, TASK_STATUS, WORK_STATUSES, options, type FileCategory, type ProjectType, type WorkStatus } from "@/lib/domain";
import { bytes, currencySymbol, dayToInstant, fileKind, isoDay, parseMoney } from "@/lib/format";
import { CURRENCY_OPTIONS } from "@/lib/reference";
import { uploadToInventory } from "@/lib/upload";
import { useWorkspace } from "@/lib/workspace";
import { useCreate } from "../create/CreateProvider";
import styles from "./newProject.module.css";

interface Queued {
  id: number;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "failed";
  error?: string;
}

let seq = 1;

type Errors = Partial<Record<"name" | "client" | "code" | "type" | "assignee" | "manager" | "currency" | "assigned" | "due" | "fee" | "number" | "category", string>>;

export function NewProject() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const create = useCreate();
  const { path, workspace, user, currency: wsCurrency, isManager } = useWorkspace();
  const { clients, members, clientById } = useLookups();

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState(params.get("client") ?? "");
  const [code, setCode] = useState("");
  const [type, setType] = useState<ProjectType | undefined>();
  const [status, setStatus] = useState<WorkStatus>("backlog");
  const [priority, setPriority] = useState("2");
  const [assignee, setAssignee] = useState(user.id ?? "");
  const [manager, setManager] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("");
  const [assigned, setAssigned] = useState<string | null>(isoDay(new Date()));
  const [due, setDue] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<FileCategory | "">("");
  const [queue, setQueue] = useState<Queued[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState<"draft" | "create" | null>(null);

  const client = clientById.get(clientId);
  const cur = currency || client?.currency || wsCurrency;
  const people = members.map((m) => ({ value: m.user_id!, label: m.user_id === user.id ? `${m.display_name} (you)` : (m.display_name ?? "Member") }));

  if (!isManager) {
    return (
      <Page>
        <PageHeader eyebrow="Work" title="New project" subtitle="Only owners and managers can open a project." />
      </Page>
    );
  }

  const validate = (draft: boolean) => {
    const e: Errors = {};
    if (!name.trim()) e.name = "Name the project.";
    if (!clientId) e.client = "Choose the client.";
    if (code && !/^[A-Z0-9]{2,8}-[A-Z0-9]{2,8}$/.test(code)) e.code = "Like PRJ-0042: letters or digits, a dash, letters or digits.";
    const feeMinor = fee ? parseMoney(fee, cur) : 0;
    if (fee && (feeMinor === null || feeMinor < 0)) e.fee = "Enter the fee as a number.";
    if (invoiceNumber && !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/.test(invoiceNumber)) e.number = "Letters, digits, dots, dashes or slashes.";
    if (queue.some((q) => q.status !== "done") && !category) e.category = "Choose a category for the files.";
    if (!draft) {
      if (!type) e.type = "Choose the type of work.";
      if (!assignee) e.assignee = "Choose who is doing it.";
      if (!manager) e.manager = "Choose who manages it.";
      if (!cur) e.currency = "Choose the currency.";
      if (!assigned) e.assigned = "Choose the date it was assigned.";
      if (!due) e.due = "Choose when it is expected.";
    }
    setErrors(e);
    return Object.keys(e).length === 0 ? (feeMinor ?? 0) : null;
  };

  const submit = async (draft: boolean) => {
    const feeMinor = validate(draft);
    if (feeMinor === null) {
      toast.error("Some fields need attention");
      return;
    }
    setPending(draft ? "draft" : "create");
    try {
      const project = await api.post<Project>(path("/projects"), {
        client_id: clientId,
        name: name.trim(),
        code: code || undefined,
        type,
        status,
        priority: Number(priority),
        assignee_id: assignee || undefined,
        manager_id: manager || undefined,
        reviewer_id: reviewer || undefined,
        currency: cur,
        fee: feeMinor,
        due_at: dayToInstant(due, true),
        assigned_at: dayToInstant(assigned),
        baseline_at: dayToInstant(baseline, true),
        notes: notes.trim() || undefined,
        is_draft: draft,
      });

      if (invoiceName.trim() && feeMinor > 0) {
        try {
          await api.post(path("/invoices"), {
            client_id: clientId,
            project_id: project.id,
            name: invoiceName.trim(),
            number: invoiceNumber.trim() || undefined,
            currency: cur,
            line_items: [{ description: invoiceName.trim(), quantity_milli: 1000, unit_amount: feeMinor }],
            due_at: dayToInstant(due, true),
          });
        } catch (e) {
          toast.error("The project is saved, but its invoice wasn't", e instanceof Error ? e.message : undefined);
        }
      }

      for (const item of queue.filter((q) => q.status !== "done")) {
        setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: "uploading", progress: 1 } : x)));
        try {
          await uploadToInventory(path, item.file, { client_id: clientId, project_id: project.id!, category: category || "reference" }, (pct) =>
            setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, progress: pct } : x))),
          );
          setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 100 } : x)));
        } catch (e) {
          setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: "failed", error: e instanceof Error ? e.message : "Upload failed" } : x)));
        }
      }

      await Promise.all(["projects", "invoices", "files", "dashboard", "clients", "calendar"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));
      toast.success(draft ? "Draft saved" : "Project created", project.code ?? project.name ?? undefined);
      router.push(`/clients/${clientId}?project=${project.id}`);
    } catch (e) {
      toast.error("Couldn't save the project", e instanceof Error ? e.message : undefined);
    } finally {
      setPending(null);
    }
  };

  return (
    <Page className={styles.page}>
      <PageHeader eyebrow="Work" title="New project" subtitle="Name the work, attach it to a client, set the dates and the money." />
      <Grid className={styles.grid}>
        <GridItem span={5}>
          <Card>
            <h2 className={`h3 ${styles.cardTitle}`}>Project</h2>
            <Stack gap={16}>
              <Field label="Project name" required error={errors.name}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rebrand discovery" autoFocus />
              </Field>
              <div className={styles.pair}>
                <Field
                  label="Client"
                  required
                  error={errors.client}
                  aside={
                    <button type="button" className={styles.link} onClick={() => create.open("client")}>
                      Add client
                    </button>
                  }
                >
                  <SearchSelect
                    value={clientId}
                    onValueChange={setClientId}
                    placeholder="Client"
                    searchPlaceholder="Search clients"
                    options={clients.filter((c) => c.is_active !== false).map((c) => ({ value: c.id!, label: c.name ?? "Client", meta: c.code ?? undefined }))}
                  />
                </Field>
                <Field label="Project code" error={errors.code}>
                  <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PRJ-0042" />
                </Field>
              </div>
              <Field label="Type" required error={errors.type}>
                <ChoiceGroup<ProjectType> aria-label="Type" value={type} onValueChange={setType} options={options(PROJECT_TYPE)} />
              </Field>
              <Field label="Status" required>
                <ChoiceGroup<WorkStatus>
                  look="bare"
                  aria-label="Status"
                  value={status}
                  onValueChange={setStatus}
                  options={WORK_STATUSES.map((s) => ({
                    value: s,
                    label: (
                      <Chip tone={TASK_STATUS[s].tone} glyph={TASK_STATUS[s].glyph}>
                        {TASK_STATUS[s].label}
                      </Chip>
                    ),
                  }))}
                />
              </Field>
              <Field label="Priority">
                <ChoiceGroup
                  aria-label="Priority"
                  value={priority}
                  onValueChange={setPriority}
                  options={[1, 2, 3].map((p) => ({ value: String(p), label: <PriorityMark level={p as 1 | 2 | 3} format="code" /> }))}
                />
              </Field>
            </Stack>
          </Card>
        </GridItem>
        <GridItem span={4}>
          <Card>
            <h2 className={`h3 ${styles.cardTitle}`}>People</h2>
            <Stack gap={16}>
              <Field label="Assigned to" required error={errors.assignee}>
                <Select value={assignee} onValueChange={setAssignee} placeholder="Select a person" options={people} />
              </Field>
              <Field label="Managed by" required error={errors.manager}>
                <Select value={manager} onValueChange={setManager} placeholder="Select a person" options={people} />
              </Field>
              <Field label="Reviewer">
                <Select value={reviewer} onValueChange={setReviewer} placeholder="Select a person" options={people} />
              </Field>
            </Stack>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card>
            <h2 className={`h3 ${styles.cardTitle}`}>Invoice</h2>
            <Stack gap={16}>
              <Field label="Invoice name" hint="Name it to draft the invoice with the project.">
                <Input value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} placeholder="Rebrand — phase 1" />
              </Field>
              <Field label="Invoice number" error={errors.number}>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-0422" />
              </Field>
              <Field label="Fee" error={errors.fee}>
                <Input value={fee} onChange={(e) => setFee(e.target.value)} prefix={currencySymbol(cur)} placeholder="0.00" inputMode="decimal" />
              </Field>
              <Field label="Currency" required error={errors.currency}>
                <SearchSelect value={cur} onValueChange={setCurrency} placeholder="Currency" searchPlaceholder="Search currencies" options={CURRENCY_OPTIONS} />
              </Field>
            </Stack>
          </Card>
        </GridItem>

        <GridItem span={5}>
          <Card>
            <h2 className={`h3 ${styles.cardTitle}`}>Files</h2>
            <Dropzone
              onFiles={(files) => setQueue((q) => [...q, ...files.map((file) => ({ id: seq++, file, progress: 0, status: "queued" as const }))])}
              hint="PDF, PNG, DOCX, XLSX — they upload when the project is created."
            />
            {queue.map((q) => (
              <UploadItem
                key={q.id}
                name={q.file.name}
                kind={fileKind(q.file.name)}
                size={bytes(q.file.size)}
                progress={q.progress}
                status={q.status}
                error={q.error}
                onRemove={q.status === "uploading" ? undefined : () => setQueue((x) => x.filter((i) => i.id !== q.id))}
              />
            ))}
            <div style={{ marginTop: 16 }}>
              <Field label="Category" error={errors.category}>
                <Select value={category} onValueChange={(v) => setCategory(v as FileCategory)} placeholder="Category" options={options(FILE_CATEGORY)} />
              </Field>
            </div>
          </Card>
        </GridItem>
        <GridItem span={4}>
          <Card>
            <h2 className={`h3 ${styles.cardTitle}`}>Dates</h2>
            <Stack gap={16}>
              <Field label="Date assigned" required error={errors.assigned}>
                <DateInput value={assigned} onChange={setAssigned} />
              </Field>
              <Field label="Expected due date" required error={errors.due}>
                <DateInput value={due} onChange={setDue} min={assigned ?? undefined} />
              </Field>
              <Field label="Baseline">
                <DateInput value={baseline} onChange={setBaseline} clearable />
              </Field>
            </Stack>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card>
            <h2 className={`h3 ${styles.cardTitle}`}>Notes</h2>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the team should know." rows={9} />
          </Card>
        </GridItem>
      </Grid>

      <FormFooter note="All fields marked * are required">
        <Button variant="quiet" onClick={() => router.back()} disabled={pending !== null}>
          Cancel
        </Button>
        <Button onClick={() => submit(true)} loading={pending === "draft"} disabled={pending === "create"}>
          Save draft
        </Button>
        <Button variant="primary" onClick={() => submit(false)} loading={pending === "create"} disabled={pending === "draft"}>
          Create project
        </Button>
      </FormFooter>
    </Page>
  );
}
