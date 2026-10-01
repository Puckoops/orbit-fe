"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** A string kept in the URL's query, so a drawer or filter survives reloads and can be linked to. */
export function useParamState(name: string) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get(name);
  const set = useCallback(
    (next: string | null) => {
      const sp = new URLSearchParams(params);
      if (next) sp.set(name, next);
      else sp.delete(name);
      router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
    },
    [name, params, pathname, router],
  );
  return [value, set] as const;
}
