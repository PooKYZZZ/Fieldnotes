"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProgressRecord } from "@/features/progress/model";
import { buildDashboardModel, type DashboardActivity, type DashboardMajorProject, type DashboardModule, type DashboardSmallProject } from "@/features/dashboard/model";
import { ContinueLearningPanel, DashboardSidebar } from "@/features/dashboard/dashboard-panels";

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
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const loadProgress = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/progress", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (response.status === 401) {
          setRequiresSignIn(true);
          setRecords([]);
          setLoadError(false);
          return [] as ProgressRecord[];
        }
        if (!response.ok) throw new Error("Could not load saved progress.");
        setRequiresSignIn(false);
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        setRecords(rows);
        setLoadError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRequiresSignIn(false);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cancelLoad = loadProgress();
    window.addEventListener("progress-updated", loadProgress);
    return () => {
      cancelLoad();
      window.removeEventListener("progress-updated", loadProgress);
    };
  }, [loadProgress, loadAttempt]);

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
    setLoaded(false);
    setLoadError(false);
    setLoadAttempt((attempt) => attempt + 1);
  }

  return (
    <>
      <header className="dashboard-heading">
        <h1>My learning</h1>
        <p>Learn a concept, practice it in an activity, then save evidence you can revisit as you build.</p>
      </header>

      <div className="dashboard-layout">
        <section className="dashboard-center" aria-label="Learning dashboard">
          <ContinueLearningPanel
            loaded={loaded}
            loadError={loadError}
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
