import Link from "next/link";
import { ArrowRight, BookOpen, FlaskConical } from "lucide-react";
import type { ModuleSummary } from "@/content/catalog";
import { formatStatus, type ProgressStatus } from "@/features/progress/model";

const colorTones = ["charcoal", "lavender", "teal", "earth", "stone"] as const;

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
  const tone = colorTones[(module.id - 1) % colorTones.length];
  const safeCompletedLessonCount = Math.min(module.lessons.length, Math.max(0, completedLessonCount));
  const statusLabel = status ? formatStatus(status) : module.level;
  const actionLabel = status === "in_progress"
    ? "Continue module"
    : status === "needs_review"
      ? "Review module"
      : status === "completed"
        ? "Revisit module"
        : "Explore module";

  return (
    <Link className="module-card-link" href={`/modules/${id}`}>
      <article className={`module-card module-card--${tone}`}>
        <div className="module-card-header">
          <div className="module-card-meta"><span className="module-number">MODULE {id}</span><span>{module.phase}</span></div>
          <span className={`module-card-status${status ? ` status-${status}` : ""}`}>{statusLabel}</span>
          <h3>{module.title}</h3>
        </div>
        <div className="module-card-content">
          <p className="module-card-intro">{module.intro}</p>
          <div className="module-card-counts">
            <span><BookOpen size={14} aria-hidden="true" /> {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}</span>
            <span><FlaskConical size={14} aria-hidden="true" /> {activityCount} {activityCount === 1 ? "activity" : "activities"}</span>
          </div>
          {status !== undefined && <div className="module-step-progress">
            <div className="module-lesson-card-progress-label"><span>Lessons complete</span><strong>{safeCompletedLessonCount} of {module.lessons.length}</strong></div>
            <div className="module-progress-track" role="progressbar" aria-label={`${module.title} lessons marked complete`} aria-valuemin={0} aria-valuemax={module.lessons.length} aria-valuenow={safeCompletedLessonCount} aria-valuetext={`${safeCompletedLessonCount} of ${module.lessons.length} lesson records are marked complete. This is self-reported progress, not a mastery score.`}>
              <span style={{ width: `${module.lessons.length ? (safeCompletedLessonCount / module.lessons.length) * 100 : 0}%` }} />
            </div>
            {activityCount > 0 && <div className="module-card-activity-status"><span>{activityId ? `Activity ${activityId}` : "Activity"}</span><span className={`progress-status-tag${activityStatus ? ` status-${activityStatus}` : ""}`}>{formatStatus(activityStatus ?? "not_started")}</span></div>}
          </div>}
          <span className="module-card-action">{actionLabel}<ArrowRight size={15} aria-hidden="true" /></span>
        </div>
      </article>
    </Link>
  );
}
