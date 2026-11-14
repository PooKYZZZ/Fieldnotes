import type { ModuleRecord } from "@/content";
import Lesson1, { lessonId as lesson1Id, lessonTitle as lesson1Title } from "@/content/curriculum/modules/21/lessons/01-build-inputs-and-dependency-review.mdx";
import Lesson2, { lessonId as lesson2Id, lessonTitle as lesson2Title } from "@/content/curriculum/modules/21/lessons/02-artifact-identity-and-provenance.mdx";
import Lesson3, { lessonId as lesson3Id, lessonTitle as lesson3Title } from "@/content/curriculum/modules/21/lessons/03-security-gates-and-limits.mdx";
import { ModuleLessons, type MdxLessonContent } from "@/features/roadmap/module-lessons";

const lessonContent: MdxLessonContent[] = [
  { id: lesson1Id, title: lesson1Title, Component: Lesson1 },
  { id: lesson2Id, title: lesson2Title, Component: Lesson2 },
  { id: lesson3Id, title: lesson3Title, Component: Lesson3 },
];

export function Module21Lessons({ lessons, showHeading = true }: { lessons: ModuleRecord["lessons"]; showHeading?: boolean }) {
  return <ModuleLessons lessons={lessons} content={lessonContent} showHeading={showHeading} />;
}
