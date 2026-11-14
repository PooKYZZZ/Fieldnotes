import { Check, Circle, Clock3, RotateCcw } from "lucide-react";
import { formatStatus, type ProgressRecord } from "@/features/progress/model";

type Status = ProgressRecord["status"];
const statusIcons = { not_started: Circle, in_progress: Clock3, needs_review: RotateCcw, completed: Check } satisfies Record<Status, typeof Circle>;

export function StatusPill({ status }: { status: Status }) {
  const Icon = statusIcons[status];
  return <span className={`status-pill ${status}`}><Icon size={12} aria-hidden="true" />{formatStatus(status)}</span>;
}

