import type { ModuleRecord } from "@/content";
import Lesson01, { lessonId as lessonId1, lessonTitle as lessonTitle1 } from "@/content/curriculum/modules/04/lessons/01-addresses-subnets-and-routes.mdx";
import Lesson02, { lessonId as lessonId2, lessonTitle as lessonTitle2 } from "@/content/curriculum/modules/04/lessons/02-dns-and-transport-protocols.mdx";
import Lesson03, { lessonId as lessonId3, lessonTitle as lessonTitle3 } from "@/content/curriculum/modules/04/lessons/03-ports-filtering-and-application-checks.mdx";
import { ModuleLessons, type MdxLessonContent } from "@/features/roadmap/module-lessons";

const lessonContent: MdxLessonContent[] = [
  { id: lessonId1, title: lessonTitle1, Component: Lesson01 },
  { id: lessonId2, title: lessonTitle2, Component: Lesson02 },
  { id: lessonId3, title: lessonTitle3, Component: Lesson03 },
];

export function Module04Lessons({ lessons, showHeading = true }: { lessons: ModuleRecord["lessons"]; showHeading?: boolean }) {
  return <ModuleLessons lessons={lessons} content={lessonContent} showHeading={showHeading} />;
}
