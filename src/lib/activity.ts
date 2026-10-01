import type { Activity } from "./api/models";
import { TASK_STATUS, taskStatus } from "./domain";
import { shortDate } from "./format";

const label = (v: unknown) => (typeof v === "string" && v in TASK_STATUS ? TASK_STATUS[taskStatus(v)].label : String(v ?? "—"));

const subject = (a: Activity) => a.actor?.name ?? "Someone";

/** The line without its subject, for tables that show the actor in a column of their own: "Recorded a payment". */
export function describeAction(a: Activity) {
  const line = describe(a).slice(subject(a).length + 1).replace(/ it(?=$|:)/, "");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** One readable line per activity row: "Annika moved it from In Progress to In Review". */
export function describe(a: Activity) {
  const who = subject(a);
  const status = a.changes?.find((c) => c.field === "status");
  switch (a.type) {
    case "created":
      return `${who} created it`;
    case "status_changed":
      return status ? `${who} moved it from ${label(status.from)} to ${label(status.to)}` : `${who} changed the status`;
    case "assigned":
      return `${who} changed the assignee`;
    case "target_moved": {
      const t = a.changes?.find((c) => c.field === "target_at");
      return t ? `${who} moved the target from ${shortDate(t.from as string)} to ${shortDate(t.to as string)}` : `${who} moved the target`;
    }
    case "blocked":
      return `${who} marked it blocked${a.text ? `: ${a.text}` : ""}`;
    case "unblocked":
      return `${who} cleared the block`;
    case "comment":
      return `${who} commented`;
    case "file_attached":
      return `${who} attached ${a.text ?? "a file"}`;
    case "link_added":
      return `${who} added a link`;
    case "checklist_changed":
      return `${who} updated the checklist`;
    case "review_requested":
      return `${who} asked for a review`;
    case "review_decided":
      return `${who} decided the review`;
    case "review_withdrawn":
      return `${who} withdrew the review`;
    case "review_chased":
      return `${who} chased the review`;
    case "time_logged":
      return `${who} logged time`;
    case "invoice_issued":
      return `${who} issued it`;
    case "invoice_voided":
      return `${who} voided it${a.text ? `: ${a.text}` : ""}`;
    case "payment_recorded":
      return `${who} recorded a payment`;
    case "archived":
      return `${who} archived it`;
    case "restored":
      return `${who} restored it`;
    case "deleted":
      return `${who} deleted it`;
    case "updated": {
      const fields = (a.changes ?? []).map((c) => c.field?.replace(/_/g, " ")).filter(Boolean);
      return fields.length ? `${who} changed ${fields.join(", ")}` : `${who} updated it`;
    }
    default:
      return `${who} ${a.type?.replace(/_/g, " ") ?? "changed it"}`;
  }
}
