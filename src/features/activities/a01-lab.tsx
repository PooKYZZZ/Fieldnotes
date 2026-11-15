import type { ActivityRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ProgressEditor } from "@/features/progress/progress-editor";

export function A01Lab({ activity }: { activity: ActivityRecord }) {
  return (
    <div className="activity-experience activity-a01-experience">
      <section className="activity-stage activity-a01-understand" id="activity-scenario" aria-labelledby="activity-scenario-title">
        <div className="activity-a01-understand-grid">
          <div>
            <p className="eyebrow">Understand</p>
            <h2 id="activity-scenario-title">What can one process snapshot tell you?</h2>
            <p className="activity-scenario-text">{activity.scenario}</p>
          </div>
          <div className="activity-a01-brief">
            <div>
              <p className="eyebrow">Your task</p>
              <MarkdownContent>{activity.challenge}</MarkdownContent>
            </div>
            <div>
              <p className="eyebrow">Your deliverable</p>
              <MarkdownContent>{activity.build}</MarkdownContent>
            </div>
          </div>
        </div>
        <div className="activity-a01-objectives activity-objectives">
          <h3>By the end, you can</h3>
          <MarkdownContent>{activity.objectives}</MarkdownContent>
        </div>
      </section>

      <section className="activity-stage activity-prepare activity-a01-prepare" id="activity-prepare" aria-labelledby="activity-prepare-title">
        <div>
          <p className="eyebrow">Prepare</p>
          <h2 id="activity-prepare-title">Prepare your VM</h2>
          <p className="activity-prerequisite">{activity.prerequisite}</p>
          {activity.environment && <div className="activity-environment"><MarkdownContent>{activity.environment}</MarkdownContent></div>}
        </div>
        <div className="activity-a01-ready">
          <h3>Ready to begin?</h3>
          <ul>
            <li>An Ubuntu terminal is open under your normal user account.</li>
            <li>You can inspect processes owned by that account.</li>
            <li>You will record only sanitized observations.</li>
          </ul>
        </div>
      </section>

      <section className="activity-stage activity-perform activity-a01-investigate" id="activity-perform" aria-labelledby="activity-perform-title">
        <div className="activity-a01-section-heading">
          <p className="eyebrow">Investigate</p>
          <h2 id="activity-perform-title">Follow the process from <code>ps</code> to <code>/proc</code></h2>
          <p>Run each check in your VM. Compare the values, notice what changes, and record the evidence while it is in front of you.</p>
        </div>

        <div className="activity-a01-workspace">
          <div className="activity-a01-instructions">
            {activity.steps && <div className="activity-steps" id="activity-steps"><MarkdownContent copyable>{activity.steps}</MarkdownContent></div>}

            <section className="activity-a01-review" id="activity-review" aria-labelledby="activity-a01-review-title">
              <div className="activity-a01-review-heading">
                <div>
                  <p className="eyebrow">Verify</p>
                  <h3 id="activity-a01-review-title">Check what your evidence supports</h3>
                </div>
                <p>Compare your notes with the checklist. Fieldnotes cannot read commands from your terminal or verify them automatically.</p>
              </div>
              <div className="activity-a01-review-grid">
                <div className="activity-a01-expected activity-expected-observations">
                  <h4>Expected observations</h4>
                  <MarkdownContent>{activity.expectedObservations}</MarkdownContent>
                </div>
                {activity.verification && <div className="activity-a01-verification activity-verification">
                  <h4>Check the result</h4>
                  <MarkdownContent>{activity.verification}</MarkdownContent>
                </div>}
              </div>
              <div className="activity-a01-evidence activity-evidence-guidance">
                <h4>Evidence to include</h4>
                <MarkdownContent>{activity.submit}</MarkdownContent>
              </div>
            </section>

            {(activity.hints || activity.troubleshooting) && <div className="activity-help" aria-label="Optional help">
              <p className="eyebrow">Need a hand?</p>
              {activity.hints && <details className="optional-hints">
                <summary>Open a hint</summary>
                <div className="optional-hints-content"><MarkdownContent>{activity.hints}</MarkdownContent></div>
              </details>}
              {activity.troubleshooting && <details className="activity-troubleshooting">
                <summary>Troubleshoot a problem</summary>
                <MarkdownContent>{activity.troubleshooting}</MarkdownContent>
              </details>}
            </div>}

            {activity.cleanup && <details className="activity-cleanup">
              <summary>Finish the lab · clean up</summary>
              <MarkdownContent>{activity.cleanup}</MarkdownContent>
            </details>}
          </div>

          <aside className="activity-a01-notebook" aria-label="Investigation notebook">
            <a className="activity-a01-return" href="#activity-perform">Back to investigation steps</a>
            <section className="activity-record activity-a01-record" id="activity-record" aria-labelledby="activity-record-title">
              <h2 id="activity-record-title">Review and save</h2>
              <ProgressEditor
                itemType="activity"
                itemId={activity.id}
                title="Your investigation notebook"
                showComfort
                wide
                recordContext={`${activity.id} · ${activity.title}`}
                reflectionPrompt={activity.selfCheck}
                variant="activity-lab"
              />
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
