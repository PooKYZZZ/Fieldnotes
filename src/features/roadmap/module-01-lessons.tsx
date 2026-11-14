import type { ModuleRecord } from "@/content";
import Lesson01, { lessonId as lessonId1, lessonTitle as lessonTitle1 } from "@/content/curriculum/modules/01/lessons/01-from-program-to-process.mdx";
import Lesson02, { lessonId as lessonId2, lessonTitle as lessonTitle2 } from "@/content/curriculum/modules/01/lessons/02-processes-and-threads.mdx";
import Lesson03, { lessonId as lessonId3, lessonTitle as lessonTitle3 } from "@/content/curriculum/modules/01/lessons/03-user-space-and-the-kernel.mdx";
import Lesson04, { lessonId as lessonId4, lessonTitle as lessonTitle4 } from "@/content/curriculum/modules/01/lessons/04-memory-storage-and-failures.mdx";
import Lesson05, { lessonId as lessonId5, lessonTitle as lessonTitle5 } from "@/content/curriculum/modules/01/lessons/05-boot-and-filesystems.mdx";
import Lesson06, { lessonId as lessonId6, lessonTitle as lessonTitle6 } from "@/content/curriculum/modules/01/lessons/06-virtual-machines-and-containers.mdx";
import ModuleReview from "@/content/curriculum/modules/01/lessons/07-trace-one-simple-failure.mdx";
import { ModuleLessons, type MdxLessonContent } from "@/features/roadmap/module-lessons";

const lessonContent: MdxLessonContent[] = [
  { id: lessonId1, title: lessonTitle1, Component: Lesson01 },
  { id: lessonId2, title: lessonTitle2, Component: Lesson02 },
  { id: lessonId3, title: lessonTitle3, Component: Lesson03 },
  { id: lessonId4, title: lessonTitle4, Component: Lesson04 },
  { id: lessonId5, title: lessonTitle5, Component: Lesson05 },
  { id: lessonId6, title: lessonTitle6, Component: Lesson06 },
];

export function Module01Lessons({ lessons, showHeading = true }: { lessons: ModuleRecord["lessons"]; showHeading?: boolean }) {
  return <ModuleLessons lessons={lessons} content={lessonContent} showHeading={showHeading} />;
}

export function Module01Review() {
  return <ModuleReview />;
}
