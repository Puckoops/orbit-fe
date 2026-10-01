"use client";

import { Button, DateInput, Drawer, Field, Input, SegmentedControl, Select, Stack, toast } from "@puckoops/camelot";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { MAX_PAGE, useLookups, useWsKey, useWsMutation } from "@/lib/api/hooks";
import type { ListResponse, Obligation } from "@/lib/api/models";
import type { VendorView } from "@/lib/api/types.gen";
import { currencySymbol, dayToInstant, parseMoney } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useFormErrors } from "./useFormErrors";

type PartyKind = "vendor" | "member";

export function PayableDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { path, currency: wsCurrency } = useWorkspace();
  const key = useWsKey();
  const { projects, members, clientName } = useLookups();
  const vendors = useQuery({
    queryKey: key("vendors"),
    queryFn: () => api.get<ListResponse<VendorView>>(path("/vendors"), { page_size: MAX_PAGE }),
    enabled: open,
  });
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PartyKind>("vendor");
  const [party, setParty] = useState("");
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState<string | null>(null);
  const { errors, check, clear } = useFormErrors<"title" | "party" | "amount" | "due">();

  const project = projects.find((p) => p.id === projectId);
  const currency = project?.currency || wsCurrency;

  const reset = () => {
    setTitle("");
    setKind("vendor");
    setParty("");
    setProjectId("");
    setAmount("");
    setDue(null);
    clear();
  };

  const create = useWsMutation(
    (body: Record<string, unknown>, p) => api.post<Obligation>(p("/obligations"), body),
    ["obligations", "obligations-summary", "dashboard", "calendar"],
  );

  const submit = () => {
    const minor = parseMoney(amount, currency);
    const ok = check([
      ["title", !title.trim(), "Say what the payment is for."],
      ["party", !party, kind === "vendor" ? "Choose the vendor." : "Choose the person."],
      ["amount", minor === null || minor <= 0, "Enter an amount above zero."],
      ["due", !due, "Choose when it is due."],
    ]);
    if (!ok || minor === null) return;
    create.mutate(
      {
        title: title.trim(),
        counterparty_kind: kind,
        counterparty_id: party,
        project_id: projectId || undefined,
        amount: minor,
        currency,
        due_at: dayToInstant(due, true),
      },
      {
        onSuccess: () => {
          toast.success("Payable recorded", title.trim());
          reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error("Couldn't record the payable", e.message),
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
      title="New payable"
      description="Money the studio owes: a vendor bill, a freelancer, a subscription."
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
        <Field label="What for" required error={errors.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Studio insurance renewal" autoFocus />
        </Field>
        <Stack gap={8}>
          <SegmentedControl<PartyKind>
            aria-label="Paid to"
            size="sm"
            value={kind}
            onValueChange={(v) => {
              setKind(v);
              setParty("");
            }}
            options={[
              { value: "vendor", label: "Vendor" },
              { value: "member", label: "Team member" },
            ]}
          />
          <Field label={kind === "vendor" ? "Vendor" : "Person"} required error={errors.party}>
            <Select
              value={party}
              onValueChange={setParty}
              placeholder={kind === "vendor" ? "Select a vendor" : "Select a person"}
              options={
                kind === "vendor"
                  ? (vendors.data?.items ?? []).filter((v) => v.is_active !== false).map((v) => ({ value: v.id!, label: v.name ?? "Vendor" }))
                  : members.map((m) => ({ value: m.user_id!, label: m.display_name ?? "Member" }))
              }
            />
          </Field>
        </Stack>
        <Field label="Project" hint="Leave empty for studio costs; they show as Internal.">
          <Select
            value={projectId}
            onValueChange={setProjectId}
            allLabel="Internal"
            options={projects
              .filter((p) => p.is_active !== false && !p.is_draft)
              .map((p) => ({ value: p.id!, label: `${p.name} · ${clientName(p.client_id)}`, text: p.name ?? undefined }))}
          />
        </Field>
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
