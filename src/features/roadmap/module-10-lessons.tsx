import type { ModuleRecord } from "@/content";
import L01Lesson, { lessonId as l01Id, lessonTitle as l01Title } from "@/content/curriculum/modules/10/lessons/01-workflow-events-and-jobs.mdx";
import L02Lesson, { lessonId as l02Id, lessonTitle as l02Title } from "@/content/curriculum/modules/10/lessons/02-checks-and-artifacts.mdx";
import L03Lesson, { lessonId as l03Id, lessonTitle as l03Title } from "@/content/curriculum/modules/10/lessons/03-permissions-and-trust-boundaries.mdx";
import { ModuleLessons, type MdxLessonContent } from "@/features/roadmap/module-lessons";

const lessonContent: MdxLessonContent[] = [
  { id: l01Id, title: l01Title, Component: L01Lesson },
  { id: l02Id, title: l02Title, Component: L02Lesson },
  { id: l03Id, title: l03Title, Component: L03Lesson },
];

export function Module10Lessons({ lessons, showHeading = true }: { lessons: ModuleRecord["lessons"]; showHeading?: boolean }) {
  return <ModuleLessons lessons={lessons} content={lessonContent} showHeading={showHeading} />;
}
