import type { ModuleRecord } from "@/content";
import Lesson1, { lessonId as lesson1Id, lessonTitle as lesson1Title } from "@/content/curriculum/modules/19/lessons/01-assets-trust-boundaries-and-threats.mdx";
import Lesson2, { lessonId as lesson2Id, lessonTitle as lesson2Title } from "@/content/curriculum/modules/19/lessons/02-reduce-exposure-and-privilege.mdx";
import Lesson3, { lessonId as lesson3Id, lessonTitle as lesson3Title } from "@/content/curriculum/modules/19/lessons/03-verify-a-control.mdx";
import { ModuleLessons, type MdxLessonContent } from "@/features/roadmap/module-lessons";

const lessonContent: MdxLessonContent[] = [
  { id: lesson1Id, title: lesson1Title, Component: Lesson1 },
  { id: lesson2Id, title: lesson2Title, Component: Lesson2 },
  { id: lesson3Id, title: lesson3Title, Component: Lesson3 },
];

export function Module19Lessons({ lessons, showHeading = true }: { lessons: ModuleRecord["lessons"]; showHeading?: boolean }) {
  return <ModuleLessons lessons={lessons} content={lessonContent} showHeading={showHeading} />;
}
