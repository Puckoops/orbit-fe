"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface CrumbState {
  extra: string | null;
  setExtra: (label: string | null) => void;
}

const Ctx = createContext<CrumbState>({ extra: null, setExtra: () => {} });

export function CrumbProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<string | null>(null);
  return <Ctx.Provider value={{ extra, setExtra }}>{children}</Ctx.Provider>;
}

export function useCrumbExtra() {
  return useContext(Ctx).extra;
}

/** Lets a page name itself in the breadcrumb, such as a client folder's client name. */
export function useCrumb(label: string | null | undefined) {
  const { setExtra } = useContext(Ctx);
  useEffect(() => {
    setExtra(label ?? null);
    return () => setExtra(null);
  }, [label, setExtra]);
}
