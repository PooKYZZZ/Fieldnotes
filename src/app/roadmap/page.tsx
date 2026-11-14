import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { activities, modules } from "@/content";
import { curriculumPhaseNames } from "@/content/taxonomy";
import { listProgress } from "@/features/progress/storage/store.server";
import type { ProgressRecord } from "@/features/progress/model";
import { RoadmapExplorer } from "@/features/roadmap/roadmap-explorer";

export const metadata: Metadata = { title: "Learning roadmap" };
export const dynamic = "force-dynamic";

export default function RoadmapPage() {
  let records: ProgressRecord[] = [];
  let progressAvailable = true;
  try {
    records = listProgress();
  } catch {
    progressAvailable = false;
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
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your complete pathway</p>
          <h1>Learning roadmap</h1>
          <p className="page-description">
            Browse all {modules.length} modules across {phases.length} phases, then use saved progress to find your next topic.
          </p>
        </div>
        <a className="button button-outline header-action" href="/library/00_Learning_Roadmap.pdf" target="_blank" rel="noreferrer">
          Open roadmap PDF <ArrowRight size={14} />
        </a>
      </header>
      <div className="callout-blue">
        <strong>How to move forward:</strong> Choose a lesson, connect the idea to a practical task, and save the evidence that fits your goal. Mark learning complete when you are ready; the roadmap keeps lesson, activity, and module status separate.
      </div>
      <RoadmapExplorer modules={roadmapModules} phases={phases} progressAvailable={progressAvailable} />
    </>
  );
}
