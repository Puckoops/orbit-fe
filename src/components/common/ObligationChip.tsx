import { Chip } from "@puckoops/camelot";
import { DIRECTION, OVERDUE } from "@/lib/domain";

export function ObligationChip({ direction, overdue }: { direction?: string | null; overdue?: boolean | null }) {
  const s = overdue ? OVERDUE : DIRECTION[direction === "payable" ? "payable" : "receivable"];
  return (
    <Chip tone={s.tone} glyph={s.glyph}>
      {s.label}
    </Chip>
  );
}
