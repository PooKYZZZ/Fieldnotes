import { z } from "zod";
import { activities, majorProjects, modules, projectMilestones, smallProjects, troubleshooting } from "@/content";
import { a01TaskIds } from "@/content/a01-task-ids";
import { comfortLevels, progressItemTypes, progressStatuses, type ProgressInput, type ProgressItemType } from "@/features/progress/model";
import { maxBackupRecords } from "@/features/progress/backup-limits";
import { isValidProgressTimestamp } from "@/features/progress/timestamp";

const itemIdSchema = z.string().trim().min(2).max(16).regex(/^[A-Za-z0-9.-]+$/);

const knownItemIds: Record<ProgressItemType, ReadonlySet<string>> = {
  module: new Set(modules.map((item) => `M${String(item.id).padStart(2, "0")}`)),
  lesson: new Set(modules.flatMap((item) => item.lessons.map((lesson) => lesson.id))),
  activity: new Set(activities.map((item) => item.id)),
  troubleshooting: new Set(troubleshooting.map((item) => item.id)),
  small_project: new Set(smallProjects.map((item) => item.id)),
  project: new Set(majorProjects.map((item) => item.id)),
  milestone: new Set(projectMilestones.map((item) => item.id)),
};

function belongsToCatalog(item: { itemType: ProgressItemType; itemId: string }) {
  return knownItemIds[item.itemType].has(item.itemId);
}

export const progressLookupSchema = z.object({
  itemType: z.enum(progressItemTypes),
  itemId: itemIdSchema,
}).refine(belongsToCatalog, { path: ["itemId"], message: "Select a learning item from this workspace." });

export const progressSchema = z.object({
  itemType: z.enum(progressItemTypes),
  itemId: itemIdSchema,
  status: z.enum(progressStatuses),
  comfort: z.enum(comfortLevels).nullable(),
  notes: z.string().max(3000),
  evidence: z.string().max(3000),
  repositoryUrl: z.string().trim().max(512).refine(isHttpUrl, "Enter an http or https URL."),
  taskObservations: z.record(z.string(), z.string().max(1200)).optional(),
}).superRefine((record, context) => {
  if (!belongsToCatalog(record)) {
    context.addIssue({ code: "custom", path: ["itemId"], message: "Select a learning item from this workspace." });
  }
  if (record.taskObservations === undefined) return;
  let allowedTaskIds: readonly string[];
  if (record.itemType === "activity") {
    const activity = activities.find(({ id }) => id === record.itemId);
    allowedTaskIds = activity?.id === "A01"
      ? a01TaskIds
      : activity?.investigationTasks?.map(({ id }) => id) ?? [];
  } else if (record.itemType === "project" || record.itemType === "small_project") {
    allowedTaskIds = projectMilestones
      .filter(({ projectId }) => projectId === record.itemId)
      .map(({ id }) => id);
  } else {
    context.addIssue({ code: "custom", path: ["taskObservations"], message: "Task observations are only supported for activities and project checkpoints." });
    return;
  }
  const taskIds = Object.keys(record.taskObservations);
  if (taskIds.some((taskId) => !allowedTaskIds.includes(taskId))) {
    context.addIssue({ code: "custom", path: ["taskObservations"], message: "Choose a task from this activity." });
  }
  if (taskIds.length > allowedTaskIds.length) {
    context.addIssue({ code: "custom", path: ["taskObservations"], message: "An activity record can contain only its defined task observations." });
  }
  const maxCharacters = Math.min(allowedTaskIds.length * 1200, 12000);
  if (Object.values(record.taskObservations).reduce((length, value) => length + value.length, 0) > maxCharacters) {
    context.addIssue({ code: "custom", path: ["taskObservations"], message: `Task observations must total ${maxCharacters.toLocaleString()} characters or fewer.` });
  }
}) satisfies z.ZodType<ProgressInput>;

const progressBackupSchema = z.object({
  exportedAt: z.string().datetime(),
  records: z.array(progressSchema.extend({
    updatedAt: z.number().refine(isValidProgressTimestamp, "Must be a valid date no more than 24 hours in the future."),
  })).max(maxBackupRecords),
}).superRefine((backup, context) => {
  const seen = new Set<string>();
  backup.records.forEach((record, index) => {
    const key = `${record.itemType}:${record.itemId}`;
    if (seen.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["records", index],
        message: "A backup may contain only one record per learning item.",
      });
    }
    seen.add(key);
  });
});

export const progressImportSchema = z.discriminatedUnion("version", [
  progressBackupSchema.extend({ version: z.literal(1) }),
  progressBackupSchema.extend({ version: z.literal(2) }),
  progressBackupSchema.extend({ version: z.literal(3) }),
]);

export const progressSaveRequestSchema = z.object({
  record: progressSchema,
  expectedRevision: z.number().int().positive().nullable(),
});

function isHttpUrl(value: string): boolean {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

