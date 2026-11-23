import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { activities, modules } from "@/content";
import { curriculumPhaseNames } from "@/content/taxonomy";
import { listProgressSummary } from "@/features/progress/storage/store.server";
import { getCurrentSession } from "@/features/auth/auth.server";
import type { ProgressSummary } from "@/features/progress/model";
import { RoadmapExplorer } from "@/features/roadmap/roadmap-explorer";

export const metadata: Metadata = { title: "Learning roadmap" };
export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  let records: ProgressSummary[] = [];
  let session = null;
  let authUnavailable = false;
  try {
    session = await getCurrentSession();
  } catch {
    authUnavailable = true;
  }
  let progressAvailable = Boolean(session);
  if (session) {
    try {
      records = listProgressSummary(session.user.id);
    } catch {
      progressAvailable = false;
    }
  }
  const recordByKey = new Map(records.map((record) => [record.itemType + ":" + record.itemId, record]));
  const phases = curriculumPhaseNames.map((name) => {
    const phaseModules = modules.filter((module) => module.phase === name);
    const moduleIds = phaseModules.map((module) => module.id);
    const first = moduleIds.length ? Math.min(...moduleIds) : 0;
    const last = moduleIds.length ? Math.max(...moduleIds) : 0;
    return { name, range: "Modules " + String(first).padStart(2, "0") + "–" + String(last).padStart(2, "0") };
  });
  const roadmapModules = modules.map((module) => {
    const linkedActivities = activities.filter((activity) => activity.moduleId === module.id);
    const primaryActivity = linkedActivities[0];
    const completedActivityCount = linkedActivities.filter((activity) =>
      recordByKey.get("activity:" + activity.id)?.status === "completed",
    ).length;
    const completedLessonCount = progressAvailable
      ? module.lessons.filter((lesson) => recordByKey.get("lesson:" + lesson.id)?.status === "completed").length
      : 0;
    const status = progressAvailable
      ? recordByKey.get("module:M" + String(module.id).padStart(2, "0"))?.status ?? "not_started"
      : undefined;
    const activityStatus = progressAvailable && primaryActivity
      ? recordByKey.get("activity:" + primaryActivity.id)?.status ?? "not_started"
      : undefined;

    return {
      module: {
        id: module.id,
        title: module.title,
        phase: module.phase,
        level: module.level,
        intro: module.intro,
        activityId: module.activityId,
        lessons: module.lessons.map(({ id, title }) => ({ id, title })),
      },
      status,
      activityCount: linkedActivities.length,
      completedActivityCount,
      activityStatus,
      completedLessonCount,
    };
  });

  return (
    <div className="study-roadmap">
      <header className="page-header study-roadmap-header">
        <div>
          <h1>Learning roadmap</h1>
          <p className="page-description">Follow the {modules.length}-module path from operating systems to cloud operations, or find a topic to revisit.</p>
        </div>
        <a className="button button-outline header-action" href="/library/00_Learning_Roadmap.pdf" target="_blank" rel="noreferrer">
          Open roadmap PDF <ArrowRight size={14} />
        </a>
      </header>
      <RoadmapExplorer
        modules={roadmapModules}
        phases={phases}
        progressAvailable={progressAvailable}
        progressRequiresSignIn={!session && !authUnavailable}
      />
    </div>
  );
}
