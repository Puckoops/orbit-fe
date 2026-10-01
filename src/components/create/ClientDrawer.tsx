"use client";

import { Button, Chip, ChoiceGroup, Drawer, Field, Input, SearchSelect, Select, Stack, toast } from "@puckoops/camelot";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useLookups, useWsMutation } from "@/lib/api/hooks";
import type { Client } from "@/lib/api/models";
import { HEALTH, type Health } from "@/lib/domain";
import { CURRENCY_OPTIONS, LOCATIONS } from "@/lib/reference";
import { useWorkspace } from "@/lib/workspace";
import { useFormErrors } from "./useFormErrors";

export function ClientDrawer({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated?: (c: Client) => void }) {
  const { currency } = useWorkspace();
  const { members } = useLookups();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [owner, setOwner] = useState("");
  const [location, setLocation] = useState("");
  const [cur, setCur] = useState(currency);
  const [health, setHealth] = useState<Health>("on_track");
  const { errors, check, clear } = useFormErrors<"name" | "email" | "location" | "currency">();

  const reset = () => {
    setName("");
    setContact("");
    setEmail("");
    setIndustry("");
    setOwner("");
    setLocation("");
    setCur(currency);
    setHealth("on_track");
    clear();
  };

  const create = useWsMutation(
    (body: Record<string, unknown>, path) => api.post<Client>(path("/clients"), body),
    ["clients", "dashboard", "search"],
  );

  const submit = () => {
    const ok = check([
      ["name", !name.trim(), "Enter the client's name."],
      ["email", Boolean(email) && !/^\S+@\S+\.\S+$/.test(email), "That email address doesn't look right."],
      ["location", !location, "Choose where the client is based."],
      ["currency", !cur, "Choose the currency you bill them in."],
    ]);
    if (!ok) return;
    create.mutate(
      {
        name: name.trim(),
        industry: industry.trim() || undefined,
        account_owner_id: owner || undefined,
        location,
        currency: cur,
        health,
        contacts: contact.trim() || email.trim() ? [{ name: contact.trim() || email.trim(), email: email.trim() || undefined, is_primary: true }] : undefined,
      },
      {
        onSuccess: (client) => {
          toast.success("Client added", client.name ?? undefined);
          onCreated?.(client);
          reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error("Couldn't add the client", e.message),
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
      title="Add client"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={create.isPending}>
            Save client
          </Button>
        </>
      }
    >
      <Stack gap={16}>
        <Field label="Client name" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nordvik Atelier" autoFocus />
        </Field>
        <Field label="Contact">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Annika Revell" />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="annika@nordvikatelier.com" type="email" />
        </Field>
        <Field label="Industry">
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Design studio" />
        </Field>
        <Field label="Account owner">
          <Select
            value={owner}
            onValueChange={setOwner}
            placeholder="Select a person"
            options={members.map((m) => ({ value: m.user_id!, label: m.display_name ?? m.email ?? "Member" }))}
          />
        </Field>
        <Field label="Location" required error={errors.location}>
          <SearchSelect value={location} onValueChange={setLocation} placeholder="Select a location" searchPlaceholder="Search locations" options={LOCATIONS} aria-invalid={Boolean(errors.location)} />
        </Field>
        <Field label="Currency" required error={errors.currency}>
          <SearchSelect value={cur} onValueChange={setCur} searchPlaceholder="Search currencies" options={CURRENCY_OPTIONS} />
        </Field>
        <Field label="Health">
          <ChoiceGroup<Health>
            look="bare"
            aria-label="Health"
            value={health}
            onValueChange={setHealth}
            options={(Object.keys(HEALTH) as Health[]).map((h) => ({
              value: h,
              label: (
                <Chip tone={HEALTH[h].tone} glyph={HEALTH[h].glyph}>
                  {HEALTH[h].label}
                </Chip>
              ),
            }))}
          />
        </Field>
      </Stack>
    </Drawer>
  );
}
