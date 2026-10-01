import type { ChipTone, GlyphShape, PriorityLevel } from "@puckoops/camelot";

export interface StateStyle {
  label: string;
  glyph: GlyphShape;
  tone: ChipTone;
  struck?: boolean;
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "redo" | "done" | "cancelled";
export type WorkStatus = Exclude<TaskStatus, "cancelled">;

export const TASK_STATUS: Record<TaskStatus, StateStyle> = {
  backlog: { label: "Backlog", glyph: "square", tone: "neutral" },
  todo: { label: "To Do", glyph: "circle", tone: "neutral" },
  in_progress: { label: "In Progress", glyph: "circle-half", tone: "blue" },
  in_review: { label: "In Review", glyph: "diamond", tone: "blue" },
  redo: { label: "Re-do", glyph: "redo", tone: "amber" },
  done: { label: "Done", glyph: "check", tone: "teal" },
  cancelled: { label: "Cancelled", glyph: "circle-dashed", tone: "neutral", struck: true },
};

export const BLOCKED: StateStyle = { label: "Blocked", glyph: "triangle", tone: "red" };

export const WORK_STATUSES: WorkStatus[] = ["backlog", "todo", "in_progress", "in_review", "redo", "done"];

export type ItemType = "task" | "bug" | "deliverable";

export const ITEM_TYPE: Record<ItemType, { label: string; glyph: GlyphShape }> = {
  task: { label: "Task", glyph: "square" },
  bug: { label: "Bug", glyph: "triangle" },
  deliverable: { label: "Deliverable", glyph: "diamond-filled" },
};

export type ProjectType = "development" | "design" | "bug" | "audit" | "tag";

export const PROJECT_TYPE: Record<ProjectType, string> = {
  development: "Development",
  design: "Design",
  bug: "Bug",
  audit: "Audit",
  tag: "Tag",
};

export type Health = "on_track" | "at_risk" | "needs_attention";

export const HEALTH: Record<Health, StateStyle> = {
  on_track: { label: "On track", glyph: "check", tone: "teal" },
  at_risk: { label: "At risk", glyph: "triangle", tone: "amber" },
  needs_attention: { label: "Needs attention", glyph: "triangle", tone: "red" },
};

export type PaymentStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "disputed"
  | "written_off"
  | "failed";

export const INVOICE_STAGE: Record<PaymentStatus, StateStyle> = {
  draft: { label: "Draft", glyph: "square", tone: "neutral" },
  issued: { label: "Issued", glyph: "circle-half", tone: "blue" },
  partially_paid: { label: "Partially paid", glyph: "diamond", tone: "amber" },
  paid: { label: "Paid", glyph: "check", tone: "teal" },
  overdue: { label: "Overdue", glyph: "triangle", tone: "red" },
  void: { label: "Void", glyph: "cross", tone: "neutral", struck: true },
  disputed: { label: "Disputed", glyph: "circle", tone: "blue" },
  written_off: { label: "Written off", glyph: "cross", tone: "neutral", struck: true },
  failed: { label: "Failed", glyph: "triangle", tone: "red" },
};

export const DIRECTION: Record<"payable" | "receivable", StateStyle> = {
  payable: { label: "Payable", glyph: "diamond-filled", tone: "amber" },
  receivable: { label: "Receivable", glyph: "diamond", tone: "blue" },
};

export const OVERDUE: StateStyle = { label: "Overdue", glyph: "triangle", tone: "red" };

export type FileCategory =
  | "deliverable"
  | "source"
  | "reference"
  | "contract"
  | "invoice"
  | "meeting_notes"
  | "estimate"
  | "receipt";

export const FILE_CATEGORY: Record<FileCategory, string> = {
  deliverable: "Deliverable",
  source: "Source file",
  reference: "Reference",
  contract: "Contract",
  invoice: "Invoice",
  meeting_notes: "Meeting notes",
  estimate: "Estimate",
  receipt: "Receipt",
};

export function priorityLevel(p: number | null | undefined): PriorityLevel {
  if (p === 1) return 1;
  if (p === 3 || (p ?? 0) > 3) return 3;
  return 2;
}

export function taskStatus(s: string | null | undefined): TaskStatus {
  return (s && s in TASK_STATUS ? s : "backlog") as TaskStatus;
}

export function options<K extends string>(record: Record<K, string | { label: string }>) {
  return (Object.keys(record) as K[]).map((value) => {
    const v = record[value];
    return { value, label: typeof v === "string" ? v : v.label };
  });
}
