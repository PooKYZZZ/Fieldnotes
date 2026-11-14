import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Clock3, FlaskConical, RefreshCw } from "lucide-react";
import { formatStatus, type ProgressStatus } from "@/features/progress/model";
import type { ModuleStepProgress } from "@/features/progress/module-progress";
import type { DashboardActivity, DashboardModel, DashboardModule, DashboardNextItem, DashboardRecentItem } from "@/features/dashboard/model";

type ContinueLearningPanelProps = {
  loaded: boolean;
  loadError: boolean;
  currentModule?: DashboardModule;
  currentModuleStatus?: ProgressStatus;
  currentActivity?: DashboardActivity;
  currentActivityStatus?: ProgressStatus;
  currentModuleProgress?: ModuleStepProgress;
  totalModules: number;
  onRetry: () => void;
};

export function ContinueLearningPanel({
  loaded,
  loadError,
  currentModule,
  currentModuleStatus,
  currentActivity,
  currentActivityStatus,
  currentModuleProgress,
  totalModules,
  onRetry,
}: ContinueLearningPanelProps) {
  return (
    <section className="continue-panel" aria-labelledby="continue-title">
      {!loaded ? (
        <div className="continue-loading" role="status">Loading your saved learning progress…</div>
      ) : loadError ? (
        <div className="continue-content continue-unavailable">
          <p className="continue-kicker">Your progress</p>
          <h2 id="continue-title">Saved progress is unavailable</h2>
          <p>Check the local app or database, then retry. Your saved records have not been cleared.</p>
          <button className="button button-outline" type="button" onClick={onRetry}><RefreshCw size={15} /> Try again</button>
        </div>
      ) : currentActivity && currentModule ? (
        <div className="continue-content">
          <div className="continue-main-copy">
            <p className="continue-kicker">{currentActivityStatus === "needs_review" ? "Review your activity" : "Resume your activity"}<span aria-hidden="true">·</span> Module {String(currentModule.id).padStart(2, "0")}</p>
            <h2 id="continue-title">{currentActivity.title}</h2>
            <p className="continue-next-lesson">Activity for {currentModule.title}</p>
            <p className="continue-progress-copy">
              {formatStatus(currentActivityStatus ?? "in_progress")} · {currentModuleProgress?.completedSteps ?? 0} of {currentModuleProgress?.totalSteps ?? 0} saved records marked complete
            </p>
            {currentModuleProgress && <div className="continue-progress-track" role="progressbar" aria-label="Current module saved-record completion" aria-valuemin={0} aria-valuemax={currentModuleProgress.totalSteps} aria-valuenow={currentModuleProgress.completedSteps} aria-valuetext={`${currentModuleProgress.completedSteps} of ${currentModuleProgress.totalSteps} saved records marked complete (${currentModuleProgress.percent}%).`}>
              <span style={{ width: `${currentModuleProgress.percent}%` }} />
            </div>}
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={`/activities/${currentActivity.id}`}>
              {currentActivityStatus === "needs_review" ? "Review activity" : "Resume activity"}
              <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href={`/modules/${String(currentModule.id).padStart(2, "0")}`}>View module details</Link>
          </div>
        </div>
      ) : currentModule ? (
        <div className="continue-content">
          <div className="continue-main-copy">
            <p className="continue-kicker">
              {currentModuleStatus === "in_progress" || currentModuleStatus === "needs_review" ? "Pick up where you left off" : "Start your learning journey"}
              <span aria-hidden="true">·</span> Module {String(currentModule.id).padStart(2, "0")}
            </p>
            <h2 id="continue-title">{currentModule.title}</h2>
            <p className="continue-next-lesson">Lesson: {currentModule.lessons[0]?.title ?? currentModule.title}</p>
            <p className="continue-progress-copy">
              {formatStatus(currentModuleStatus ?? "not_started")} · {currentModuleProgress?.completedSteps ?? 0} of {currentModuleProgress?.totalSteps ?? 0} saved records marked complete
            </p>
            {currentModuleProgress && <div className="continue-progress-track" role="progressbar" aria-label="Current module saved-record completion" aria-valuemin={0} aria-valuemax={currentModuleProgress.totalSteps} aria-valuenow={currentModuleProgress.completedSteps} aria-valuetext={`${currentModuleProgress.completedSteps} of ${currentModuleProgress.totalSteps} saved records marked complete (${currentModuleProgress.percent}%).`}>
              <span style={{ width: `${currentModuleProgress.percent}%` }} />
            </div>}
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={`/modules/${String(currentModule.id).padStart(2, "0")}`}>
              {currentModuleStatus === "in_progress" ? "Resume lesson" : currentModuleStatus === "needs_review" ? "Review lesson" : "Start learning"}
              <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href={`/modules/${String(currentModule.id).padStart(2, "0")}`}>View module details</Link>
          </div>
        </div>
      ) : (
        <div className="continue-content">
          <p className="continue-kicker">Learning journey complete</p>
          <h2 id="continue-title">All {totalModules} modules are marked complete.</h2>
          <p>Review your notes and evidence, or choose a module to revisit.</p>
          <Link className="button button-continue" href="/progress">Review your progress <ArrowRight size={16} /></Link>
        </div>
      )}
    </section>
  );
}

type PhaseCount = { phase: string; total: number; completed: number };

function NextItem({ item, index }: { item: DashboardNextItem; index: number }) {
  return (
    <Link className={`next-item next-item--${index % 3}`} href={item.href}>
      <span className="next-item-type">{item.type}</span>
      <span className="next-item-title">{item.title}</span>
      <span className="next-item-detail">{item.detail}</span>
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

function RecentWork({ items, loaded, loadError }: { items: DashboardRecentItem[]; loaded: boolean; loadError: boolean }) {
  if (!loaded) return <p className="sidebar-empty">Loading recent work…</p>;
  if (loadError) return <p className="sidebar-empty">Recent work is unavailable until saved progress loads.</p>;
  if (!items.length) return <p className="sidebar-empty">Your notes and completed work will appear here after you save a record.</p>;

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
  totalModules,
  phaseCounts,
}: {
  model: DashboardModel;
  loaded: boolean;
  loadError: boolean;
  totalModules: number;
  phaseCounts: PhaseCount[];
}) {
  const completePercent = totalModules ? Math.round((model.completedModules / totalModules) * 100) : 0;
  const activePhase = model.currentModule?.phase;

  return (
    <aside className="dashboard-sidebar" aria-label="Learning tasks and progress">
      <section className="sidebar-section" aria-labelledby="up-next-title">
        <div className="sidebar-section-heading">
          <div><h2 id="up-next-title">Up next</h2><p>Your next steps, without deadlines.</p></div>
          {loaded && !loadError && <span className="todo-count">{model.nextItems.length} {model.nextItems.length === 1 ? "item" : "items"}</span>}
        </div>
        {!loaded ? <p className="sidebar-empty">Loading your next steps…</p>
          : loadError ? <p className="sidebar-empty">Next steps are unavailable until saved progress loads.</p>
            : model.nextItems.length ? <div className="next-list">{model.nextItems.map((item, index) => <NextItem key={item.id} item={item} index={index} />)}</div>
              : <p className="sidebar-empty">{model.currentModuleStatus === "not_started"
                ? "Start with the lesson in Continue learning. Its matching activity appears here once you begin the module."
                : "No unfinished activity or started project milestones are waiting."}</p>}
      </section>

      <section className="sidebar-section recent-section" aria-labelledby="recent-work-title">
        <div className="sidebar-section-heading">
          <div><h2 id="recent-work-title">Recent work</h2><p>Latest saved learning records.</p></div>
          {model.recentItems.length > 0 && <Link className="section-link" href="/progress">View all <ArrowRight size={14} /></Link>}
        </div>
        <RecentWork items={model.recentItems} loaded={loaded} loadError={loadError} />
      </section>

      <section className="overall-progress" aria-labelledby="overall-progress-title">
        <div className="overall-progress-heading"><span className="overall-progress-icon"><FlaskConical size={18} /></span><div><h2 id="overall-progress-title">Overall progress</h2><p>{loadError ? "Unable to read saved status" : activePhase ?? "Your self-paced journey"}</p></div></div>
        {loaded && !loadError ? <>
          <div className="overall-count"><strong>{model.completedModules}</strong><span>of {totalModules} modules completed</span></div>
          <div className="overall-progress-track" role="progressbar" aria-label="Overall learning journey completion" aria-valuemin={0} aria-valuemax={totalModules} aria-valuenow={model.completedModules}><span style={{ width: `${completePercent}%` }} /></div>
          <div className="phase-progress-list">
            {phaseCounts.map(({ phase, total, completed }) => <div className="phase-progress-row" key={phase}>
              <span>{phase}</span><span>{completed}/{total}</span>
              <div className="phase-progress-track"><span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} /></div>
            </div>)}
          </div>
        </> : <p className="sidebar-empty">Progress totals will appear when the database is available.</p>}
        <Link className="section-link overall-view-link" href="/progress">Open progress notebook <ArrowUpRight size={14} /></Link>
      </section>
    </aside>
  );
}
