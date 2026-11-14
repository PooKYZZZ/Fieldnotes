import { z } from "zod";
import { activities, majorProjects, modules, projectMilestones, smallProjects, troubleshooting } from "@/content";
import { comfortLevels, progressItemTypes, progressStatuses, type ProgressInput, type ProgressItemType } from "@/features/progress/model";

const itemIdSchema = z.string().trim().min(2).max(16).regex(/^[A-Za-z0-9.-]+$/);

const knownItemIds: Record<ProgressItemType, ReadonlySet<string>> = {
  module: new Set(modules.map((item) => `M${String(item.id).padStart(2, "0")}`)),
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
}).refine(belongsToCatalog, { path: ["itemId"], message: "Select a learning item from this workspace." }) satisfies z.ZodType<ProgressInput>;

export const progressImportSchema = z.object({
  version: z.literal(1),
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

function isHttpUrl(value: string): boolean {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

