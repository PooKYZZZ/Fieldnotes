import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Clock3, FlaskConical, RefreshCw } from "lucide-react";
import { formatStatus, type ProgressStatus } from "@/features/progress/model";
import type { DashboardActivity, DashboardModel, DashboardModule, DashboardNextItem, DashboardRecentItem, ModuleStatus } from "@/features/dashboard/model";

type ContinueLearningPanelProps = {
  loaded: boolean;
  loadError: boolean;
  currentModule?: DashboardModule;
  currentModuleStatus?: ProgressStatus;
  currentLesson?: DashboardModule["lessons"][number] & { moduleId: number };
  currentLessonStatus?: ProgressStatus;
  lessonProgress?: { completed: number; total: number };
  currentActivity?: DashboardActivity;
  currentActivityStatus?: ProgressStatus;
  currentActivityModule?: DashboardModule;
  currentActivityModuleStatus?: ModuleStatus;
  currentActivityLessonProgress?: { completed: number; total: number };
  currentModuleActivityStatus?: ProgressStatus;
  totalModules: number;
  onRetry: () => void;
};

export function ContinueLearningPanel({
  loaded,
  loadError,
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
  currentModuleActivityStatus,
  totalModules,
  onRetry,
}: ContinueLearningPanelProps) {
  const activityModule = currentActivityModule ?? currentModule;
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
      ) : currentLesson && currentModule ? (
        <div className="continue-content">
          <div className="continue-main-copy">
            <p className="continue-kicker">{currentLessonStatus === "needs_review" ? "Review this lesson" : currentLessonStatus === "in_progress" ? "Resume your lesson" : "Next lesson"}<span aria-hidden="true">·</span> Module {String(currentLesson.moduleId).padStart(2, "0")}</p>
            <h2 id="continue-title">{currentLesson.title}</h2>
            <p className="continue-next-lesson">{currentModule.title}</p>
            <p className="continue-progress-copy">
              Lesson: {formatStatus(currentLessonStatus ?? "not_started")} · {lessonProgress?.completed ?? 0} of {lessonProgress?.total ?? currentModule.lessons.length} lesson records marked complete · Module: {formatStatus(currentModuleStatus ?? "not_started")}
            </p>
            <p className="continue-progress-copy">Activity {currentModule.activityId}: {formatStatus(currentModuleActivityStatus ?? "not_started")}{currentActivity?.id === currentModule.activityId && currentActivityStatus && <> · <Link href={`/activities/${currentActivity.id}`}>Continue activity</Link></>}</p>
            {currentActivity && currentActivityStatus && currentActivity.id !== currentModule.activityId && <p className="continue-progress-copy">Activity {currentActivity.id}: {formatStatus(currentActivityStatus)} · <Link href={`/activities/${currentActivity.id}`}>Continue activity</Link></p>}
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={`/modules/${String(currentLesson.moduleId).padStart(2, "0")}/lessons/${currentLesson.id.toLowerCase()}`}>
              {currentLessonStatus === "needs_review" ? "Review lesson" : currentLessonStatus === "in_progress" ? "Resume lesson" : "Open lesson"}
              <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href={`/modules/${String(currentLesson.moduleId).padStart(2, "0")}`}>View module details</Link>
          </div>
        </div>
      ) : currentActivity && activityModule ? (
        <div className="continue-content">
          <div className="continue-main-copy">
            <p className="continue-kicker">{currentActivityStatus === "needs_review" ? "Review your activity" : "Resume your activity"}<span aria-hidden="true">·</span> Module {String(activityModule.id).padStart(2, "0")}</p>
            <h2 id="continue-title">{currentActivity.title}</h2>
            <p className="continue-next-lesson">Activity for {activityModule.title}</p>
            <p className="continue-progress-copy">
              Activity: {formatStatus(currentActivityStatus ?? "in_progress")} · Module: {formatStatus(currentActivityModuleStatus ?? currentModuleStatus ?? "not_started")}
            </p>
            <p className="continue-progress-copy">Lesson records: {currentActivityLessonProgress?.completed ?? 0} of {currentActivityLessonProgress?.total ?? activityModule.lessons.length} marked complete</p>
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={`/activities/${currentActivity.id}`}>
              {currentActivityStatus === "needs_review" ? "Review activity" : "Resume activity"}
              <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href={`/modules/${String(activityModule.id).padStart(2, "0")}`}>View module details</Link>
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
            <p className="continue-next-lesson">{currentModule.lessons.length} {currentModule.lessons.length === 1 ? "lesson" : "lessons"} in this module</p>
            <p className="continue-progress-copy">
              Lesson records: {lessonProgress?.completed ?? 0} of {lessonProgress?.total ?? currentModule.lessons.length} marked complete · Module: {formatStatus(currentModuleStatus ?? "not_started")}
            </p>
            <p className="continue-progress-copy">Activity {currentModule.activityId}: {formatStatus(currentModuleActivityStatus ?? "not_started")}</p>
          </div>
          <div className="continue-actions">
            <Link className="button button-continue" href={`/modules/${String(currentModule.id).padStart(2, "0")}`}>
              {lessonProgress && lessonProgress.completed >= lessonProgress.total ? "Open module overview" : currentModuleStatus === "in_progress" ? "Resume lesson" : currentModuleStatus === "needs_review" ? "Review lesson" : "Start learning"}
              <ArrowRight size={16} />
            </Link>
            <Link className="continue-secondary" href={lessonProgress && lessonProgress.completed >= lessonProgress.total ? "/progress" : `/modules/${String(currentModule.id).padStart(2, "0")}`}>
              {lessonProgress && lessonProgress.completed >= lessonProgress.total ? "View progress notebook" : "View module details"}
            </Link>
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
  totalLessons,
  phaseCounts,
}: {
  model: DashboardModel;
  loaded: boolean;
  loadError: boolean;
  totalModules: number;
  totalLessons: number;
  phaseCounts: PhaseCount[];
}) {
  const completePercent = totalModules ? Math.round((model.completedModules / totalModules) * 100) : 0;
  const lessonPercent = totalLessons ? Math.round((model.completedLessons / totalLessons) * 100) : 0;
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
          <div className="overall-count"><strong>{model.completedLessons}</strong><span>of {totalLessons} lesson records marked complete</span></div>
          <div className="overall-progress-track" role="progressbar" aria-label="Lesson records marked complete" aria-valuemin={0} aria-valuemax={totalLessons} aria-valuenow={model.completedLessons}><span style={{ width: `${lessonPercent}%` }} /></div>
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
