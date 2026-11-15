import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { ActivityRecord, ModuleRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { A01InvestigationWorkbench } from "@/features/activities/a01-investigation-workbench";

export function A01Lab({ activity, relatedModule }: { activity: ActivityRecord; relatedModule?: ModuleRecord }) {
  const modulePath = relatedModule ? `/modules/${String(relatedModule.id).padStart(2, "0")}` : "/roadmap";

  return (
    <div className="activity-experience activity-a01-experience">
      <section className="activity-stage activity-a01-understand" id="activity-scenario" aria-labelledby="activity-scenario-title">
        <div className="activity-a01-understand-copy">
          <h2 id="activity-scenario-title">Investigate before you restart</h2>
          <p className="activity-scenario-text">{activity.scenario}</p>
          <p className="activity-a01-goal"><strong>Your goal:</strong> {activity.build}</p>
          <details className="activity-a01-objectives">
            <summary>What you’ll practice</summary>
            <MarkdownContent>{activity.objectives}</MarkdownContent>
          </details>
        </div>
        <aside className="activity-a01-start-panel" aria-label="Start or review Activity A01">
          <p className="eyebrow">Continue with A01</p>
          <nav className="activity-a01-start-actions" aria-label="Activity actions">
            <a className="button button-primary" href="#activity-prepare">Begin investigation <ArrowRight size={15} aria-hidden="true" /></a>
            <a className="button button-outline" href="#activity-record">Review findings</a>
          </nav>
          <nav className="activity-resource-links activity-a01-resource-links" aria-label="Activity references">
            {relatedModule && <Link href={modulePath}>Review Module {String(relatedModule.id).padStart(2, "0")} · {relatedModule.title}</Link>}
            <a href="/library/04_Activities_and_Practice.pdf" target="_blank" rel="noreferrer">Activity reference PDF <FileText size={14} aria-hidden="true" /></a>
          </nav>
        </aside>
      </section>

      <section className="activity-stage activity-a01-prepare" id="activity-prepare" aria-labelledby="activity-prepare-title">
        <h2 id="activity-prepare-title">Before you begin</h2>
        <div className="activity-a01-prerequisite"><MarkdownContent>{activity.prerequisite}</MarkdownContent></div>
        {activity.environment && <aside className="activity-a01-safety-note" aria-label="Environment note"><MarkdownContent>{activity.environment}</MarkdownContent></aside>}
      </section>

      <A01InvestigationWorkbench activity={activity} />
    </div>
  );
}
