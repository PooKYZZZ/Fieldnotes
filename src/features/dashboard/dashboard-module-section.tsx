"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { ModuleCard } from "@/features/roadmap/module-card";
import type { ProgressRecord } from "@/features/progress/model";
import { buildDashboardModel, statusForModule, type DashboardActivity, type DashboardModule, type ModuleStatus } from "@/features/dashboard/model";

const filters = [
  { id: "all", label: "All modules" },
  { id: "in_progress", label: "In progress" },
  { id: "needs_review", label: "Needs review" },
  { id: "completed", label: "Completed" },
  { id: "not_started", label: "Not started" },
] as const;
type ModuleFilter = (typeof filters)[number]["id"];

function matchesFilter(status: ModuleStatus, filter: ModuleFilter): boolean {
  return filter === "all" || status === filter;
}

export function DashboardModuleSection({
  modules,
  activities,
  records,
  model,
  loaded,
  loadError,
  onRetry,
}: {
  modules: DashboardModule[];
  activities: DashboardActivity[];
  records: ProgressRecord[];
  model: ReturnType<typeof buildDashboardModel>;
  loaded: boolean;
  loadError: boolean;
  onRetry: () => void;
}) {
  const [filter, setFilter] = useState<ModuleFilter>("all");
  const filteredModules = useMemo(() => modules.filter((module) => {
    if (!loaded || loadError) return filter === "all";
    return matchesFilter(statusForModule(model, module.id), filter);
  }), [filter, loadError, loaded, model, modules]);
  const prioritizedModules = useMemo(() => {
    if (!model.currentModule) return filteredModules;
    return [...filteredModules].sort((left, right) => {
      if (left.id === model.currentModule?.id) return -1;
      if (right.id === model.currentModule?.id) return 1;
      return left.id - right.id;
    });
  }, [filteredModules, model.currentModule]);
  const visibleModules = prioritizedModules.slice(0, 6);
  const completedActivityIds = new Set(records.filter((record) => record.itemType === "activity" && record.status === "completed").map((record) => record.itemId));

  return (
    <section className="module-section" aria-labelledby="my-modules-title">
      <div className="module-section-heading">
        <div><h2 id="my-modules-title">My modules</h2><p>Explore the roadmap and see what you have learned.</p></div>
        <Link className="section-link" href="/roadmap">View all {modules.length} <ArrowRight size={15} /></Link>
      </div>
      <div className="module-filter-row" role="group" aria-label="Filter modules by progress">
        {filters.map((option) => {
          const count = loadError || !loaded
            ? undefined
            : option.id === "all"
              ? modules.length
              : modules.filter((module) => matchesFilter(statusForModule(model, module.id), option.id)).length;
          return <button
            className="module-filter"
            type="button"
            key={option.id}
            aria-pressed={filter === option.id}
            disabled={loadError || !loaded}
            onClick={() => setFilter(option.id)}
          >{option.label}{count === undefined ? "" : <span>{count}</span>}</button>;
        })}
      </div>

      {loadError && <p className="dashboard-inline-error" role="status">Progress-based module filters are unavailable until saved data can be loaded.</p>}
      {loaded && !loadError && filteredModules.length === 0 ? (
        <div className="dashboard-empty-filter" role="status">
          <h3>No modules match this filter yet.</h3>
          <p>{filter === "completed" ? "Modules appear here after you explicitly mark them complete." : filter === "needs_review" ? "Modules marked for review will appear here." : "Try another progress filter or browse the full roadmap."}</p>
          <Link href="/roadmap">Open the roadmap <ArrowRight size={14} /></Link>
        </div>
      ) : (
        <div className="module-grid dashboard-module-grid">
          {visibleModules.map((module) => {
            const linkedActivities = activities.filter((activity) => activity.moduleId === module.id);
            const done = linkedActivities.filter((activity) => completedActivityIds.has(activity.id)).length;
            return <ModuleCard
              key={module.id}
              module={module}
              status={loaded && !loadError ? statusForModule(model, module.id) : undefined}
              activityCount={linkedActivities.length}
              completedActivityCount={done}
            />;
          })}
        </div>
      )}
      {filteredModules.length > visibleModules.length && <p className="module-showing-count">Showing {visibleModules.length} of {filteredModules.length} matching modules. <Link href="/roadmap">Browse all matching modules in the roadmap.</Link></p>}
      {loadError && <button className="button button-outline" type="button" onClick={onRetry}><RefreshCw size={14} /> Retry progress</button>}
    </section>
  );
}
