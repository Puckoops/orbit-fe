"use client";

import { Glyph, type GlyphShape } from "@puckoops/camelot";
import Link from "next/link";
import type { Calendar } from "@/lib/api/models";
import { isoDay } from "@/lib/format";
import styles from "./calendar.module.css";

const DAY = 86_400_000;

function slip(t: NonNullable<Calendar["tasks"]>[number]): { shape: GlyphShape; label: string } {
  const now = Date.now();
  const target = t.target_at ? new Date(t.target_at).getTime() : null;
  if (t.status !== "done" && target !== null && target < now) return { shape: "diamond-filled", label: "slipped past due" };
  if ((t.slip_days ?? 0) > 0 || (t.status !== "done" && target !== null && target - now < 2 * DAY)) return { shape: "triangle", label: "at risk" };
  return { shape: "diamond", label: "on track" };
}

export function Timeline({
  data,
  from,
  to,
  clientName,
  clientId,
  projectId,
}: {
  data: Calendar | undefined;
  from: string;
  to: string;
  clientName: (id?: string | null) => string;
  clientId: string;
  projectId: string;
}) {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T23:59:59`).getTime();
  const span = end - start;
  const pos = (ms: number) => Math.min(100, Math.max(0, ((ms - start) / span) * 100));
  const rows = (data?.tasks ?? [])
    .filter((t) => (!clientId || t.client_id === clientId) && (!projectId || t.project_id === projectId))
    .filter((t) => t.target_at)
    .slice(0, 40);
  const ticks: string[] = [];
  for (let ms = start; ms <= end; ms += 3 * DAY) ticks.push(isoDay(new Date(ms))!);

  if (!rows.length) return <p className={`small ${styles.agendaEmpty}`}>No dated work in this window.</p>;

  return (
    <div className={styles.timeline}>
      <div className={styles.tlHead}>
        <span className="caps text-4">Work</span>
        <div className={styles.tlTicks}>
          {ticks.map((d) => (
            <span key={d} className="num-sm text-4" style={{ left: `${pos(new Date(`${d}T00:00:00`).getTime())}%` }}>
              {d.slice(8)}
            </span>
          ))}
        </div>
      </div>
      {rows.map((t, i) => {
        const target = new Date(t.target_at!).getTime();
        const begin = t.start_at ? new Date(t.start_at).getTime() : t.baseline_at ? Math.min(new Date(t.baseline_at).getTime(), target) - 5 * DAY : target - 7 * DAY;
        const finish = t.shipped_at ? Math.max(new Date(t.shipped_at).getTime(), target) : target;
        const left = pos(begin);
        const width = Math.max(2, pos(finish) - left);
        const s = slip(t);
        return (
          <div key={t.task_id} className={styles.tlRow}>
            <Link href={`/tracker?task=${t.task_id}`} className={`small ${styles.tlName}`} title={t.title ?? undefined}>
              {t.title}
            </Link>
            <div className={styles.tlTrack}>
              <span className={styles.tlBar} style={{ left: `${left}%`, width: `${width}%`, animationDelay: `${i * 40}ms` }} title={`${t.title} — ${s.label}`}>
                <Glyph shape={s.shape} size={10} />
                <span className={styles.tlClient}>{clientName(t.client_id)}</span>
              </span>
            </div>
          </div>
        );
      })}
      <p className={`caption ${styles.slipKey}`}>
        Slip key — <Glyph shape="diamond" size={10} /> on track <Glyph shape="triangle" size={10} /> at risk <Glyph shape="diamond-filled" size={10} /> slipped past due
      </p>
    </div>
  );
}
