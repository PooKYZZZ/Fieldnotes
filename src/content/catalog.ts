import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { milestonesForProjects } from "@/content/project-milestones";
import { a01TaskIds, type A01TaskId } from "@/content/a01-task-ids";
import { moduleDefinitions } from "@/content/curriculum/modules/definitions";
import type { ModuleDefinition } from "@/content/module-definitions";

export { milestonesForProjects, type ProjectMilestone } from "@/content/project-milestones";

const curriculumDirectory = path.join(process.cwd(), "src", "content", "curriculum");
const investigationTaskSchema = z.object({
  id: z.string().regex(/^a\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(3).max(120),
});
const activityMetadataSchema = z.object({
  id: z.string().regex(/^A\d{2}$/),
  moduleId: z.number().int().positive(),
  investigationTasks: z.array(investigationTaskSchema).min(1).max(12).optional(),
  taskHints: z.record(z.string(), z.string().max(1200)).optional(),
  taskDetails: z.record(z.string(), z.string().max(2400)).optional(),
}).superRefine((metadata, context) => {
  if (metadata.id === "A01" && metadata.investigationTasks) {
    context.addIssue({ code: "custom", path: ["investigationTasks"], message: "Activity A01 keeps its established stable task IDs." });
  }
  if (metadata.id !== "A01" && !metadata.investigationTasks) {
    context.addIssue({ code: "custom", path: ["investigationTasks"], message: "Each activity needs stable task-linked notebook entries." });
  }
  const taskIds = (metadata.investigationTasks ?? []).map(({ id }) => id);
  if (new Set(taskIds).size !== taskIds.length) {
    context.addIssue({ code: "custom", path: ["investigationTasks"], message: "Investigation task IDs must be unique within an activity." });
  }
  if (taskIds.some((taskId) => !taskId.startsWith(`${metadata.id.toLowerCase()}-`))) {
    context.addIssue({ code: "custom", path: ["investigationTasks"], message: "Investigation task IDs must include their activity ID." });
  }
  for (const field of ["taskHints", "taskDetails"] as const) {
    const entries = metadata[field];
    if (entries && metadata.id !== "A01") {
      context.addIssue({ code: "custom", path: [field], message: "Task-specific guidance is only supported for Activity A01." });
    }
    for (const taskId of Object.keys(entries ?? {})) {
      if (!(a01TaskIds as readonly string[]).includes(taskId)) {
        context.addIssue({ code: "custom", path: [field, taskId], message: "Choose a stable Activity A01 task ID." });
      }
    }
  }
});

const identifiedMetadataSchema = z.object({ id: z.string().min(2).max(8) });

const projectMetadataSchema = identifiedMetadataSchema.extend({
  track: z.enum(["Focused build", "Integrated build", "Capstone"]),
  estimatedTime: z.string().trim().min(3).max(40),
  relevantModules: z.string().trim().min(1).max(100),
  tools: z.array(z.string().trim().min(2).max(80)).min(2).max(8),
});

export type ActivityTaskKind = "challenge" | "lab" | "evidence" | "reflection";
export type ActivityTask = { kind: ActivityTaskKind; title: string; content: string };
export type ModuleRecord = ModuleDefinition;

export type ModuleSummary = Pick<ModuleRecord, "id" | "title" | "phase" | "level" | "intro"> & {
  lessons: Pick<ModuleRecord["lessons"][number], "id" | "title">[];
};

export type ActivityRecord = {
  id: string;
  moduleId: number;
  title: string;
  scenario: string;
  objectives: string;
  prerequisite: string;
  environment?: string;
  steps?: string;
  investigationTasks?: { id: string; title: string }[];
  taskHints?: Partial<Record<A01TaskId, string>>;
  taskDetails?: Partial<Record<A01TaskId, string>>;
  expectedObservations: string;
  challenge: string;
  build: string;
  submit: string;
  hints?: string;
  verification?: string;
  troubleshooting?: string;
  selfCheck: string;
  independencePrompt: string;
  cleanup?: string;
  tasks: ActivityTask[];
};

export type TroubleshootingRecord = {
  id: string;
  title: string;
  observation: string;
  investigation: string;
  constraint: string;
  hint: string;
  completion: string;
};

export type ProjectRecordBase = {
  id: string;
  title: string;
  track: "Focused build" | "Integrated build" | "Capstone";
  estimatedTime: string;
  relevantModules: string;
  tools: string[];
  details: Record<string, string>;
};

export type SmallProjectRecord = ProjectRecordBase & {
  kind: "small";
  problem: string;
  requirements: string;
  deliverables: string;
  acceptance: string;
  likelyChallenge: string;
  optionalExtension: string;
  technicalReference: string;
};

export type MajorProjectRecord = ProjectRecordBase & { kind: "major" };

type MarkdownDocument = {
  metadata: Record<string, unknown>;
  title: string;
  sections: Map<string, string>;
};

function readDocument(directory: string, filename: string): MarkdownDocument {
  const source = readFileSync(path.join(curriculumDirectory, directory, filename), "utf8");
  const parsed = matter(source);
  const titleMatch = parsed.content.match(/^#\s+(.+?)\s*$/m);
  if (!titleMatch) throw new Error(`${directory}/${filename} must start with a Markdown title.`);

  const content = parsed.content.replace(/^#\s+.+?\s*$(?:\r?\n)?/m, "").trim();
  const parts = content.split(/^##\s+(.+?)\s*$/m);
  const sections = new Map<string, string>();
  for (let index = 1; index < parts.length; index += 2) {
    const heading = parts[index].trim();
    if (sections.has(heading)) throw new Error(`${directory}/${filename} repeats the "${heading}" section.`);
    sections.set(heading, parts[index + 1]?.trim() ?? "");
  }

  return {
    metadata: parsed.data as Record<string, unknown>,
    title: titleMatch[1].trim(),
    sections,
  };
}

function requiredSection(document: MarkdownDocument, filename: string, name: string): string {
  const value = document.sections.get(name)?.trim();
  if (!value) throw new Error(`${filename} is missing the "${name}" section.`);
  return value;
}

function optionalSection(document: MarkdownDocument, name: string): string | undefined {
  return document.sections.get(name)?.trim() || undefined;
}

const requiredProjectSections = [
  "Scenario",
  "Why this matters",
  "Learning objectives",
  "Prerequisites and setup",
  "Requirements and boundaries",
  "Architecture and decisions",
  "Build milestones",
  "Verification plan",
  "Acceptance criteria",
  "Troubleshooting",
  "Portfolio deliverables",
  "Stretch goals",
  "Technical references",
] as const;

function validateProjectSections(document: MarkdownDocument, filename: string): Record<string, string> {
  for (const section of requiredProjectSections) requiredSection(document, filename, section);
  return Object.fromEntries(document.sections);
}

function countTopLevelSteps(markdown: string): number {
  let inFence = false;
  let count = 0;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^\d+\.\s+/.test(line)) count += 1;
  }
  return count;
}

function readMarkdownDirectory<T>(directory: string, parse: (filename: string, document: MarkdownDocument) => T): T[] {
  return readdirSync(path.join(curriculumDirectory, directory))
    .filter((filename) => filename.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
    .map((filename) => parse(filename, readDocument(directory, filename)));
}

export const modules: ModuleRecord[] = moduleDefinitions;

export const activities: ActivityRecord[] = readMarkdownDirectory("activities", (filename, document) => {
  const metadata = activityMetadataSchema.parse(document.metadata);
  const challenge = requiredSection(document, filename, "Challenge");
  const build = requiredSection(document, filename, "Build outcome");
  const submit = requiredSection(document, filename, "Evidence to record");
  const selfCheck = requiredSection(document, filename, "Self-check");
  const steps = optionalSection(document, "Lab steps");
  if (metadata.id !== "A01" && metadata.investigationTasks?.length !== countTopLevelSteps(steps ?? "")) {
    throw new Error(`${filename} must define one stable investigation task for every numbered lab step.`);
  }
  return {
    ...metadata,
    title: document.title,
    scenario: requiredSection(document, filename, "Scenario"),
    objectives: requiredSection(document, filename, "Learning objectives"),
    prerequisite: requiredSection(document, filename, "Prerequisites"),
    environment: optionalSection(document, "Environment"),
    steps,
    investigationTasks: metadata.investigationTasks,
    taskHints: metadata.taskHints as Partial<Record<A01TaskId, string>> | undefined,
    taskDetails: metadata.taskDetails as Partial<Record<A01TaskId, string>> | undefined,
    expectedObservations: requiredSection(document, filename, "Expected observations"),
    challenge,
    build,
    submit,
    hints: optionalSection(document, "Hints"),
    verification: optionalSection(document, "Verification"),
    troubleshooting: optionalSection(document, "Troubleshooting"),
    selfCheck,
    independencePrompt: requiredSection(document, filename, "Independent reflection"),
    cleanup: optionalSection(document, "Cleanup"),
    tasks: [
      { kind: "challenge", title: "Challenge", content: challenge },
      { kind: "lab", title: "Build outcome", content: build },
      { kind: "evidence", title: "Evidence", content: submit },
      { kind: "reflection", title: "Self-check", content: selfCheck },
    ],
  };
});

export const troubleshooting: TroubleshootingRecord[] = readMarkdownDirectory("troubleshooting", (filename, document) => {
  identifiedMetadataSchema.parse(document.metadata);
  return {
    id: String(document.metadata.id),
    title: document.title,
    observation: requiredSection(document, filename, "Observation"),
    investigation: requiredSection(document, filename, "Investigation"),
    constraint: requiredSection(document, filename, "Safety constraint"),
    hint: requiredSection(document, filename, "Hint"),
    completion: requiredSection(document, filename, "Completion evidence"),
  };
});

export const smallProjects: SmallProjectRecord[] = readMarkdownDirectory("projects/small", (filename, document) => {
  const metadata = projectMetadataSchema.parse(document.metadata);
  const details = validateProjectSections(document, filename);
  return {
    ...metadata,
    kind: "small",
    title: document.title,
    details,
    problem: requiredSection(document, filename, "Scenario"),
    requirements: requiredSection(document, filename, "Requirements and boundaries"),
    deliverables: requiredSection(document, filename, "Portfolio deliverables"),
    acceptance: requiredSection(document, filename, "Acceptance criteria"),
    likelyChallenge: requiredSection(document, filename, "Troubleshooting"),
    optionalExtension: requiredSection(document, filename, "Stretch goals"),
    technicalReference: requiredSection(document, filename, "Technical references"),
  };
});

export const majorProjects: MajorProjectRecord[] = readMarkdownDirectory("projects/major", (filename, document) => {
  const metadata = projectMetadataSchema.parse(document.metadata);
  const details = validateProjectSections(document, filename);
  return {
    ...metadata,
    kind: "major",
    title: document.title,
    details,
  };
});

export const projectMilestones = milestonesForProjects([...smallProjects, ...majorProjects]);
