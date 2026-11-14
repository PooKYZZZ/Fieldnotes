import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
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

      <ActivityDirectory activities={activities} modules={activityModules} troubleshooting={troubleshooting} />
    </>
  );
}
