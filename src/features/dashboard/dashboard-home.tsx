"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProgressRecord } from "@/features/progress/model";
import { summarizeModuleProgress } from "@/features/progress/module-progress";
import { curriculumPhaseNames } from "@/content/taxonomy";
import { buildDashboardModel, type DashboardActivity, type DashboardMajorProject, type DashboardModule, type DashboardSmallProject } from "@/features/dashboard/model";
import { ContinueLearningPanel, DashboardSidebar } from "@/features/dashboard/dashboard-panels";
import { DashboardModuleSection } from "@/features/dashboard/dashboard-module-section";

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
  const [loadAttempt, setLoadAttempt] = useState(0);

  const loadProgress = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/progress", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load saved progress.");
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        setRecords(rows);
        setLoadError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
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
  const currentModuleProgress = useMemo(() => {
    if (!model.currentModule) return undefined;
    const linkedActivities = activities.filter((activity) => activity.moduleId === model.currentModule?.id);
    const linkedActivityIds = new Set(linkedActivities.map((activity) => activity.id));
    const completedActivities = records.filter((record) =>
      record.itemType === "activity"
      && record.status === "completed"
      && linkedActivityIds.has(record.itemId),
    ).length;
    return summarizeModuleProgress(model.currentModuleStatus, linkedActivities.length, completedActivities);
  }, [activities, model.currentModule, model.currentModuleStatus, records]);
  const phaseCounts = useMemo(() => curriculumPhaseNames.map((phase) => {
    const phaseModules = modules.filter((module) => module.phase === phase);
    return {
      phase,
      total: phaseModules.length,
      completed: phaseModules.filter((module) => model.statusByModule.get(`M${String(module.id).padStart(2, "0")}`) === "completed").length,
    };
  }), [modules, model.statusByModule]);

  function retryProgress() {
    setLoaded(false);
    setLoadError(false);
    setLoadAttempt((attempt) => attempt + 1);
  }

  return (
    <>
      <header className="dashboard-heading">
        <h1>My learning</h1>
      </header>

      <div className="dashboard-layout">
        <main className="dashboard-center" aria-label="Learning dashboard">
          <ContinueLearningPanel
            loaded={loaded}
            loadError={loadError}
            currentModule={model.currentModule}
            currentModuleStatus={model.currentModuleStatus}
            currentActivity={model.currentActivity}
            currentActivityStatus={model.currentActivityStatus}
            currentModuleProgress={currentModuleProgress}
            totalModules={modules.length}
            onRetry={retryProgress}
          />
          <DashboardModuleSection
            modules={modules}
            activities={activities}
            records={records}
            model={model}
            loaded={loaded}
            loadError={loadError}
            onRetry={retryProgress}
          />
        </main>
        <DashboardSidebar
          model={model}
          loaded={loaded}
          loadError={loadError}
          totalModules={modules.length}
          phaseCounts={phaseCounts}
        />
      </div>
    </>
  );
}
