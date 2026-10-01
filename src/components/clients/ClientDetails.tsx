"use client";

import { Button, Chip, ChoiceGroup, DescriptionList, Drawer, DrawerSection, toast } from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useLookups } from "@/lib/api/hooks";
import type { Client } from "@/lib/api/models";
import { HEALTH, type Health } from "@/lib/domain";
import { count, money, shortDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export function ClientDetails({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const { path, workspace, isManager } = useWorkspace();
  const qc = useQueryClient();
  const lookups = useLookups();
  const contact = client.contacts?.find((c) => c.is_primary) ?? client.contacts?.[0];

  const setHealth = async (health: Health) => {
    try {
      await api.patch(path(`/clients/${client.id}`), { version: client.version, health });
      await Promise.all(["clients", "dashboard"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })));
    } catch (e) {
      toast.error("Couldn't update the client", e instanceof Error ? e.message : undefined);
    }
  };

  const billed = client.stats?.billed?.find((b) => b.currency === client.currency) ?? client.stats?.billed?.[0];

  return (
    <>
      <Button onClick={() => setOpen(true)}>Client details</Button>
      <Drawer open={open} onOpenChange={setOpen} title={client.name ?? "Client"}>
        {isManager && (
          <DrawerSection title="Health">
            <ChoiceGroup<Health>
              look="bare"
              aria-label="Health"
              value={(client.health as Health) ?? "on_track"}
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
          </DrawerSection>
        )}
        <DrawerSection title="A–Z record">
          <DescriptionList
            items={[
              { label: "Account owner", value: lookups.personName(client.account_owner_id) },
              { label: "Product owner", value: lookups.personName(client.product_owner_id) },
              { label: "Contact", value: contact?.name ?? "—" },
              { label: "Email", value: contact?.email ?? "—" },
              { label: "Industry", value: client.industry ?? "—" },
              { label: "Location", value: client.location ?? "—" },
              { label: "Currency", value: client.currency ?? "—" },
              { label: "Client since", value: <span className="num">{shortDate(client.client_since ?? client.created_at)}</span> },
              { label: "Projects", value: <span className="num">{count(client.stats?.projects ?? 0, "project")}</span> },
              { label: "Contract value", value: isManager ? <span className="num">{money(billed?.amount ?? 0, billed?.currency ?? client.currency)}</span> : "—" },
              { label: "Code", value: <span className="num">{client.code}</span> },
            ]}
          />
        </DrawerSection>
      </Drawer>
    </>
  );
}
