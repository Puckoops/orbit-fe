"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { Icon, Glyph } from "@puckoops/camelot";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "@/lib/api/hooks";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { TASK_STATUS, taskStatus } from "@/lib/domain";
import styles from "./GlobalSearch.module.css";

interface Hit {
  key: string;
  group: string;
  label: string;
  meta?: string;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = useDebounced(q.trim(), 180);
  const { data, isFetching } = useSearch(query);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    if (!data || !query) return [];
    const out: Hit[] = [];
    for (const c of data.clients ?? []) out.push({ key: `c${c.id}`, group: "Clients", label: c.name ?? "Client", meta: c.code ?? undefined, href: `/clients/${c.id}` });
    for (const p of data.projects ?? [])
      out.push({ key: `p${p.id}`, group: "Projects", label: p.name ?? "Project", meta: p.code ?? undefined, href: `/clients/${p.client_id}?project=${p.id}` });
    for (const t of data.tasks ?? [])
      out.push({ key: `t${t.id}`, group: "Work", label: t.title ?? "Task", meta: `${t.key ?? ""} · ${TASK_STATUS[taskStatus(t.status)].label}`, href: `/tracker?task=${t.id}` });
    for (const f of data.files ?? []) out.push({ key: `f${f.id}`, group: "Files", label: f.name ?? "File", href: `/inventory?q=${encodeURIComponent(f.name ?? "")}` });
    for (const i of data.invoices ?? [])
      out.push({ key: `i${i.id}`, group: "Invoices", label: i.name || i.number || "Draft invoice", meta: i.number ?? "Draft", href: `/payments?invoice=${i.id}` });
    for (const o of data.obligations ?? [])
      out.push({ key: `o${o.id}`, group: "Obligations", label: o.title || o.ref || "Obligation", meta: o.ref ?? undefined, href: `/obligations?obligation=${o.id}` });
    return out;
  }, [data, query]);

  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    setOpen(false);
    setQ("");
    router.push(hit.href);
  };

  const showPanel = open && query.length > 0;
  let lastGroup = "";

  return (
    <div className={styles.search}>
      <label className={styles.box}>
        <Icon icon={Search01Icon} size={14} className={styles.icon} />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(hits[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
              input.current?.blur();
            }
          }}
          placeholder="Search everything"
          aria-label="Search everything"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          className={styles.input}
        />
        <kbd className={`num-sm ${styles.kbd}`}>⌘K</kbd>
      </label>
      {showPanel && (
        <div id="global-search-results" role="listbox" className={styles.panel}>
          {hits.length === 0 ? (
            <p className={`small ${styles.empty}`}>{isFetching ? "Searching…" : `Nothing matches “${query}”.`}</p>
          ) : (
            hits.map((h, i) => {
              const header = h.group !== lastGroup ? (lastGroup = h.group) : null;
              return (
                <div key={h.key}>
                  {header && <p className={`caps ${styles.group}`}>{header}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    className={styles.hit}
                    data-active={i === active || undefined}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(h)}
                  >
                    <Glyph shape="dot" className={styles.dot} />
                    <span className={styles.label}>{h.label}</span>
                    {h.meta && <span className={`num-sm ${styles.meta}`}>{h.meta}</span>}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
