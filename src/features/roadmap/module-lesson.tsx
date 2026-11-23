import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Brain, CircleHelp, FlaskConical, Lightbulb, TriangleAlert } from "lucide-react";
import type { ActivityRecord, ModuleRecord } from "@/content";
import { modules } from "@/content";
import { lessonRoute, moduleRoute } from "@/features/learning/routes";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ModuleOverviewProgress } from "@/features/roadmap/module-overview-progress";
import { Module01Lessons, Module01Review } from "@/features/roadmap/module-01-lessons";
import { Module02Lessons } from "@/features/roadmap/module-02-lessons";
import { Module03Lessons } from "@/features/roadmap/module-03-lessons";
import { Module04Lessons } from "@/features/roadmap/module-04-lessons";
import { Module05Lessons } from "@/features/roadmap/module-05-lessons";
import { Module06Lessons } from "@/features/roadmap/module-06-lessons";
import { Module07Lessons } from "@/features/roadmap/module-07-lessons";
import { Module08Lessons } from "@/features/roadmap/module-08-lessons";
import { Module09Lessons } from "@/features/roadmap/module-09-lessons";
import { Module10Lessons } from "@/features/roadmap/module-10-lessons";
import { Module11Lessons } from "@/features/roadmap/module-11-lessons";
import { Module12Lessons } from "@/features/roadmap/module-12-lessons";
import { Module13Lessons } from "@/features/roadmap/module-13-lessons";
import { Module14Lessons } from "@/features/roadmap/module-14-lessons";
import { Module15Lessons } from "@/features/roadmap/module-15-lessons";
import { Module16Lessons } from "@/features/roadmap/module-16-lessons";
import { Module17Lessons } from "@/features/roadmap/module-17-lessons";
import { Module18Lessons } from "@/features/roadmap/module-18-lessons";
import { Module19Lessons } from "@/features/roadmap/module-19-lessons";
import { Module20Lessons } from "@/features/roadmap/module-20-lessons";
import { Module21Lessons } from "@/features/roadmap/module-21-lessons";
import { Module22Lessons } from "@/features/roadmap/module-22-lessons";
import { Module23Lessons } from "@/features/roadmap/module-23-lessons";
import { Module24Lessons } from "@/features/roadmap/module-24-lessons";

const moduleLessonRenderers: Record<number, ComponentType<{ lessons: ModuleRecord["lessons"]; showHeading?: boolean }>> = {
  1: Module01Lessons,
  2: Module02Lessons,
  3: Module03Lessons,
  4: Module04Lessons,
  5: Module05Lessons,
  6: Module06Lessons,
  7: Module07Lessons,
  8: Module08Lessons,
  9: Module09Lessons,
  10: Module10Lessons,
  11: Module11Lessons,
  12: Module12Lessons,
  13: Module13Lessons,
  14: Module14Lessons,
  15: Module15Lessons,
  16: Module16Lessons,
  17: Module17Lessons,
  18: Module18Lessons,
  19: Module19Lessons,
  20: Module20Lessons,
  21: Module21Lessons,
  22: Module22Lessons,
  23: Module23Lessons,
  24: Module24Lessons,
};

const moduleReviewRenderers: Record<number, ComponentType> = { 1: Module01Review };

function moduleNumber(id: number): string {
  return String(id).padStart(2, "0");
}

export function ModuleLessonContent({ learningModule, lesson }: { learningModule: ModuleRecord; lesson: ModuleRecord["lessons"][number] }) {
  const Renderer = moduleLessonRenderers[learningModule.id];
  if (!Renderer) throw new Error(`No MDX lesson renderer is registered for module ${learningModule.id}.`);
  return <Renderer lessons={[lesson]} showHeading={false} />;
}

export function ModuleLesson({ learningModule, activity }: { learningModule: ModuleRecord; activity?: ActivityRecord }) {
  const nextModule = modules.find((item) => item.id === learningModule.id + 1);
  const previousModule = modules.find((item) => item.id === learningModule.id - 1);
  const moduleId = moduleNumber(learningModule.id);
  const firstLesson = learningModule.lessons[0];
  const Review = moduleReviewRenderers[learningModule.id];

  return (
    <div className="module-page module-overview-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/roadmap">Roadmap</Link><span aria-hidden="true">/</span><span>{learningModule.phase}</span>
        <span aria-hidden="true">/</span><span>Module {moduleId}</span>
      </nav>

      <header className="page-header module-page-header">
        <div>
          <p className="eyebrow">Module {moduleId} · {learningModule.phase} · {learningModule.level}</p>
          <h1><span className="sr-only">Module {moduleId} — </span>{learningModule.title}</h1>
          <p className="page-description">{learningModule.intro}</p>
        </div>
        <div className="module-header-actions" aria-label="Module actions">
          {firstLesson && <Link className="button button-primary" href={lessonRoute(learningModule.id, firstLesson.id)}>Start with Lesson {moduleId}.1 <ArrowRight size={14} /></Link>}
          <a className="module-source-link" href={`/library/${learningModule.sourcePdf}`} target="_blank" rel="noreferrer">Open source PDF</a>
        </div>
      </header>

      <section className="module-question study-module-question" aria-labelledby="module-question-title">
        <p className="eyebrow">Learning question</p>
        <h2 id="module-question-title">{learningModule.learningQuestion}</h2>
        <p className="course-detail module-prerequisite">
          {learningModule.prerequisites === "None; curiosity and a PC are enough."
            ? "Start here; no prior module is required."
            : `Suggested background: ${learningModule.prerequisites} You can still open any lesson directly.`}
        </p>
      </section>
      <div className="study-module-path">
        <section className="module-outline-card" aria-labelledby="module-contents-title">
          <div className="module-section-heading">
            <div><p className="eyebrow">01 · Study</p><h2 id="module-contents-title">Module contents</h2></div>
            <span className="module-outline-count">{learningModule.lessons.length} {learningModule.lessons.length === 1 ? "lesson" : "lessons"}</span>
          </div>
          <ol className="module-outline-list">
            {learningModule.lessons.map((lesson, index) => {
              const ordinal = Number(lesson.id.match(/-L(\d+)$/)?.[1] ?? index + 1);
              return <li id={`lesson-${lesson.id.toLowerCase()}`} key={lesson.id}>
                <Link href={lessonRoute(learningModule.id, lesson.id)}>
                  <span className="module-outline-number">{moduleId}.{ordinal}</span>
                  <span className="module-outline-title">{lesson.title}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>;
            })}
          </ol>
        </section>
        <section className="module-orientation" aria-labelledby="module-ideas-title">
          <div className="module-objectives">
            <h3 id="module-ideas-title"><BookOpen size={16} aria-hidden="true" /> Key ideas</h3>
            <ul className="concept-list">{learningModule.concepts.map((concept) => <li key={concept.label}>{concept.label}</li>)}</ul>
          </div>
        </section>
      </div>

      <section className="module-activity-overview" aria-labelledby="module-activity-title">
        <div className="module-extra-icon"><FlaskConical size={18} aria-hidden="true" /></div>
        <div className="module-activity-overview-copy">
          <p className="eyebrow">02 · Apply</p>
          <h2 id="module-activity-title">Activity {learningModule.activityId} — {activity?.title ?? "Guided activity"}</h2>
          <p>{learningModule.practice}</p>
          <p className="module-lab-outcome"><strong>In this activity:</strong> {learningModule.miniLab}</p>
          <details className="module-common-mistakes">
            <summary><Lightbulb size={15} aria-hidden="true" /> Common mistakes and safety</summary>
            <p>{learningModule.typicalMistakes}</p>
            <div className="notice practice-safety-note" role="note">
              <TriangleAlert size={15} />
              <p>Use a disposable lab or a system you own. Keep passwords, tokens, personal data, and private network details out of saved evidence.</p>
            </div>
          </details>
          {activity && <Link className="button button-outline" href={`/activities/${activity.id}`}>Prepare and open Activity {activity.id} <ArrowRight size={14} /></Link>}
        </div>
      </section>

      {learningModule.overview && <section className="module-overview-summary" aria-label="Module overview">
        <div className="article-copy"><MarkdownContent>{learningModule.overview}</MarkdownContent></div>
      </section>}

      {learningModule.moduleReview && Review && <section className="module-knowledge-check" aria-labelledby="module-review-title">
        <div className="module-extra-icon"><Brain size={18} aria-hidden="true" /></div>
        <div className="module-knowledge-check-copy">
          <p className="eyebrow">Optional review</p>
          <h2 id="module-review-title">Module knowledge check</h2>
          <p>A short check of the main concepts. Try it when useful, or return to any lesson.</p>
          <details className="module-review-disclosure">
            <summary>Open review · {learningModule.moduleReview.title}</summary>
            <div className="module-review-content article-copy"><Review /></div>
          </details>
        </div>
      </section>}

      <section className="module-review-prompt" aria-labelledby="module-reflection-title">
        <div className="module-extra-icon"><CircleHelp size={18} aria-hidden="true" /></div>
        <div>
          <p className="eyebrow">03 · Review</p>
          <h2 id="module-reflection-title">Check your understanding</h2>
          <details className="recall-prompt">
            <summary>Recall from memory <span>Try before opening the explanation.</span></summary>
            <div className="recall-prompt-content">
              <h3>{learningModule.recallQuestion}</h3>
              <details className="recall-answer">
                <summary>Reveal a model explanation</summary>
                <MarkdownContent>{learningModule.recallAnswer}</MarkdownContent>
              </details>
              <h3 className="module-readiness-heading">Ready to move on?</h3>
              <p>{learningModule.readiness}</p>
            </div>
          </details>
        </div>
      </section>

      <details className="module-references">
        <summary>Technical references</summary>
        <div className="module-reference-content">
          <MarkdownContent>{learningModule.references}</MarkdownContent>
          <Link href="/resources#official-references">Browse the resource library <ArrowRight size={14} /></Link>
        </div>
      </details>

      <ModuleOverviewProgress learningModule={learningModule} activity={activity} />

      <nav className="module-pagination" aria-label="Module navigation">
        {previousModule ? <Link className="button button-outline" href={moduleRoute(previousModule.id)}><ArrowLeft size={14} /> Previous module</Link> : <span />}
        <div className="module-continuation-actions">
          {firstLesson && <Link className="button button-outline" href={lessonRoute(learningModule.id, firstLesson.id)}>Return to Lesson {moduleId}.1 <ArrowRight size={14} /></Link>}
          {nextModule && <Link className="button button-primary" href={moduleRoute(nextModule.id)}>Continue to Module {moduleNumber(nextModule.id)} <ArrowRight size={14} /></Link>}
        </div>
      </nav>
    </div>
  );
}
