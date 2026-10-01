"use client";

import { Button, DateInput, Drawer, Field, Input, SearchSelect, Select, Stack, toast } from "@puckoops/camelot";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useLookups, useWsMutation } from "@/lib/api/hooks";
import type { Invoice } from "@/lib/api/models";
import { currencySymbol, dayToInstant, parseMoney } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useFormErrors } from "./useFormErrors";

export function InvoiceDrawer({
  open,
  onOpenChange,
  defaultClientId,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  defaultProjectId?: string;
}) {
  const { currency: wsCurrency } = useWorkspace();
  const { clients, projects, clientById } = useLookups();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState<string | null>(null);
  const { errors, check, clear } = useFormErrors<"name" | "client" | "amount" | "due" | "number">();

  const client = clientById.get(clientId);
  const project = projects.find((p) => p.id === projectId);
  const currency = project?.currency || client?.currency || wsCurrency;
  const clientProjects = projects.filter((p) => p.client_id === clientId && p.is_active !== false && !p.is_draft);

  const reset = () => {
    setName("");
    setNumber("");
    setClientId(defaultClientId ?? "");
    setProjectId(defaultProjectId ?? "");
    setAmount("");
    setDue(null);
    clear();
  };

  const create = useWsMutation((body: Record<string, unknown>, path) => api.post<Invoice>(path("/invoices"), body), ["invoices", "dashboard", "search"]);

  const submit = () => {
    const minor = parseMoney(amount, currency);
    const ok = check([
      ["name", !name.trim(), "Name the invoice."],
      ["number", Boolean(number) && !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/.test(number), "Use letters, digits, dots, dashes or slashes."],
      ["client", !clientId, "Choose who you are billing."],
      ["amount", minor === null || minor <= 0, "Enter an amount above zero."],
      ["due", !due, "Choose when it is due."],
    ]);
    if (!ok || minor === null) return;
    create.mutate(
      {
        client_id: clientId,
        project_id: projectId || undefined,
        name: name.trim(),
        number: number.trim() || undefined,
        currency,
        line_items: [{ description: name.trim(), quantity_milli: 1000, unit_amount: minor }],
        due_at: dayToInstant(due, true),
      },
      {
        onSuccess: (inv) => {
          toast.success("Draft invoice saved", inv.name ?? undefined);
          reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error("Couldn't save the invoice", e.message),
      },
    );
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="New invoice"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={create.isPending}>
            Save
          </Button>
        </>
      }
    >
      <Stack gap={16}>
        <Field label="Invoice name" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rebrand — phase 1" autoFocus />
        </Field>
        <Field label="Invoice number" hint="Leave empty to number it when it is issued." error={errors.number}>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="INV-0422" />
        </Field>
        <Field label="Client" required error={errors.client}>
          <SearchSelect
            value={clientId}
            onValueChange={(v) => {
              setClientId(v);
              setProjectId("");
            }}
            placeholder="Select a client"
            searchPlaceholder="Search clients"
            options={clients.filter((c) => c.is_active !== false).map((c) => ({ value: c.id!, label: c.name ?? "Client", meta: c.code ?? undefined }))}
          />
        </Field>
        {clientProjects.length > 0 && (
          <Field label="Project">
            <Select
              value={projectId}
              onValueChange={setProjectId}
              allLabel="No project"
              options={clientProjects.map((p) => ({ value: p.id!, label: p.name ?? "Project" }))}
            />
          </Field>
        )}
        <Field label="Amount" required error={errors.amount}>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} prefix={currencySymbol(currency)} placeholder="0.00" inputMode="decimal" />
        </Field>
        <Field label="Due date" required error={errors.due}>
          <DateInput value={due} onChange={setDue} />
        </Field>
      </Stack>
    </Drawer>
  );
}
