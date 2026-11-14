import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { milestonesForProjects } from "@/content/project-milestones";
import { curriculumPhaseNames } from "@/content/taxonomy";

export { milestonesForProjects, type ProjectMilestone } from "@/content/project-milestones";

const curriculumDirectory = path.join(process.cwd(), "src", "content", "curriculum");
const moduleMetadataSchema = z.object({
  id: z.number().int().positive(),
  phase: z.enum(curriculumPhaseNames),
  level: z.string().min(1),
  sourcePdf: z.string().regex(/^[A-Za-z0-9_-]+\.pdf$/),
  activityId: z.string().regex(/^A\d{2}$/),
});

const activityMetadataSchema = z.object({
  id: z.string().regex(/^A\d{2}$/),
  moduleId: z.number().int().positive(),
});

const identifiedMetadataSchema = z.object({ id: z.string().min(2).max(8) });

const smallProjectMetadataSchema = identifiedMetadataSchema.extend({
  relevantModules: z.string().min(1),
});

export type ActivityTaskKind = "challenge" | "lab" | "evidence" | "reflection";
export type ActivityTask = { kind: ActivityTaskKind; title: string; content: string };
export type LearningConcept = { label: string; href?: string };

export type ModuleRecord = {
  id: number;
  title: string;
  phase: (typeof curriculumPhaseNames)[number];
  level: string;
  prerequisites: string;
  intro: string;
  learningQuestion: string;
  concepts: LearningConcept[];
  explanation: string;
  lessons: { id: string; title: string; content: string }[];
  practice: string;
  typicalMistakes: string;
  miniLab: string;
  readiness: string;
  recallQuestion: string;
  recallAnswer: string;
  references: string;
  related: string;
  sourcePdf: string;
  activityId: string;
};

export type ModuleSummary = Pick<ModuleRecord, "id" | "title" | "phase" | "level" | "intro"> & {
  lessons: Pick<ModuleRecord["lessons"][number], "id" | "title">[];
};

export type ActivityRecord = {
  id: string;
  moduleId: number;
  title: string;
  prerequisite: string;
  environment?: string;
  steps?: string;
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

export const modules: ModuleRecord[] = readMarkdownDirectory("modules", (filename, document) => {
  const metadata = moduleMetadataSchema.parse(document.metadata);
  const id = `M${String(metadata.id).padStart(2, "0")}`;
  const explanation = requiredSection(document, filename, "Lesson");
  const title = document.title.replace(/^Module\s+\d{2}:\s*/, "");
  return {
    ...metadata,
    title,
    intro: requiredSection(document, filename, "Introduction"),
    prerequisites: requiredSection(document, filename, "Prerequisites"),
    learningQuestion: requiredSection(document, filename, "Learning question"),
    concepts: requiredSection(document, filename, "Learning objectives")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*-\s+/, "").trim())
      .filter(Boolean)
      .map((objective) => {
        const linkedObjective = objective.match(/^\[([^\]]+)\]\((#[a-z0-9-]+)\)$/i);
        return linkedObjective
          ? { label: linkedObjective[1].trim(), href: linkedObjective[2] }
          : { label: objective };
      }),
    explanation,
    lessons: [{ id: `${id}-L01`, title, content: explanation }],
    practice: requiredSection(document, filename, "Guided practice"),
    typicalMistakes: requiredSection(document, filename, "Common mistakes"),
    miniLab: requiredSection(document, filename, "Mini-lab"),
    readiness: requiredSection(document, filename, "Readiness check"),
    recallQuestion: requiredSection(document, filename, "Recall question"),
    recallAnswer: requiredSection(document, filename, "Recall explanation"),
    references: requiredSection(document, filename, "References"),
    related: requiredSection(document, filename, "Related content"),
  };
});

export const activities: ActivityRecord[] = readMarkdownDirectory("activities", (filename, document) => {
  const metadata = activityMetadataSchema.parse(document.metadata);
  const challenge = requiredSection(document, filename, "Challenge");
  const build = requiredSection(document, filename, "Build outcome");
  const submit = requiredSection(document, filename, "Evidence to record");
  const selfCheck = requiredSection(document, filename, "Self-check");
  return {
    ...metadata,
    title: document.title,
    prerequisite: requiredSection(document, filename, "Prerequisites"),
    environment: optionalSection(document, "Environment"),
    steps: optionalSection(document, "Lab steps"),
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
