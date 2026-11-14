import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { activities, modules } from "@/content";
import { lessonRoute, moduleRoute } from "@/features/learning/routes";
import { ModuleLessonContent } from "@/features/roadmap/module-lesson";
import { ModuleLessonOutline } from "@/features/roadmap/module-overview-progress";
import { ProgressEditor } from "@/features/progress/progress-editor";

export const dynamicParams = false;

type LessonPageProps = { params: Promise<{ id: string; lessonId: string }> };

function findModule(routeId: string) {
  return modules.find((item) => String(item.id).padStart(2, "0") === routeId);
}

function findLesson(moduleId: string, lessonSlug: string) {
  const learningModule = findModule(moduleId);
  if (!learningModule) return undefined;
  const lesson = learningModule.lessons.find((item) => item.id.toLowerCase() === lessonSlug.toLowerCase());
  return lesson ? { learningModule, lesson } : undefined;
}

export function generateStaticParams() {
  return modules.flatMap((learningModule) => learningModule.lessons.map((lesson) => ({
    id: String(learningModule.id).padStart(2, "0"),
    lessonId: lesson.id.toLowerCase(),
  })));
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { id, lessonId } = await params;
  const matched = findLesson(id, lessonId);
  return { title: matched ? `${matched.lesson.title} · Module ${id}` : "Lesson" };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id, lessonId } = await params;
  const matched = findLesson(id, lessonId);
  if (!matched) notFound();

  const { learningModule, lesson } = matched;
  const lessonIndex = learningModule.lessons.findIndex((item) => item.id === lesson.id);
  const previousLesson = learningModule.lessons[lessonIndex - 1];
  const nextLesson = learningModule.lessons[lessonIndex + 1];
  const activity = activities.find((item) => item.id === learningModule.activityId);
  const moduleNumber = String(learningModule.id).padStart(2, "0");
  const lessonNumber = Number(lesson.id.match(/-L(\d+)$/)?.[1] ?? lessonIndex + 1);

  return (
    <div className="learning-lesson-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/roadmap">Roadmap</Link><span aria-hidden="true">/</span>
        <Link href={moduleRoute(learningModule.id)}>Module {moduleNumber}</Link><span aria-hidden="true">/</span>
        <span>Lesson {moduleNumber}.{lessonNumber}</span>
      </nav>

      <div className="learning-lesson-grid">
        <ModuleLessonOutline moduleId={learningModule.id} lessons={learningModule.lessons} currentLessonId={lesson.id} />
        <div className="learning-lesson-main">
          <ModuleLessonOutline moduleId={learningModule.id} lessons={learningModule.lessons} currentLessonId={lesson.id} compact />
          <header className="learning-lesson-header">
            <div><p className="eyebrow">MODULE {moduleNumber} / LESSON {moduleNumber}.{lessonNumber}</p><h1 id="lesson-page-title">{lesson.title}</h1></div>
            <span className="learning-lesson-position">{lessonIndex + 1} of {learningModule.lessons.length}</span>
          </header>

          <div className="card learning-lesson-reading">
            <ModuleLessonContent learningModule={learningModule} lesson={lesson} />
          </div>

          <section className="learning-lesson-progress" aria-label="Lesson completion">
            <ProgressEditor key={lesson.id} itemType="lesson" itemId={lesson.id} title="Lesson progress" variant="lesson-status" />
          </section>

          <nav className="learning-lesson-navigation" aria-label="Lesson navigation">
            {previousLesson ? <Link className="button button-outline" href={lessonRoute(learningModule.id, previousLesson.id)}><ArrowLeft size={14} /><span><small>Previous</small><strong>{previousLesson.title}</strong></span></Link> : <span />}
            <div className="learning-lesson-navigation-next">
              {nextLesson ? <Link className="button button-primary" href={lessonRoute(learningModule.id, nextLesson.id)}><span><small>Next lesson</small><strong>{nextLesson.title}</strong></span><ArrowRight size={14} /></Link>
                : <Link className="button button-primary" href={activity ? `/activities/${activity.id}` : moduleRoute(learningModule.id)}><span><small>Continue</small><strong>{activity ? `Activity ${activity.id}` : `Module ${moduleNumber} overview`}</strong></span><ArrowRight size={14} /></Link>}
            </div>
          </nav>
          <p className="learning-lesson-free-navigation"><Link href={moduleRoute(learningModule.id)}>Return to the module overview</Link> · You can move between lessons freely.</p>
        </div>
      </div>
    </div>
  );
}
