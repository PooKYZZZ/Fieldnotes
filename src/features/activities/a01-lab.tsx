import type { ActivityRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { A01InvestigationWorkbench } from "@/features/activities/a01-investigation-workbench";

export function A01Lab({ activity }: { activity: ActivityRecord }) {
  return (
    <div className="activity-experience activity-a01-experience">
      <section className="activity-stage activity-a01-understand" id="activity-scenario" aria-labelledby="activity-scenario-title">
        <p className="eyebrow">Understand the mission</p>
        <h2 id="activity-scenario-title">What can one process snapshot tell you?</h2>
        <p className="activity-scenario-text">{activity.scenario}</p>
        <dl className="activity-a01-mission-outcome">
          <div>
            <dt>Your investigation</dt>
            <dd><MarkdownContent>{activity.challenge}</MarkdownContent></dd>
          </div>
          <div>
            <dt>What you will keep</dt>
            <dd><MarkdownContent>{activity.build}</MarkdownContent></dd>
          </div>
        </dl>
      </section>

      <section className="activity-stage activity-a01-prepare" id="activity-prepare" aria-labelledby="activity-prepare-title">
        <div className="activity-a01-setup-heading">
          <p className="eyebrow">Before you begin</p>
          <h2 id="activity-prepare-title">Prepare your VM</h2>
          <p className="activity-prerequisite">{activity.prerequisite}</p>
        </div>
        {activity.environment && <div className="activity-environment"><MarkdownContent>{activity.environment}</MarkdownContent></div>}
      </section>

      <A01InvestigationWorkbench activity={activity} />
    </div>
  );
}
