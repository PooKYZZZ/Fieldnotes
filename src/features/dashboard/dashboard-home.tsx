"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { curriculumPhaseNames } from "@/content/taxonomy";
import { useProgressList } from "@/features/progress/progress-list-context";
import { buildDashboardModel, type DashboardActivity, type DashboardMajorProject, type DashboardModule, type DashboardSmallProject } from "@/features/dashboard/model";
import { ContinueLearningPanel, DashboardProgress, DashboardSidebar } from "@/features/dashboard/dashboard-panels";
import { progressAccountHeaders } from "@/features/progress/progress-draft";
import { AuthUnavailableNotice } from "@/features/auth/auth-unavailable-notice";
import { useAuthSession } from "@/features/auth/auth-session-context";
import { ProgressAccountChangedNotice } from "@/features/progress/progress-account-changed-notice";

type ActivityResume = { label: string; hash: string };

function useActivityResume(activity: DashboardActivity | undefined, revision: number | undefined, userId: string | undefined) {
  const [result, setResult] = useState<{ key: string; resume: ActivityResume }>();
  const key = activity && userId && revision !== undefined ? `${userId}:${activity.id}:${revision}` : undefined;
  useEffect(() => {
    if (!key || !userId || !activity?.resumeTasks?.length) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ itemType: "activity", itemId: activity.id });
    void fetch(`/api/progress?${query}`, { cache: "no-store", headers: progressAccountHeaders(userId), signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data: unknown = await response.json();
        const record: unknown = Array.isArray(data) ? data[0] : undefined;
        if (controller.signal.aborted || !record || typeof record !== "object" || !("itemId" in record)
          || record.itemId !== activity.id || !("revision" in record) || record.revision !== revision) return;
        const observations = "taskObservations" in record ? record.taskObservations : undefined;
        const task = activity.resumeTasks?.find(({ id }) => {
          const value: unknown = observations && typeof observations === "object" ? Reflect.get(observations, id) : undefined;
          return typeof value !== "string" || !value.trim();
        });
        setResult({ key, resume: task ? { label: task.title, hash: `#activity-task-${task.id}` } : { label: "Review your recorded observations", hash: "#activity-record" } });
      })
      .catch(() => { /* The activity link remains usable if the preview cannot be loaded. */ });
    return () => controller.abort();
  }, [activity, key, revision, userId]);
  return result?.key === key ? result?.resume : undefined;
}

export function DashboardHome({
  modules,
  activities,
  majorProjects,
  smallProjects,
}: {
  modules: DashboardModule[];
  activities: DashboardActivity[];
  majorProjects: DashboardMajorProject[];
  smallProjects: DashboardSmallProject[];
}) {
  const session = useAuthSession();
  const { records, loaded, loadError, requiresSignIn, accountChanged, sessionUnavailable, retry } = useProgressList();
  const personalized = session.status === "signed-in" && !requiresSignIn;

  const model = useMemo(
    () => buildDashboardModel(modules, activities, majorProjects, smallProjects, records),
    [modules, activities, majorProjects, smallProjects, records],
  );
  const currentActivityModule = model.currentActivity
    ? modules.find((module) => module.id === model.currentActivity?.moduleId)
    : undefined;
  const currentActivityModuleStatus = currentActivityModule
    ? model.statusByModule.get(`M${String(currentActivityModule.id).padStart(2, "0")}`) ?? "not_started"
    : undefined;
  const savedActivity = !loadError && !accountChanged && records.find((record) =>
    record.itemType === "activity" && record.itemId === model.currentActivity?.id && record.hasContent);
  const activityResume = useActivityResume(
    model.currentProject ? undefined : model.currentActivity,
    savedActivity ? savedActivity.revision : undefined,
    session.userId,
  );
  function retryProgress() {
    retry();
  }

  return (
    <div className={personalized ? undefined : "public-home"}>
      <header className={personalized ? "dashboard-heading dashboard-heading--personal" : "dashboard-heading"}>
        <h1>{personalized ? "My learning" : "Learn DevOps"}</h1>
        <p>{personalized
          ? "Pick up where you left off and review the work you’ve saved."
          : "Start with Linux and networking, then learn to deploy, troubleshoot, and recover real systems through hands-on practice."}</p>
      </header>
      {sessionUnavailable && <AuthUnavailableNotice message="Your account could not be checked. Saved progress stays hidden until the account service responds." onRetry={retry} />}
      {accountChanged && <ProgressAccountChangedNotice />}

      <div className={personalized ? "dashboard-layout" : "dashboard-layout dashboard-layout--public"}>
        <section className="dashboard-center" aria-label={personalized ? "Learning dashboard" : "Start learning"}>
          <ContinueLearningPanel
            loaded={loaded}
            loadError={loadError && !sessionUnavailable && !accountChanged}
            requiresSignIn={requiresSignIn}
            currentModule={model.currentModule}
            currentModuleStatus={model.currentModuleStatus}
            currentLesson={model.currentLesson}
            currentLessonStatus={model.currentLessonStatus}
            lessonProgress={model.currentModule ? model.lessonProgressByModule.get(`M${String(model.currentModule.id).padStart(2, "0")}`) : undefined}
            currentActivity={model.currentActivity}
            currentActivityStatus={model.currentActivityStatus}
            activityResume={activityResume}
            hasSavedActivity={Boolean(savedActivity)}
            currentActivityModule={currentActivityModule}
            currentActivityModuleStatus={currentActivityModuleStatus}
            currentActivityLessonProgress={currentActivityModule ? model.lessonProgressByModule.get(`M${String(currentActivityModule.id).padStart(2, "0")}`) : undefined}
            currentProject={model.currentProject}
            totalModules={modules.length}
            onRetry={retryProgress}
          />
          {personalized && <DashboardProgress model={model} loaded={loaded} loadError={loadError} totalModules={modules.length} />}
          {!personalized && <Link className="home-lab-link" href="/guide#lab-readiness">Prepare your first lab <ArrowRight size={15} aria-hidden="true" /></Link>}
          <section className="dashboard-curriculum" aria-labelledby="dashboard-curriculum-title">
            <header className="dashboard-section-heading">
              <h2 id="dashboard-curriculum-title">The curriculum</h2>
              <span>{modules.length} modules</span>
            </header>
            <ol className="dashboard-chapters">
              {curriculumPhaseNames.map((phase, index) => {
                const count = modules.filter((module) => module.phase === phase).length;
                if (!count) return null;
                return (
                  <li key={phase}>
                    <Link href={`/roadmap?phase=${encodeURIComponent(phase)}`}>
                      <span className="dashboard-chapter-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <span className="dashboard-chapter-name">{phase}</span>
                      <span className="dashboard-chapter-count">{count} modules</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        </section>
        {personalized && <DashboardSidebar
          model={model}
          loaded={loaded}
          loadError={loadError}
        />}
      </div>
    </div>
  );
}
