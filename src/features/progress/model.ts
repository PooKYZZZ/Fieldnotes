export const progressStatuses = [
  "not_started",
  "in_progress",
  "needs_review",
  "completed",
] as const;

export const comfortLevels = ["familiar", "guided", "independent"] as const;
export const progressItemTypes = [
  "module",
  "lesson",
  "activity",
  "troubleshooting",
  "small_project",
  "project",
  "milestone",
] as const;

export type ProgressStatus = (typeof progressStatuses)[number];
export type ComfortLevel = (typeof comfortLevels)[number];
export type ProgressItemType = (typeof progressItemTypes)[number];

export type ProgressInput = {
  itemType: ProgressItemType;
  itemId: string;
  status: ProgressStatus;
  comfort: ComfortLevel | null;
  notes: string;
  evidence: string;
  repositoryUrl: string;
  taskObservations?: Record<string, string>;
};

export type ProgressRecord = ProgressInput & { updatedAt: number };

export function formatStatus(status: ProgressStatus): string {
  return {
    not_started: "Not started",
    in_progress: "In progress",
    needs_review: "Needs review",
    completed: "Completed",
  }[status];
}

