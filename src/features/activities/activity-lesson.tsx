import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, TriangleAlert } from "lucide-react";
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
      <div className="activity-lesson-shell">
        <header className="page-header activity-lesson-header">
          <div>
            <p className="eyebrow">Activity {activity.id} · Module {String(activity.moduleId).padStart(2, "0")}</p>
            <h1>{activity.title}</h1>
          </div>
          <div className="activity-header-tools">
            <div className="activity-header-actions" aria-label="Activity actions">
              <a className="button button-primary" href="#activity-scenario">Start activity <ArrowRight size={14} /></a>
              <a className="button button-outline" href={`#progress-editor-${activity.id}`}>Record your work</a>
            </div>
            <nav className="activity-resource-links" aria-label="Activity references">
              {relatedModule && <Link href={modulePath}>Review Module {String(relatedModule.id).padStart(2, "0")} · {relatedModule.title}</Link>}
              <a href="/library/04_Activities_and_Practice.pdf" target="_blank" rel="noreferrer">Activity reference PDF <FileText size={14} /></a>
            </nav>
          </div>
        </header>

        <nav className="activity-workflow-nav" aria-label="Activity steps">
          <a href="#activity-scenario"><span>01</span><strong>Scenario &amp; goals</strong></a>
          <a href="#activity-prepare"><span>02</span><strong>Prepare</strong></a>
          <a href="#activity-perform"><span>03</span><strong>Perform &amp; verify</strong></a>
          <a href="#activity-record"><span>04</span><strong>Record your work</strong></a>
        </nav>

        <div className="activity-experience">
          <section className="activity-stage activity-scenario" id="activity-scenario" aria-labelledby="activity-scenario-title">
            <h2 id="activity-scenario-title">Scenario &amp; goals</h2>
            <p className="activity-scenario-text">{activity.scenario}</p>
            <dl className="activity-brief">
              <div><dt>Your task</dt><dd><MarkdownContent>{activity.challenge}</MarkdownContent></dd></div>
              <div><dt>Deliverable</dt><dd><MarkdownContent>{activity.build}</MarkdownContent></dd></div>
            </dl>
            <div className="activity-objectives" aria-labelledby="activity-objectives-title">
              <h3 id="activity-objectives-title">By the end, you can</h3>
              <MarkdownContent>{activity.objectives}</MarkdownContent>
            </div>
          </section>

          <section className="activity-stage activity-prepare" id="activity-prepare" aria-labelledby="activity-prepare-title">
            <h2 id="activity-prepare-title">Prepare</h2>
            <p className="activity-prerequisite"><strong>Before you begin</strong>{activity.prerequisite}</p>
            {activity.environment && <div className="activity-environment"><MarkdownContent>{activity.environment}</MarkdownContent></div>}
          </section>

          <section className="activity-stage activity-perform" id="activity-perform" aria-labelledby="activity-perform-title">
            <h2 id="activity-perform-title">Perform &amp; verify</h2>
            {activity.steps && <div className="activity-steps" id="activity-steps"><MarkdownContent copyable>{activity.steps}</MarkdownContent></div>}
            <div className="activity-expected-observations">
              <h3>Expected observations</h3>
              <MarkdownContent copyable>{activity.expectedObservations}</MarkdownContent>
            </div>
            {activity.verification && <div className="activity-verification">
              <h3>Check the result</h3>
              <MarkdownContent copyable>{activity.verification}</MarkdownContent>
            </div>}
            {(activity.hints || activity.troubleshooting) && <div className="activity-help" aria-label="Optional help">
              <p className="eyebrow">Optional help</p>
              {activity.hints && <details className="optional-hints">
                <summary>Open a hint</summary>
                <div className="optional-hints-content"><MarkdownContent copyable>{activity.hints}</MarkdownContent></div>
              </details>}
              {activity.troubleshooting && <details className="activity-troubleshooting">
                <summary><TriangleAlert size={15} aria-hidden="true" /> Troubleshoot a problem</summary>
                <MarkdownContent copyable>{activity.troubleshooting}</MarkdownContent>
              </details>}
            </div>}
          </section>

          <section className="activity-stage activity-record" id="activity-record" aria-labelledby="activity-record-title">
            <h2 id="activity-record-title">Record your work</h2>
            <div className="activity-evidence-guidance">
              <h3>Evidence to include</h3>
              <MarkdownContent>{activity.submit}</MarkdownContent>
            </div>
            <ProgressEditor
              itemType="activity"
              itemId={activity.id}
              title="Save your learning record"
              showComfort
              wide
              bare
              recordContext={`${activity.id} · ${activity.title}`}
              reflectionPrompt={activity.selfCheck}
            />
            {activity.cleanup && <details className="activity-cleanup">
              <summary>After saving · clean up</summary>
              <MarkdownContent>{activity.cleanup}</MarkdownContent>
            </details>}
          </section>
        </div>

        <nav className="activity-continuation" aria-label="Continue learning">
          {previousActivity ? <Link className="activity-continuation-link activity-continuation-link--previous" href={`/activities/${previousActivity.id}`}><span>Previous activity</span><strong><ArrowLeft size={14} /> {previousActivity.id} · {previousActivity.title}</strong></Link> : <span />}
          <Link className="activity-continuation-link activity-continuation-link--catalog" href="/activities"><span>Practice library</span><strong>Choose another activity <ArrowRight size={14} /></strong></Link>
          {nextActivity && <Link className="activity-continuation-link activity-continuation-link--next" href={`/activities/${nextActivity.id}`}><span>Next activity</span><strong>{nextActivity.id} · {nextActivity.title} <ArrowRight size={14} /></strong></Link>}
        </nav>
      </div>
    </>
  );
}
