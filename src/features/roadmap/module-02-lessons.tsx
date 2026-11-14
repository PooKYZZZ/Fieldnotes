import type { ModuleRecord } from "@/content";
import Lesson01, { lessonId as lessonId1, lessonTitle as lessonTitle1 } from "@/content/curriculum/modules/02/lessons/01-paths-filesystems-and-mounts.mdx";
import Lesson02, { lessonId as lessonId2, lessonTitle as lessonTitle2 } from "@/content/curriculum/modules/02/lessons/02-streams-pipes-and-redirection.mdx";
import Lesson03, { lessonId as lessonId3, lessonTitle as lessonTitle3 } from "@/content/curriculum/modules/02/lessons/03-shell-expansion-and-safe-inspection.mdx";
import Lesson04, { lessonId as lessonId4, lessonTitle as lessonTitle4 } from "@/content/curriculum/modules/02/lessons/04-exit-status-and-package-managers.mdx";
import { ModuleLessons, type MdxLessonContent } from "@/features/roadmap/module-lessons";

const lessonContent: MdxLessonContent[] = [
  { id: lessonId1, title: lessonTitle1, Component: Lesson01 },
  { id: lessonId2, title: lessonTitle2, Component: Lesson02 },
  { id: lessonId3, title: lessonTitle3, Component: Lesson03 },
  { id: lessonId4, title: lessonTitle4, Component: Lesson04 },
];

export function Module02Lessons({ lessons, showHeading = true }: { lessons: ModuleRecord["lessons"]; showHeading?: boolean }) {
  return <ModuleLessons lessons={lessons} content={lessonContent} showHeading={showHeading} />;
}
