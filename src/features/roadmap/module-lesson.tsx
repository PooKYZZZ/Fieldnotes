import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, CircleHelp, Lightbulb, TriangleAlert } from "lucide-react";
import type { ActivityRecord, ModuleRecord } from "@/content";
import { ProgressEditor } from "@/features/progress/progress-editor";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { modules } from "@/content";

export function ModuleLesson({ learningModule, activity }: { learningModule: ModuleRecord; activity?: ActivityRecord }) {
  const nextModule = modules.find((item) => item.id === learningModule.id + 1);
  const previousModule = modules.find((item) => item.id === learningModule.id - 1);
  const moduleId = `M${String(learningModule.id).padStart(2, "0")}`;

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/roadmap">Roadmap</Link><span aria-hidden="true">/</span><span>{learningModule.phase}</span>
        <span aria-hidden="true">/</span><span>Module {String(learningModule.id).padStart(2, "0")}</span>
      </nav>
      <header className="page-header module-page-header">
        <div>
          <p className="eyebrow">{learningModule.phase} · {learningModule.level}</p>
          <h1>Module {String(learningModule.id).padStart(2, "0")}: {learningModule.title}</h1>
          <p className="page-description">{learningModule.intro}</p>
        </div>
        <div className="module-header-actions" aria-label="Module actions">
          <a className="button button-primary" href="#guided-practice">Start guided practice <ArrowRight size={14} /></a>
          <a className="button button-outline" href={`#progress-editor-${moduleId}`}>Record learning</a>
          <a className="module-source-link" href={`/library/${learningModule.sourcePdf}`} target="_blank" rel="noreferrer">Open source PDF</a>
        </div>
      </header>

      <div className="lesson-layout module-lesson-layout">
        <div className="lesson-main module-lesson-main">
          <section className="card module-orientation" aria-labelledby="module-question-title">
            <div className="module-question">
              <p className="eyebrow"><CircleHelp size={14} /> Start with this question</p>
              <h2 id="module-question-title">{learningModule.learningQuestion}</h2>
              <p className="course-detail module-prerequisite">
              {learningModule.prerequisites === "None; curiosity and a PC are enough."
                ? "Start here; no prior module is required."
                : `Before you start: ${learningModule.prerequisites}`}
              </p>
            </div>
            <div className="module-objectives">
              <h3><BookOpen size={16} /> Learning objectives</h3>
              <ul className="concept-list">{learningModule.concepts.map((concept) => <li key={concept.label}>
                {concept.href ? <Link className="concept-link" href={concept.href}>{concept.label}</Link> : concept.label}
              </li>)}</ul>
            </div>
          </section>

          <section className="card lesson-section">
            <p className="eyebrow lesson-sequence-label">01 · Understand</p>
            <h2><Lightbulb size={19} /> Concept lessons</h2>
            <MarkdownContent headingIdPrefix={`module-${String(learningModule.id).padStart(2, "0")}`}>{learningModule.explanation}</MarkdownContent>
            <details className="module-references">
              <summary>Technical references</summary>
              <div className="module-reference-content">
                <MarkdownContent>{learningModule.references}</MarkdownContent>
                <Link href="/resources#official-references">Browse the resource library <ArrowRight size={14} /></Link>
              </div>
            </details>
          </section>

          <section className="card lesson-section practice-section" id="guided-practice">
            <p className="eyebrow lesson-sequence-label">02 · Practice</p>
            <h2><ArrowRight size={19} /> Guided practice</h2>
            <p>{learningModule.practice}</p>
            <div className="callout-blue"><strong>Mini-lab outcome:</strong> {learningModule.miniLab}</div>
            {activity && (
              <div className="practice-activity">
                <p className="eyebrow">Activity {activity.id} · Full practice</p>
                <h3>{activity.title}</h3>
              <p><strong>Challenge:</strong> {activity.challenge}</p>
              <p><strong>Outcome:</strong> {activity.build}</p>
                <Link className="button button-primary" href={`/activities/${activity.id}`}>
                Open Activity {activity.id} <ArrowRight size={14} />
                </Link>
              </div>
            )}
            <aside className="lesson-caution-callout" aria-label="Common practice mistakes">
              <TriangleAlert size={17} aria-hidden="true" />
              <div>
                <h3>Watch for these mistakes</h3>
                <p>{learningModule.typicalMistakes}</p>
              </div>
            </aside>
            <div className="notice practice-safety-note" role="note">
              <TriangleAlert size={15} />
              <p>Use a disposable lab or a system you own. Keep passwords, tokens, personal data, and private network details out of saved evidence.</p>
            </div>
          </section>

          <section className="card lesson-section">
            <p className="eyebrow lesson-sequence-label">03 · Verify and reflect</p>
            <h2><CheckCircle2 size={19} /> Check your understanding</h2>
            <details className="recall-prompt">
              <summary>Recall from memory <span>Try before opening the explanation.</span></summary>
              <div className="recall-prompt-content">
                <h3>{learningModule.recallQuestion}</h3>
                <details className="recall-answer">
                  <summary>Reveal a model explanation</summary>
                  <MarkdownContent>{learningModule.recallAnswer}</MarkdownContent>
                </details>
              </div>
            </details>
            <h3 className="evidence-heading">Readiness check</h3>
            <p>{learningModule.readiness}</p>
            {activity && <p className="module-evidence-prompt"><strong>Evidence to record:</strong> {activity.submit}</p>}
            <h3 className="evidence-heading">Make the evidence useful</h3>
            <ul className="bullet-list evidence-guidance">
              <li><strong>Concept:</strong> explain the idea in your own words.</li>
              <li><strong>Build:</strong> save a small script, configuration, or lab result.</li>
              <li><strong>Failure:</strong> record what broke and what evidence identified it.</li>
              <li><strong>Decision:</strong> describe one trade-off you chose and why.</li>
            </ul>
          </section>

        </div>
      </div>

      <section className="learning-record-section" aria-label="Module learning record">
        <p className="eyebrow">Record · reflect · continue</p>
        <ProgressEditor itemType="module" itemId={moduleId} title="Module learning record" showComfort wide />
      </section>

      <nav className="module-pagination" aria-label="Module navigation">
        {previousModule ? <Link className="button button-outline" href={`/modules/${String(previousModule.id).padStart(2, "0")}`}><ArrowLeft size={14} /> Previous module</Link> : <span />}
        {nextModule && <Link className="button button-primary" href={`/modules/${String(nextModule.id).padStart(2, "0")}`}>Continue to Module {String(nextModule.id).padStart(2, "0")} <ArrowRight size={14} /></Link>}
      </nav>
    </>
  );
}
