import type { TaskStatus } from "./domain";

export const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  backlog: ["todo", "in_progress", "cancelled"],
  todo: ["backlog", "in_progress", "cancelled"],
  in_progress: ["todo", "in_review", "cancelled"],
  in_review: ["done", "redo", "in_progress"],
  redo: ["in_progress", "in_review"],
  done: ["redo"],
  cancelled: ["backlog"],
};

/** What the move is called where the transition has a meaning of its own. */
export function actionLabel(from: TaskStatus, to: TaskStatus) {
  if (from === "in_review" && to === "done") return "Approve";
  if (from === "in_review" && to === "redo") return "Request changes";
  if (from === "in_review" && to === "in_progress") return "Withdraw from review";
  if (from === "done" && to === "redo") return "Reopen as Re-do";
  if (to === "in_review") return "Send for review";
  if (to === "in_progress") return from === "redo" ? "Resume" : "Start";
  if (to === "cancelled") return "Cancel";
  if (to === "backlog") return "Back to Backlog";
  if (to === "todo") return "Move to To Do";
  return to;
}

export function canMove(from: TaskStatus, to: TaskStatus) {
  return ALLOWED[from].includes(to);
}

/** The first stop on the way from one status to another, for a helpful message when a drop skips steps. */
export function nextStep(from: TaskStatus, to: TaskStatus): TaskStatus | null {
  const seen = new Set<TaskStatus>([from]);
  let frontier: [TaskStatus, TaskStatus | null][] = [[from, null]];
  while (frontier.length) {
    const next: [TaskStatus, TaskStatus | null][] = [];
    for (const [s, first] of frontier) {
      for (const n of ALLOWED[s]) {
        if (seen.has(n)) continue;
        const step = first ?? n;
        if (n === to) return step;
        seen.add(n);
        next.push([n, step]);
      }
    }
    frontier = next;
  }
  return null;
}
