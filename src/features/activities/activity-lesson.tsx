import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";
import type { ActivityRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ActivityInvestigationWorkbench } from "@/features/activities/activity-investigation-workbench";

export function ActivityLesson({ activity, previousActivity, nextActivity }: {
  activity: ActivityRecord;
  previousActivity?: Pick<ActivityRecord, "id" | "title">;
  nextActivity?: Pick<ActivityRecord, "id" | "title">;
}) {
  const isA01 = activity.id === "A01";
  const moduleNumber = String(activity.moduleId).padStart(2, "0");

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/activities">Activities</Link><span aria-hidden="true">/</span><span>{activity.id}</span></nav>
      <div className="activity-lesson-shell practice-workbench">
        <header className="activity-lesson-header">
          <div>
            <h1>{activity.title}</h1>
            <Link className="activity-module-return" href={`/modules/${moduleNumber}`}>
              Review Module {moduleNumber} overview <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="activity-execution-boundary">
            <FlaskConical size={17} aria-hidden="true" />
            <p>Run commands in a disposable environment and verify the results yourself. Save only sanitized evidence.</p>
          </div>
        </header>

        <nav className="activity-workflow-nav" aria-label="Activity steps">
          <a href="#activity-scenario"><span>01</span><strong>Understand</strong></a>
          <a href="#activity-prepare"><span>02</span><strong>Prepare</strong></a>
          <a href="#activity-perform"><span>03</span><strong>Practice &amp; record</strong></a>
          <a href="#activity-record"><span>04</span><strong>Review &amp; complete</strong></a>
        </nav>

        <div className="activity-experience activity-a01-experience">
          <div className="activity-brief">
            <section className="activity-stage activity-a01-understand" id="activity-scenario" aria-labelledby="activity-scenario-title">
              <h2 id="activity-scenario-title">{isA01 ? "Investigate before you restart" : "Scenario & goals"}</h2>
              {isA01 && <div className="activity-scenario-text"><MarkdownContent>{activity.scenario}</MarkdownContent></div>}
              <div className="activity-a01-goal"><MarkdownContent>{activity.build}</MarkdownContent></div>
              <details className="activity-a01-objectives">
                <summary>{isA01 ? "Learning objectives" : "Scenario and learning objectives"}</summary>
                {!isA01 && <div className="activity-scenario-text"><MarkdownContent>{activity.scenario}</MarkdownContent></div>}
                {!isA01 && <MarkdownContent>{activity.challenge}</MarkdownContent>}
                <MarkdownContent>{activity.objectives}</MarkdownContent>
              </details>
            </section>

            <section className="activity-stage activity-a01-prepare" id="activity-prepare" aria-labelledby="activity-prepare-title">
              <h2 id="activity-prepare-title">Before you begin</h2>
              <div className="activity-a01-prerequisite"><MarkdownContent>{activity.prerequisite}</MarkdownContent></div>
              {activity.environment && <aside className="activity-a01-safety-note" aria-label="Environment note"><MarkdownContent>{activity.environment}</MarkdownContent></aside>}
              <a className="button button-primary activity-start-practice" href="#activity-steps">Start practice <ArrowRight size={15} aria-hidden="true" /></a>
            </section>
          </div>

          <ActivityInvestigationWorkbench activity={activity} processInvestigation={isA01} />
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
