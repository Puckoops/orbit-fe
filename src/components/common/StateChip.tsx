import { Chip } from "@puckoops/camelot";
import type { StateStyle } from "@/lib/domain";

export function StateChip({ state }: { state: StateStyle }) {
  return (
    <Chip tone={state.tone} glyph={state.glyph} struck={state.struck}>
      {state.label}
    </Chip>
  );
}
