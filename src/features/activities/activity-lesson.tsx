import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ActivityRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { A01Lab } from "@/features/activities/a01-lab";
import { ActivityInvestigationWorkbench } from "@/features/activities/activity-investigation-workbench";

export function ActivityLesson({ activity, previousActivity, nextActivity }: {
  activity: ActivityRecord;
  previousActivity?: Pick<ActivityRecord, "id" | "title">;
  nextActivity?: Pick<ActivityRecord, "id" | "title">;
}) {
  const isA01 = activity.id === "A01";

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/activities">Activities</Link><span aria-hidden="true">/</span><span>{activity.id}</span></nav>
      <div className="activity-lesson-shell">
        <header className="page-header activity-lesson-header">
          <div>
            <p className="eyebrow">Activity {activity.id} · Module {String(activity.moduleId).padStart(2, "0")}</p>
            <h1>{activity.title}</h1>
            <Link className="activity-module-return" href={`/modules/${String(activity.moduleId).padStart(2, "0")}`}>
              Review Module {String(activity.moduleId).padStart(2, "0")} overview <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <p className="activity-execution-boundary">Run practical steps in your own disposable environment. Fieldnotes saves your notes; it does not run commands or verify results. Record only sanitized evidence.</p>

        <nav className="activity-workflow-nav" aria-label="Activity steps">
          <a href="#activity-scenario"><span>01</span><strong>Understand</strong></a>
          <a href="#activity-prepare"><span>02</span><strong>Prepare</strong></a>
          <a href="#activity-perform"><span>03</span><strong>Practice &amp; record</strong></a>
          <a href="#activity-record"><span>04</span><strong>Review &amp; complete</strong></a>
        </nav>

        {isA01 ? <A01Lab activity={activity} /> : <div className="activity-experience activity-a01-experience">
          <section className="activity-stage activity-a01-understand" id="activity-scenario" aria-labelledby="activity-scenario-title">
            <h2 id="activity-scenario-title">Scenario &amp; goals</h2>
            <p className="activity-scenario-text">{activity.scenario}</p>
            <div className="activity-a01-goal"><strong>Your task:</strong><MarkdownContent>{activity.challenge}</MarkdownContent></div>
            <div className="activity-a01-goal"><strong>Your goal:</strong><MarkdownContent>{activity.build}</MarkdownContent></div>
            <details className="activity-a01-objectives">
              <summary>What you’ll practice</summary>
              <MarkdownContent>{activity.objectives}</MarkdownContent>
            </details>
          </section>

          <section className="activity-stage activity-a01-prepare" id="activity-prepare" aria-labelledby="activity-prepare-title">
            <h2 id="activity-prepare-title">Before you begin</h2>
            <div className="activity-a01-prerequisite"><MarkdownContent>{activity.prerequisite}</MarkdownContent></div>
            {activity.environment && <aside className="activity-a01-safety-note" aria-label="Environment note"><MarkdownContent>{activity.environment}</MarkdownContent></aside>}
          </section>

          <ActivityInvestigationWorkbench activity={activity} />
        </div>}

        <nav className="activity-continuation" aria-label="Continue learning">
          {previousActivity ? <Link className="activity-continuation-link activity-continuation-link--previous" href={`/activities/${previousActivity.id}`}><span>Previous activity</span><strong><ArrowLeft size={14} /> {previousActivity.id} · {previousActivity.title}</strong></Link> : <span />}
          <Link className="activity-continuation-link activity-continuation-link--catalog" href="/activities"><span>Practice library</span><strong>Choose another activity <ArrowRight size={14} /></strong></Link>
          {nextActivity && <Link className="activity-continuation-link activity-continuation-link--next" href={`/activities/${nextActivity.id}`}><span>Next activity</span><strong>{nextActivity.id} · {nextActivity.title} <ArrowRight size={14} /></strong></Link>}
        </nav>
      </div>
    </>
  );
}
