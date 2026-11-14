import { z } from "zod";
import { curriculumPhaseNames } from "@/content/taxonomy";

const moduleLessonSchema = z.object({
  id: z.string().regex(/^M\d{2}-L\d{2}$/),
  title: z.string().trim().min(1),
}).strict();

const learningConceptSchema = z.object({
  label: z.string().trim().min(1),
  href: z.string().regex(/^#lesson-m\d{2}-l\d{2}$/).optional(),
}).strict();

export const moduleDefinitionSchema = z.object({
  id: z.number().int().min(1).max(24),
  title: z.string().trim().min(10),
  phase: z.enum(curriculumPhaseNames),
  level: z.string().trim().min(1),
  prerequisites: z.string().trim().min(1),
  intro: z.string().trim().min(20),
  overview: z.string().trim().default(""),
  learningQuestion: z.string().trim().min(20),
  concepts: z.array(learningConceptSchema).min(1),
  lessons: z.array(moduleLessonSchema).min(1).max(12),
  moduleReview: z.object({
    id: z.string().regex(/^M\d{2}-R\d{2}$/),
    title: z.string().trim().min(1),
  }).strict().optional(),
  practice: z.string().trim().min(20),
  typicalMistakes: z.string().trim().min(20),
  miniLab: z.string().trim().min(20),
  readiness: z.string().trim().min(20),
  recallQuestion: z.string().trim().min(20),
  recallAnswer: z.string().trim().min(20),
  references: z.string().trim().min(20),
  related: z.string().trim().min(5),
  sourcePdf: z.string().regex(/^[A-Za-z0-9_-]+\.pdf$/),
  activityId: z.string().regex(/^A\d{2}$/),
}).strict().superRefine((definition, context) => {
  const modulePrefix = `M${String(definition.id).padStart(2, "0")}-L`;
  const lessonIds = new Set(definition.lessons.map((lesson) => lesson.id));
  if (lessonIds.size !== definition.lessons.length) {
    context.addIssue({ code: "custom", path: ["lessons"], message: "Lesson IDs must be unique within a module." });
  }
  for (const [index, lesson] of definition.lessons.entries()) {
    if (!lesson.id.startsWith(modulePrefix)) {
      context.addIssue({ code: "custom", path: ["lessons", index, "id"], message: "Lesson ID must belong to its module." });
    }
  }
  if (definition.moduleReview && !definition.moduleReview.id.startsWith(`M${String(definition.id).padStart(2, "0")}-R`)) {
    context.addIssue({ code: "custom", path: ["moduleReview", "id"], message: "Module review ID must belong to its module." });
  }
  for (const [index, concept] of definition.concepts.entries()) {
    if (concept.href && !lessonIds.has(concept.href.slice("#lesson-".length).toUpperCase().replace("#", ""))) {
      context.addIssue({ code: "custom", path: ["concepts", index, "href"], message: "Concept links must target a lesson in this module." });
    }
  }
});

export const moduleDefinitionsSchema = z.array(moduleDefinitionSchema)
  .length(24)
  .superRefine((definitions, context) => {
    const ids = definitions.map((definition) => definition.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "Module IDs must be unique." });
    }
    for (const definition of definitions) {
      if (definition.id !== Number(definition.activityId.slice(1))) {
        context.addIssue({ code: "custom", message: `Module ${definition.id} must reference its matching activity.` });
      }
    }
  });

export type ModuleDefinition = z.infer<typeof moduleDefinitionSchema>;
