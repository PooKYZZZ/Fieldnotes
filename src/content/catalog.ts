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
const activityMetadataSchema = z.object({
  id: z.string().regex(/^A\d{2}$/),
  moduleId: z.number().int().positive(),
  taskHints: z.record(z.string(), z.string().max(1200)).optional(),
}).superRefine((metadata, context) => {
  if (metadata.taskHints && metadata.id !== "A01") {
    context.addIssue({ code: "custom", path: ["taskHints"], message: "Task-specific hints are only supported for Activity A01." });
  }
  for (const taskId of Object.keys(metadata.taskHints ?? {})) {
    if (!(a01TaskIds as readonly string[]).includes(taskId)) {
      context.addIssue({ code: "custom", path: ["taskHints", taskId], message: "Choose a stable Activity A01 task ID." });
    }
  }
});

const identifiedMetadataSchema = z.object({ id: z.string().min(2).max(8) });

const smallProjectMetadataSchema = identifiedMetadataSchema.extend({
  relevantModules: z.string().min(1),
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
  taskHints?: Partial<Record<A01TaskId, string>>;
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

export type SmallProjectRecord = {
  id: string;
  title: string;
  relevantModules: string;
  problem: string;
  requirements: string;
  deliverables: string;
  acceptance: string;
  likelyChallenge: string;
  optionalExtension: string;
  technicalReference: string;
};

export type MajorProjectRecord = { id: string; title: string; details: Record<string, string> };

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
  return {
    ...metadata,
    title: document.title,
    scenario: requiredSection(document, filename, "Scenario"),
    objectives: requiredSection(document, filename, "Learning objectives"),
    prerequisite: requiredSection(document, filename, "Prerequisites"),
    environment: optionalSection(document, "Environment"),
    steps: optionalSection(document, "Lab steps"),
    taskHints: metadata.taskHints as Partial<Record<A01TaskId, string>> | undefined,
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
  const metadata = smallProjectMetadataSchema.parse(document.metadata);
  return {
    ...metadata,
    title: document.title,
    problem: requiredSection(document, filename, "Problem"),
    requirements: requiredSection(document, filename, "Requirements"),
    deliverables: requiredSection(document, filename, "Deliverables"),
    acceptance: requiredSection(document, filename, "Acceptance criteria"),
    likelyChallenge: requiredSection(document, filename, "Likely challenge"),
    optionalExtension: requiredSection(document, filename, "Optional extension"),
    technicalReference: requiredSection(document, filename, "Technical reference"),
  };
});

export const majorProjects: MajorProjectRecord[] = readMarkdownDirectory("projects/major", (filename, document) => {
  const metadata = identifiedMetadataSchema.parse(document.metadata);
  return {
    id: metadata.id,
    title: document.title,
    details: Object.fromEntries(document.sections),
  };
});

export const projectMilestones = milestonesForProjects(majorProjects);
