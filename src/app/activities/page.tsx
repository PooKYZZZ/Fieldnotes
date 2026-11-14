import type { Metadata } from "next";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ActivityDirectory } from "@/features/activities/activity-directory";
import { activities, modules, troubleshooting } from "@/content";

export const metadata: Metadata = { title: "Activities & practice" };

export default function ActivitiesPage() {
  const activityModules = modules.map(({ id, title, phase }) => ({ id, title, phase }));

  return (
    <>
      <header className="page-header activity-page-header">
        <div><p className="eyebrow">Skills in practice</p><h1>Activities &amp; labs</h1><p className="page-description">Work through one practical task for each module. Save what you expected, what happened, and how you checked the result.</p></div>
        <div className="activity-page-actions"><span className="tag">Self-paced · no due dates</span><a className="button button-outline header-action" href="/library/04_Activities_and_Practice.pdf" target="_blank" rel="noreferrer">Source PDF <ArrowRight size={14} /></a></div>
      </header>

      <nav className="activity-section-links" aria-label="Practice sections">
        <a href="#activity-library-title">Module activities <span>{activities.length}</span></a>
        <a href="#troubleshooting">Troubleshooting scenarios <span>{troubleshooting.length}</span></a>
      </nav>

      <ActivityDirectory activities={activities} modules={activityModules} />

      <section id="troubleshooting" className="cross-module-section" aria-labelledby="troubleshooting-title">
        <div className="activity-library-heading">
          <div><p className="eyebrow">Practice across topics</p><h2 id="troubleshooting-title">Troubleshooting scenarios</h2><p>Use evidence to narrow a failure, test one change, and record how you know the fix worked.</p></div>
          <span className="activity-result-count">{troubleshooting.length} scenarios</span>
        </div>
        <div className="troubleshooting-grid">
          {troubleshooting.map((item) => <details id={`troubleshooting-${item.id.toLowerCase()}`} className="troubleshooting-card" key={item.id}>
            <summary className="troubleshooting-summary"><span>{item.id}</span><strong>{item.title}</strong><ChevronDown size={17} aria-hidden="true" /></summary>
            <div className="troubleshooting-body">
              <p><strong>Observe</strong>{item.observation}</p>
              <p><strong>Investigate</strong>{item.investigation}</p>
              <p><strong>Safety boundary</strong>{item.constraint}</p>
              <p><strong>Hint</strong>{item.hint}</p>
              <p><strong>Evidence to record</strong>{item.completion}</p>
              <a href="/progress">Record your reflection <ArrowRight size={14} /></a>
            </div>
          </details>)}
        </div>
      </section>
    </>
  );
}
