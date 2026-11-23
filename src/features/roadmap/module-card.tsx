import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ModuleSummary } from "@/content/catalog";
import { formatStatus, type ProgressStatus } from "@/features/progress/model";

export function ModuleCard({
  module,
  status,
  activityCount = 0,
  activityId,
  activityStatus,
  completedLessonCount = 0,
}: {
  module: ModuleSummary & { activityId?: string };
  status?: ProgressStatus;
  activityCount?: number;
  activityId?: string;
  activityStatus?: ProgressStatus;
  completedLessonCount?: number;
}) {
  const id = String(module.id).padStart(2, "0");
  const safeCompletedLessonCount = Math.min(module.lessons.length, Math.max(0, completedLessonCount));
  const statusLabel = status ? formatStatus(status) : module.level;
  return (
    <article className="module-card study-module-row">
        <span className="module-number">MODULE {id}</span>
        <div className="study-module-copy">
          <h3><Link className="module-card-link" href={`/modules/${id}`}>{module.title}</Link></h3>
          <p>{module.intro}</p>
        </div>
        <div className="study-module-meta">
          <div className="study-module-counts">
            <span className={`module-card-status${status ? ` status-${status}` : ""}`}>{statusLabel}</span>
            <span>{module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}</span>
            {activityCount > 0 && <span>{activityCount} {activityCount === 1 ? "activity" : "activities"}</span>}
          </div>
          {status !== undefined && <div className="module-step-progress">
            <div className="module-lesson-card-progress-label"><span>Lessons complete</span><strong>{safeCompletedLessonCount} of {module.lessons.length}</strong></div>
            <div className="module-progress-track" role="progressbar" aria-label={`${module.title} lessons marked complete`} aria-valuemin={0} aria-valuemax={module.lessons.length} aria-valuenow={safeCompletedLessonCount} aria-valuetext={`${safeCompletedLessonCount} of ${module.lessons.length} lesson records are marked complete. This is self-reported progress, not a mastery score.`}>
              <span style={{ width: `${module.lessons.length ? (safeCompletedLessonCount / module.lessons.length) * 100 : 0}%` }} />
            </div>
            {activityCount > 0 && <div className="module-card-activity-status"><span>{activityId ? `Activity ${activityId}` : "Activity"}</span><span className={`progress-status-tag${activityStatus ? ` status-${activityStatus}` : ""}`}>{formatStatus(activityStatus ?? "not_started")}</span></div>}
          </div>}
        </div>
        <ArrowUpRight className="study-module-action" size={17} aria-hidden="true" />
    </article>
  );
}
