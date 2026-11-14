import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ActivityRecord, ModuleRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ProgressEditor } from "@/features/progress/progress-editor";

export function ActivityLesson({ activity, relatedModule, previousActivity, nextActivity }: {
  activity: ActivityRecord;
  relatedModule?: ModuleRecord;
  previousActivity?: Pick<ActivityRecord, "id" | "title">;
  nextActivity?: Pick<ActivityRecord, "id" | "title">;
}) {
  const modulePath = relatedModule ? `/modules/${String(relatedModule.id).padStart(2, "0")}` : "/roadmap";

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/activities">Activities</Link><span aria-hidden="true">/</span><span>{activity.id}</span></nav>
      <header className="page-header activity-lesson-header">
        <div>
          <p className="eyebrow">Activity {activity.id} · Module {String(activity.moduleId).padStart(2, "0")}</p>
          <h1>{activity.title}</h1>
          <p className="page-description">{activity.scenario}</p>
        </div>
        <div className="activity-header-actions" aria-label="Activity actions">
          <a className="button button-primary" href="#activity-prepare">Start this activity <ArrowRight size={14} /></a>
          <a className="button button-outline" href={`#progress-editor-${activity.id}`}>Record your work</a>
          <a className="module-source-link" href="/library/04_Activities_and_Practice.pdf" target="_blank" rel="noreferrer">Source PDF <FileText size={14} /></a>
        </div>
      </header>

      <section className="activity-objective-strip" id="activity-objectives" aria-labelledby="activity-objectives-title">
        <div>
          <p className="eyebrow">Learning objectives</p>
          <h2 id="activity-objectives-title">What you will practice</h2>
          <MarkdownContent>{activity.objectives}</MarkdownContent>
        </div>
        <p className="activity-objective-note">Work at your own pace. Save an unfinished attempt and return when you are ready to continue.</p>
      </section>

      <nav className="activity-workflow-nav" aria-label="Activity workflow">
        <a href="#activity-objectives"><span>01</span><strong>Scenario &amp; goals</strong></a>
        <a href="#activity-prepare"><span>02</span><strong>Prepare</strong></a>
        <a href="#activity-perform"><span>03</span><strong>Hands-on work</strong></a>
        <a href="#activity-verify-record"><span>04</span><strong>Verify &amp; record</strong></a>
      </nav>

      <div className="notice activity-safety-note" role="note">
        <ShieldCheck size={16} />
        <p>Work in a disposable environment or on systems you own. Don’t include passwords, tokens, personal information, or private IPs in saved notes.</p>
      </div>

      <div className="activity-workflow-layout">
        <div className="activity-workflow-main">
          <section className="card lesson-section activity-workflow-section activity-prepare" id="activity-prepare" aria-labelledby="activity-prepare-title">
            <p className="eyebrow activity-phase-label">02 · Prepare</p>
            <h2 id="activity-prepare-title"><ShieldCheck size={19} /> Prepare your environment</h2>
            <div className="activity-prepare-details">
              <p className="activity-prerequisite"><strong>Prerequisite</strong>{activity.prerequisite}</p>
            </div>
            {activity.environment && <div className="activity-environment"><strong>Required environment</strong><MarkdownContent copyable>{activity.environment}</MarkdownContent></div>}
          </section>

          <section className="card lesson-section activity-workflow-section activity-perform" id="activity-perform" aria-labelledby="activity-perform-title">
            <p className="eyebrow activity-phase-label">03 · Hands-on work</p>
            <h2 id="activity-perform-title">Hands-on work</h2>
            <p className="activity-challenge">{activity.challenge}</p>
            {activity.steps && (
              <div className="activity-steps" id="activity-steps">
                <h3>Practice steps</h3>
                <MarkdownContent copyable>{activity.steps}</MarkdownContent>
              </div>
            )}
            <div className="activity-expected-observations">
              <h3>What to expect and how to read it</h3>
              <MarkdownContent copyable>{activity.expectedObservations}</MarkdownContent>
            </div>
            <div className="activity-build-outcome">
              <h3>What you will produce</h3>
              <p>{activity.build}</p>
            </div>
          </section>
        </div>

        <aside className="activity-support-rail" aria-label="Activity references and optional help">
          <section className="activity-support-card" aria-labelledby="activity-reference-title">
            <p className="eyebrow">Lab reference</p>
            <h2 id="activity-reference-title">Connect the lesson</h2>
            <p>Use the module to revisit the concept behind this task. Return here when you are ready to test it.</p>
            {relatedModule && <Link className="activity-related-module" href={modulePath}>Review Module {String(relatedModule.id).padStart(2, "0")} · {relatedModule.title} <ArrowRight size={14} /></Link>}
            <a className="activity-reference-link" href="/library/04_Activities_and_Practice.pdf" target="_blank" rel="noreferrer">Open activity reference <FileText size={14} /></a>
          </section>

          <section className="activity-help-card" aria-labelledby="activity-help-title">
            <p className="eyebrow">Optional help</p>
            <h2 id="activity-help-title">Need help?</h2>
            <p className="activity-help-intro">Try the task independently first. Open a hint or troubleshooting note only when you need it.</p>
            {activity.hints && (
              <details className="optional-hints">
                <summary>Reveal optional hints</summary>
                <div className="optional-hints-content"><MarkdownContent copyable>{activity.hints}</MarkdownContent></div>
              </details>
            )}
            {activity.troubleshooting && (
              <details className="activity-troubleshooting">
                <summary><TriangleAlert size={17} /> If something goes wrong</summary>
                <MarkdownContent copyable>{activity.troubleshooting}</MarkdownContent>
              </details>
            )}
          </section>
        </aside>

        <section className="card lesson-section activity-workflow-section activity-verify-record" id="activity-verify-record" aria-labelledby="activity-verify-record-title">
          <p className="eyebrow activity-phase-label">04 · Verify and record</p>
          <h2 id="activity-verify-record-title"><CheckCircle2 size={19} /> Verify &amp; Record</h2>
          {activity.verification && <div className="activity-verification"><h3>Verify your result</h3><MarkdownContent copyable>{activity.verification}</MarkdownContent></div>}

          <div className="activity-submission-prompts">
            <h3>What to submit</h3>
            <MarkdownContent copyable>{activity.submit}</MarkdownContent>
          </div>

          <div className="activity-reflection-prompts">
            <h3>Reflect and continue</h3>
            <p><strong>Self-check:</strong> {activity.selfCheck}</p>
            <p><strong>Work independently:</strong> {activity.independencePrompt}</p>
          </div>

          {activity.cleanup && <div className="activity-cleanup">
            <h3>When you finish</h3>
            <MarkdownContent copyable>{activity.cleanup}</MarkdownContent>
          </div>}

          <div className="activity-record-block">
            <p className="eyebrow">Save evidence and reflection</p>
            <ProgressEditor itemType="activity" itemId={activity.id} title="Activity learning record" showComfort wide />
          </div>
        </section>
      </div>

      <nav className="activity-continuation" aria-label="Continue learning">
        {previousActivity ? <Link className="activity-continuation-link activity-continuation-link--previous" href={`/activities/${previousActivity.id}`}><span>Previous activity</span><strong><ArrowLeft size={14} /> {previousActivity.id} · {previousActivity.title}</strong></Link> : <span />}
        <Link className="activity-continuation-link activity-continuation-link--catalog" href="/activities"><span>Practice library</span><strong>Choose another activity <ArrowRight size={14} /></strong></Link>
        {nextActivity && <Link className="activity-continuation-link activity-continuation-link--next" href={`/activities/${nextActivity.id}`}><span>Next activity</span><strong>{nextActivity.id} · {nextActivity.title} <ArrowRight size={14} /></strong></Link>}
      </nav>
    </>
  );
}
