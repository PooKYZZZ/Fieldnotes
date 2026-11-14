import Link from "next/link";
import { ArrowRight, BookOpen, FlaskConical } from "lucide-react";
import type { ModuleSummary } from "@/content/catalog";
import { formatStatus, type ProgressStatus } from "@/features/progress/model";
import { summarizeModuleProgress } from "@/features/progress/module-progress";

const colorTones = ["charcoal", "lavender", "teal", "earth", "stone"] as const;

export function ModuleCard({
  module,
  status,
  activityCount = 0,
  completedActivityCount = 0,
}: {
  module: ModuleSummary;
  status?: ProgressStatus;
  activityCount?: number;
  completedActivityCount?: number;
}) {
  const id = String(module.id).padStart(2, "0");
  const tone = colorTones[(module.id - 1) % colorTones.length];
  const progress = summarizeModuleProgress(status, activityCount, completedActivityCount);
  const statusLabel = status ? formatStatus(status) : module.level;

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
          {status !== undefined && (
            <div className="module-step-progress">
              <div><span>Saved records</span><span>{progress.completedSteps} of {progress.totalSteps} records · {progress.percent}%</span></div>
              <div className="module-progress-track" role="progressbar" aria-label={`${module.title} saved-record completion`} aria-valuemin={0} aria-valuemax={progress.totalSteps} aria-valuenow={progress.completedSteps} aria-valuetext={`${progress.completedSteps} of ${progress.totalSteps} saved records marked complete (${progress.percent}%).`}>
                <span style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}
          <span className="module-card-action">{status === "in_progress" ? "Continue module" : status === "needs_review" ? "Review module" : "Explore module"}<ArrowRight size={15} aria-hidden="true" /></span>
        </div>
      </article>
    </Link>
  );
}
