import type { ActivityRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { A01InvestigationWorkbench } from "@/features/activities/a01-investigation-workbench";

export function A01Lab({ activity }: { activity: ActivityRecord }) {
  return (
    <div className="activity-experience activity-a01-experience">
      <section className="activity-stage activity-a01-understand" id="activity-scenario" aria-labelledby="activity-scenario-title">
        <h2 id="activity-scenario-title">Investigate before you restart</h2>
        <p className="activity-scenario-text">{activity.scenario}</p>
        <p className="activity-a01-goal"><strong>Your goal:</strong> {activity.build}</p>
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

      <A01InvestigationWorkbench activity={activity} />
    </div>
  );
}
