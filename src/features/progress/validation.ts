import { z } from "zod";
import { activities, majorProjects, modules, projectMilestones, smallProjects, troubleshooting } from "@/content";
import { a01TaskIds } from "@/content/a01-task-ids";
import { comfortLevels, progressItemTypes, progressStatuses, type ProgressInput, type ProgressItemType } from "@/features/progress/model";

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
  if (record.itemType !== "activity" || record.itemId !== "A01") {
    context.addIssue({ code: "custom", path: ["taskObservations"], message: "Task observations are only supported for Activity A01." });
    return;
  }
  const taskIds = Object.keys(record.taskObservations);
  if (taskIds.some((taskId) => !(a01TaskIds as readonly string[]).includes(taskId))) {
    context.addIssue({ code: "custom", path: ["taskObservations"], message: "Choose a task from Activity A01." });
  }
  if (taskIds.length > a01TaskIds.length) {
    context.addIssue({ code: "custom", path: ["taskObservations"], message: "An A01 record can contain at most five task observations." });
  }
  if (Object.values(record.taskObservations).reduce((length, value) => length + value.length, 0) > 6000) {
    context.addIssue({ code: "custom", path: ["taskObservations"], message: "A01 task observations must total 6,000 characters or fewer." });
  }
}) satisfies z.ZodType<ProgressInput>;

const progressBackupSchema = z.object({
  exportedAt: z.string().datetime(),
  records: z.array(progressSchema.extend({ updatedAt: z.number().int().nonnegative() })).max(250),
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

function isHttpUrl(value: string): boolean {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

