import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, FileText, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ActivityRecord, ModuleRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ProgressEditor } from "@/features/progress/progress-editor";

export function ActivityLesson({ activity, relatedModule }: { activity: ActivityRecord; relatedModule?: ModuleRecord }) {
  const modulePath = relatedModule ? `/modules/${String(relatedModule.id).padStart(2, "0")}` : "/roadmap";
  const practiceTarget = activity.steps ? "#activity-steps" : "#activity-challenge";

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/activities">Activities</Link><span aria-hidden="true">/</span><span>{activity.id}</span></nav>
      <header className="page-header activity-lesson-header">
        <div>
          <p className="eyebrow">Activity {activity.id} · Module {String(activity.moduleId).padStart(2, "0")}</p>
          <h1>{activity.title}</h1>
          <p className="page-description">Make a small, reproducible result and explain what the evidence tells you.</p>
        </div>
        <div className="activity-header-actions" aria-label="Activity actions">
          <a className="button button-primary" href={practiceTarget}>Start this activity <ArrowRight size={14} /></a>
          <a className="button button-outline" href={`#progress-editor-${activity.id}`}>Record your work</a>
          <a className="module-source-link" href="/library/04_Activities_and_Practice.pdf" target="_blank" rel="noreferrer">Source PDF <FileText size={14} /></a>
        </div>
      </header>

      <div className="lesson-layout activity-lesson-layout">
        <div className="lesson-main activity-lesson-main">
          <div className="notice activity-safety-note" role="note">
            <ShieldCheck size={16} />
            <p>Work in a disposable environment or on systems you own. Don’t include passwords, tokens, personal information, or private IPs in saved notes.</p>
          </div>

          <section className="card lesson-section">
            <h2><CheckCircle2 size={19} /> Before you start</h2>
            <p><strong>Prerequisite:</strong> {activity.prerequisite}</p>
            {activity.environment && <div className="activity-environment"><strong>Environment:</strong> <MarkdownContent>{activity.environment}</MarkdownContent></div>}
            {relatedModule && <Link href={modulePath}>Review Module {String(relatedModule.id).padStart(2, "0")} · {relatedModule.title} <ArrowRight size={13} /></Link>}
          </section>

          <section className="card lesson-section" id="activity-challenge">
            <h2>Your challenge</h2>
            <p>{activity.challenge}</p>
          </section>

          {activity.steps && (
            <section className="card lesson-section activity-steps" id="activity-steps" aria-labelledby="activity-steps-title">
              <h2 id="activity-steps-title">Practice steps</h2>
              <MarkdownContent>{activity.steps}</MarkdownContent>
            </section>
          )}

          <section className="card lesson-section">
            <h2><FileText size={19} /> Build outcome</h2>
            <p>{activity.build}</p>
          </section>

          {activity.hints && (
            <details className="card lesson-section optional-hints">
              <summary>Optional hints <span>Open only if you need a starting point.</span></summary>
              <div className="optional-hints-content"><MarkdownContent>{activity.hints}</MarkdownContent></div>
            </details>
          )}

          {activity.verification && (
            <section className="card lesson-section activity-verification">
              <h2><CheckCircle2 size={19} /> Verify your result</h2>
              <MarkdownContent>{activity.verification}</MarkdownContent>
            </section>
          )}

          {activity.troubleshooting && (
            <section className="card lesson-section lesson-section--caution activity-troubleshooting">
              <h2><TriangleAlert size={19} /> If something goes wrong</h2>
              <MarkdownContent>{activity.troubleshooting}</MarkdownContent>
            </section>
          )}

          <section className="card lesson-section">
            <h2>What to submit</h2>
            <p>{activity.submit}</p>
            <div className="checklist-grid evidence-prompts">
              <div className="checklist-item"><Circle size={14} aria-hidden="true" />What you expected</div>
              <div className="checklist-item"><Circle size={14} aria-hidden="true" />What actually happened</div>
              <div className="checklist-item"><Circle size={14} aria-hidden="true" />Commands or test evidence</div>
              <div className="checklist-item"><Circle size={14} aria-hidden="true" />A failure case and what you learned</div>
            </div>
          </section>

          <section className="card lesson-section">
            <h2>Self-check</h2>
            <p>{activity.selfCheck}</p>
          </section>

          <section className="card lesson-section">
            <h2>Work independently</h2>
            <p>{activity.independencePrompt}</p>
          </section>

          {activity.cleanup && (
            <section className="card lesson-section activity-cleanup">
              <h2>When you finish</h2>
              <MarkdownContent>{activity.cleanup}</MarkdownContent>
            </section>
          )}

          <Link className="button button-outline" href="/activities"><ArrowLeft size={14} /> Back to all activities</Link>
        </div>
      </div>

      <section className="learning-record-section" aria-label="Activity learning record">
        <p className="eyebrow">Record · reflect · continue</p>
        <ProgressEditor itemType="activity" itemId={activity.id} title="Activity learning record" showComfort wide />
      </section>
    </>
  );
}
