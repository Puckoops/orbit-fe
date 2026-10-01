"use client";

import { Add01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Button, Menu, MenuItem } from "@puckoops/camelot";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useWorkspace } from "@/lib/workspace";
import { ClientDrawer } from "./ClientDrawer";
import { InvoiceDrawer } from "./InvoiceDrawer";
import { PayableDrawer } from "./PayableDrawer";
import { TaskDrawer } from "./TaskDrawer";

export type CreateKind = "client" | "task" | "invoice" | "payable";

interface CreateState {
  open: (kind: CreateKind, defaults?: { clientId?: string; projectId?: string }) => void;
}

const Ctx = createContext<CreateState>({ open: () => {} });

export function CreateProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<CreateKind | null>(null);
  const [defaults, setDefaults] = useState<{ clientId?: string; projectId?: string }>({});
  const open = useCallback((k: CreateKind, d: { clientId?: string; projectId?: string } = {}) => {
    setDefaults(d);
    setKind(k);
  }, []);
  const close = (o: boolean) => !o && setKind(null);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <ClientDrawer open={kind === "client"} onOpenChange={close} />
      <TaskDrawer key={`task-${defaults.projectId ?? ""}`} open={kind === "task"} onOpenChange={close} defaultProjectId={defaults.projectId} />
      <InvoiceDrawer
        key={`invoice-${defaults.clientId ?? ""}-${defaults.projectId ?? ""}`}
        open={kind === "invoice"}
        onOpenChange={close}
        defaultClientId={defaults.clientId}
        defaultProjectId={defaults.projectId}
      />
      <PayableDrawer open={kind === "payable"} onOpenChange={close} />
    </Ctx.Provider>
  );
}

export function useCreate() {
  return useContext(Ctx);
}

/** The page head's primary action. Members can only add work; the rest needs an owner or manager. */
export function AddNewMenu({ extra, clientId }: { extra?: { label: string; kind: CreateKind }[]; clientId?: string }) {
  const router = useRouter();
  const { open } = useCreate();
  const { isManager } = useWorkspace();
  return (
    <Menu
      trigger={
        <Button variant="primary" iconStart={Add01Icon} iconEnd={ArrowDown01Icon}>
          Add new
        </Button>
      }
    >
      {isManager && <MenuItem onSelect={() => router.push(clientId ? `/projects/new?client=${clientId}` : "/projects/new")}>New project</MenuItem>}
      {isManager && <MenuItem onSelect={() => open("client")}>New client</MenuItem>}
      <MenuItem onSelect={() => open("task")}>New task</MenuItem>
      {isManager && <MenuItem onSelect={() => open("invoice", { clientId })}>New invoice</MenuItem>}
      {isManager &&
        extra?.map((e) => (
          <MenuItem key={e.kind} onSelect={() => open(e.kind)}>
            {e.label}
          </MenuItem>
        ))}
    </Menu>
  );
}
