"use client";

import { useMemo } from "react";
import { useProgressList } from "@/features/progress/progress-list-context";
import { buildDashboardModel, type DashboardActivity, type DashboardMajorProject, type DashboardModule, type DashboardSmallProject } from "@/features/dashboard/model";
import { ContinueLearningPanel, DashboardSidebar } from "@/features/dashboard/dashboard-panels";
import { AuthUnavailableNotice } from "@/features/auth/auth-unavailable-notice";
import { ProgressAccountChangedNotice } from "@/features/progress/progress-account-changed-notice";

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
  const { records, loaded, loadError, requiresSignIn, accountChanged, sessionUnavailable, retry } = useProgressList();

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
  function retryProgress() {
    retry();
  }

  return (
    <>
      <header className="dashboard-heading">
        <h1>My learning</h1>
        <p>Learn a concept, practice it in an activity, then save evidence you can revisit as you build.</p>
      </header>
      {sessionUnavailable && <AuthUnavailableNotice message="Your account could not be checked. Saved progress stays hidden until the account service responds." onRetry={retry} />}
      {accountChanged && <ProgressAccountChangedNotice />}

      <div className="dashboard-layout">
        <section className="dashboard-center" aria-label="Learning dashboard">
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
            currentActivityModule={currentActivityModule}
            currentActivityModuleStatus={currentActivityModuleStatus}
            currentActivityLessonProgress={currentActivityModule ? model.lessonProgressByModule.get(`M${String(currentActivityModule.id).padStart(2, "0")}`) : undefined}
            currentProject={model.currentProject}
            totalModules={modules.length}
            onRetry={retryProgress}
          />
        </section>
        <DashboardSidebar
          model={model}
          loaded={loaded}
          loadError={loadError}
          requiresSignIn={requiresSignIn}
          totalModules={modules.length}
          totalLessons={model.totalLessons}
        />
      </div>
    </>
  );
}
