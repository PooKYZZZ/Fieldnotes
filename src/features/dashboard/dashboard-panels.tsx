import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { formatStatus, type ProgressStatus } from "@/features/progress/model";
import type { DashboardActivity, DashboardModel, DashboardModule, DashboardNextItem, DashboardRecentItem, DashboardResumeProject, ModuleStatus } from "@/features/dashboard/model";

type ContinueLearningPanelProps = {
  loaded: boolean;
  loadError: boolean;
  requiresSignIn: boolean;
  currentModule?: DashboardModule;
  currentModuleStatus?: ModuleStatus;
  currentLesson?: DashboardModule["lessons"][number] & { moduleId: number };
  currentLessonStatus?: ProgressStatus;
  lessonProgress?: { completed: number; total: number };
  currentActivity?: DashboardActivity;
  currentActivityStatus?: ProgressStatus;
  currentActivityModule?: DashboardModule;
  currentActivityModuleStatus?: ModuleStatus;
  currentActivityLessonProgress?: { completed: number; total: number };
  currentProject?: DashboardResumeProject;
  totalModules: number;
  onRetry: () => void;
};

export function ContinueLearningPanel({
  loaded,
  loadError,
  requiresSignIn,
  currentModule,
  currentModuleStatus,
  currentLesson,
  currentLessonStatus,
  lessonProgress,
  currentActivity,
  currentActivityStatus,
  currentActivityModule,
  currentActivityModuleStatus,
  currentActivityLessonProgress,
  currentProject,
  totalModules,
  onRetry,
}: ContinueLearningPanelProps) {
  const activityModule = currentActivityModule ?? currentModule;
  return (
    <section className="continue-panel" aria-labelledby="continue-title">
      {!loaded ? (
        <div className="continue-loading" role="status"><h2 id="continue-title" className="sr-only">Continue learning</h2>Loading your saved learning progress…</div>
      ) : loadError ? (
        <div className="continue-content continue-unavailable">
          <p className="continue-kicker">Your learning record</p>
          <h2 id="continue-title">Saved progress is unavailable</h2>
          <p>Check the local app or database, then retry. Your saved records have not been cleared.</p>
          <button className="button button-outline" type="button" onClick={onRetry}><RefreshCw size={15} /> Try again</button>
        </div>
      ) : currentProject ? (
        <div className="continue-content">
          <div className="continue-main-copy">
            <p className="continue-kicker">
              {currentProject.status === "needs_review" ? "Review your project" : currentProject.status === "in_progress" ? "Resume your project" : currentProject.hasSavedDraft ? "Resume saved project work" : "Continue your project"}
              <span aria-hidden="true">·</span> Projects &amp; builds
            </p>
            <h2 id="continue-title">{currentProject.title}</h2>
            <p className="continue-context">{currentProject.status === "needs_review"
              ? "Review your saved notes and checkpoint evidence."
              : currentProject.checkpoint
                ? `${currentProject.checkpoint.id} · ${currentProject.checkpoint.label}`
                : "All checkpoints are self-reported. Review your saved work and prepare the handoff."}</p>
            <p className="continue-progress-copy">
              {currentProject.completedCheckpointCount} of {currentProject.totalCheckpointCount} checkpoints self-reported complete
              {currentProject.hasSavedDraft && <> <span aria-hidden="true">·</span> Draft saved</>}
            </p>
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={currentProject.status === "needs_review" || !currentProject.checkpoint
              ? `/projects/${currentProject.id}#project-review`
              : `/projects/${currentProject.id}#milestone-${currentProject.checkpoint.id}`}>
              {currentProject.status === "needs_review" || !currentProject.checkpoint ? "Review project" : currentProject.hasSavedDraft || currentProject.status === "in_progress" ? "Resume project" : "Continue project"}
              <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href="/projects">Browse all projects</Link>
          </div>
        </div>
      ) : currentLesson && currentModule ? (
        <div className="continue-content">
          <div className="continue-main-copy">
            <p className="continue-kicker">
              {currentLessonStatus === "needs_review" ? "Review this lesson" : currentLessonStatus === "in_progress" ? "Resume this lesson" : "Your next lesson"}
              <span aria-hidden="true">·</span> Module {String(currentLesson.moduleId).padStart(2, "0")}
            </p>
            <h2 id="continue-title">{currentLesson.title}</h2>
            <p className="continue-context">{currentModule.title}</p>
            <p className="continue-progress-copy">
              {requiresSignIn ? "Sign in when you want to save personal progress." : <>
                {lessonProgress?.completed ?? 0} of {lessonProgress?.total ?? currentModule.lessons.length} lessons marked complete
                {currentModuleStatus && <> <span aria-hidden="true">·</span> Module {formatStatus(currentModuleStatus).toLowerCase()}</>}
              </>}
            </p>
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={`/modules/${String(currentLesson.moduleId).padStart(2, "0")}/lessons/${currentLesson.id.toLowerCase()}`}>
              {currentLessonStatus === "needs_review" ? "Review lesson" : currentLessonStatus === "in_progress" ? "Resume lesson" : "Start lesson"}
              <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href="/roadmap">Browse the roadmap</Link>
          </div>
        </div>
      ) : currentActivity && activityModule ? (
        <div className="continue-content">
          <div className="continue-main-copy">
            <p className="continue-kicker">
              {currentActivityStatus === "needs_review" ? "Review this activity" : currentActivityStatus === "in_progress" ? "Resume this activity" : "Put your learning into practice"}
              <span aria-hidden="true">·</span> Module {String(activityModule.id).padStart(2, "0")}
            </p>
            <h2 id="continue-title">{currentActivity.title}</h2>
            <p className="continue-context">Practical activity for {activityModule.title}</p>
            <p className="continue-progress-copy">
              Activity {formatStatus(currentActivityStatus ?? "not_started").toLowerCase()}
              {currentActivityLessonProgress && <> <span aria-hidden="true">·</span> {currentActivityLessonProgress.completed} of {currentActivityLessonProgress.total} related lessons marked complete</>}
              {currentActivityModuleStatus && <> <span aria-hidden="true">·</span> Module {formatStatus(currentActivityModuleStatus).toLowerCase()}</>}
            </p>
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={`/activities/${currentActivity.id}`}>
              {currentActivityStatus === "needs_review" ? "Review activity" : currentActivityStatus === "in_progress" ? "Resume activity" : "Start activity"}
              <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href={`/modules/${String(activityModule.id).padStart(2, "0")}`}>View module overview</Link>
          </div>
        </div>
      ) : currentModule ? (
        <div className="continue-content">
          <div className="continue-main-copy">
            <p className="continue-kicker">Review your learning <span aria-hidden="true">·</span> Module {String(currentModule.id).padStart(2, "0")}</p>
            <h2 id="continue-title">{currentModule.title}</h2>
            <p className="continue-context">There are no unfinished lessons or activities in this module.</p>
            <p className="continue-progress-copy">Module {formatStatus(currentModuleStatus ?? "not_started").toLowerCase()}</p>
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={`/modules/${String(currentModule.id).padStart(2, "0")}`}>
              Open module overview <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href="/roadmap">Browse the roadmap</Link>
          </div>
        </div>
      ) : (
        <div className="continue-content">
          <p className="continue-kicker">Learning journey complete</p>
          <h2 id="continue-title">You’ve reached the end of the {totalModules}-module curriculum.</h2>
          <p className="continue-context">Review saved notes and evidence, or choose any topic to revisit.</p>
          <div className="continue-actions">
            <Link className="button button-continue" href="/progress">Open progress notebook <ArrowRight size={16} /></Link>
            <Link className="continue-secondary" href="/roadmap">Browse the roadmap</Link>
          </div>
        </div>
      )}
    </section>
  );
}

function NextItem({ item }: { item: DashboardNextItem }) {
  return (
    <Link className="next-item" href={item.href}>
      <span className="next-item-type">{item.type}</span>
      <span className="next-item-title">{item.title}</span>
      <span className="next-item-detail">{item.detail}</span>
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

function RecentWork({ items }: { items: DashboardRecentItem[] }) {
  return (
    <ul className="recent-list">
      {items.map((item) => <li key={item.id}>
        <Link className="recent-item" href={item.href}>
          <span className="recent-icon" aria-hidden="true">
            {item.detail.includes("complete") ? <CheckCircle2 size={16} /> : item.detail.includes("review") ? <Clock3 size={16} /> : <BookOpen size={16} />}
          </span>
          <span className="recent-copy"><strong>{item.title}</strong><span>{item.detail}</span></span>
          <time dateTime={new Date(item.date).toISOString()}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(item.date)}</time>
        </Link>
      </li>)}
    </ul>
  );
}

export function DashboardSidebar({
  model,
  loaded,
  loadError,
  requiresSignIn,
  totalModules,
  totalLessons,
}: {
  model: DashboardModel;
  loaded: boolean;
  loadError: boolean;
  requiresSignIn: boolean;
  totalModules: number;
  totalLessons: number;
}) {
  return (
    <aside className="dashboard-sidebar" aria-label="Saved progress and next steps">
      {loaded && !loadError && model.nextItems.length > 0 && <section className="sidebar-section" aria-labelledby="up-next-title">
        <div className="sidebar-section-heading">
          <div><h2 id="up-next-title">Up next</h2><p>A suggested step after your current focus.</p></div>
        </div>
        <div className="next-list">{model.nextItems.map((item) => <NextItem key={item.id} item={item} />)}</div>
      </section>}

      {loaded && !loadError && model.recentItems.length > 0 && <section className="sidebar-section" aria-labelledby="recent-work-title">
        <div className="sidebar-section-heading">
          <div><h2 id="recent-work-title">Recent work</h2><p>Saved learning records, newest first.</p></div>
          <Link className="section-link" href="/progress">View all <ArrowRight size={14} /></Link>
        </div>
        <RecentWork items={model.recentItems} />
      </section>}

      <section className="overall-progress" aria-labelledby="overall-progress-title">
        <div className="overall-progress-heading">
          <span className="overall-progress-icon"><BookOpen size={18} /></span>
          <div><h2 id="overall-progress-title">Curriculum progress</h2><p>Saved lesson, activity, and module statuses</p></div>
        </div>
        {requiresSignIn && loaded ? <p className="sidebar-empty"><Link href="/sign-in?returnTo=%2F">Sign in to view and save your private learning progress.</Link> Lessons remain open without an account.</p>
          : loaded && !loadError ? <div className="progress-summary-grid">
          <div className="progress-summary-stat"><strong>{model.completedModules}<span>/{totalModules}</span></strong><span>modules marked complete</span></div>
          <div className="progress-summary-stat"><strong>{model.completedLessons}<span>/{totalLessons}</span></strong><span>lessons marked complete</span></div>
          <div className="progress-summary-stat"><strong>{model.completedActivities}<span>/{model.totalActivities}</span></strong><span>activities marked complete</span></div>
        </div> : <p className="sidebar-empty">{loadError ? "Saved progress could not be loaded." : "Loading saved progress…"}</p>}
        {loaded && !loadError && !requiresSignIn && <Link className="section-link overall-view-link" href="/progress">Open progress notebook <ArrowRight size={14} /></Link>}
      </section>
    </aside>
  );
}
