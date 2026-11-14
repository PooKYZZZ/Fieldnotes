import type { ComponentType } from "react";
import type { ModuleRecord } from "@/content";

export type MdxLessonContent = { id: string; title: string; Component: ComponentType };

export function ModuleLessons({
  lessons,
  content,
  showHeading = true,
}: {
  lessons: ModuleRecord["lessons"];
  content: MdxLessonContent[];
  showHeading?: boolean;
}) {
  return (
    <div className="module-lessons">
      {lessons.map((lesson, index) => {
        const lessonContent = content.find((item) => item.id === lesson.id);
        if (!lessonContent || lessonContent.title !== lesson.title) {
          throw new Error(`Lesson metadata does not match MDX content for ${lesson.id}.`);
        }
        const LessonContent = lessonContent.Component;
        const titleId = `module-lesson-title-${lesson.id.toLowerCase()}`;

        const lessonNumber = Number(lesson.id.match(/-L(\d+)$/)?.[1] ?? index + 1);

        return (
          <article className="module-lesson" id={`lesson-${lesson.id.toLowerCase()}`} aria-labelledby={showHeading ? titleId : undefined} aria-label={showHeading ? undefined : `Lesson ${String(lessonNumber).padStart(2, "0")} · ${lesson.title}`} key={lesson.id}>
            {showHeading && <header className="module-lesson-header">
              <p className="eyebrow">Lesson {String(lessonNumber).padStart(2, "0")} · Module {String(lesson.id.match(/^M(\d+)/)?.[1] ?? "").padStart(2, "0")}</p>
              <h3 id={titleId}>{lesson.title}</h3>
            </header>}
            <div className="module-lesson-content article-copy"><LessonContent /></div>
          </article>
        );
      })}
    </div>
  );
}
