"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Cloud, Search, SearchX, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ModuleSummary } from "@/content/catalog";
import type { CurriculumPhase } from "@/content/taxonomy";
import { ModuleCard } from "@/features/roadmap/module-card";
import type { ProgressStatus } from "@/features/progress/model";

type RoadmapEntry = {
  module: ModuleSummary;
  status: ProgressStatus | undefined;
  activityCount: number;
  completedActivityCount: number;
};

type RoadmapPhase = { name: CurriculumPhase; range: string };
type StatusFilter = ProgressStatus | "all";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All progress" },
  { value: "in_progress", label: "In progress" },
  { value: "needs_review", label: "Needs review" },
  { value: "completed", label: "Completed" },
  { value: "not_started", label: "Not started" },
];

const phaseIcons: Record<CurriculumPhase, LucideIcon> = {
  Foundations: BookOpen,
  "Infrastructure & Cloud": Cloud,
  "Operations & Security": Shield,
};

export function RoadmapExplorer({
  modules,
  phases,
  progressAvailable,
}: {
  modules: RoadmapEntry[];
  phases: RoadmapPhase[];
  progressAvailable: boolean;
}) {
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<CurriculumPhase | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredModules = useMemo(() => modules.filter(({ module, status }) => {
    const searchableText = [module.id, module.title, module.intro].join(" ").toLocaleLowerCase();
    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
    const matchesPhase = phaseFilter === "all" || module.phase === phaseFilter;
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesQuery && matchesPhase && matchesStatus;
  }), [modules, normalizedQuery, phaseFilter, statusFilter]);
  const anyFilter = Boolean(normalizedQuery) || phaseFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setQuery("");
    setPhaseFilter("all");
    setStatusFilter("all");
  }

  return (
    <>
      <section className="roadmap-filter-panel" aria-label="Find roadmap modules">
        <label className="roadmap-search search-wrap">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search modules by title or topic</span>
          <input
            className="form-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or topic"
          />
        </label>
        <div className="roadmap-select">
          <label htmlFor="roadmap-phase-filter">Phase</label>
          <select id="roadmap-phase-filter" value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value as CurriculumPhase | "all")}>
            <option value="all">All phases</option>
            {phases.map((phase) => <option key={phase.name} value={phase.name}>{phase.name}</option>)}
          </select>
        </div>
        <div className="roadmap-select">
          <label htmlFor="roadmap-progress-filter">Progress</label>
          <select
            id="roadmap-progress-filter"
            value={statusFilter}
            disabled={!progressAvailable}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        {!progressAvailable && <p className="roadmap-progress-unavailable" role="status">Progress filters are unavailable while saved records cannot be read.</p>}
        <div className="roadmap-filter-footer">
          <p className="roadmap-result-count" aria-live="polite">Showing {filteredModules.length} of {modules.length} modules</p>
          {anyFilter && <button className="roadmap-clear-filters" type="button" onClick={clearFilters}>Clear filters</button>}
        </div>
      </section>

      {filteredModules.length ? phases.map((phase) => {
        const phaseModules = filteredModules.filter(({ module }) => module.phase === phase.name);
        if (!phaseModules.length) return null;
        const Icon = phaseIcons[phase.name];
        const phaseId = "phase-" + phase.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return (
          <section className="roadmap-phase" key={phase.name} aria-labelledby={phaseId}>
            <div className="section-heading">
              <div className="phase-banner">
                <span className="phase-number"><Icon size={18} aria-hidden="true" /></span>
                <div className="phase-banner-copy">
                  <h2 id={phaseId}>{phase.name}<span>{phase.range}</span></h2>
                </div>
                <span className="phase-module-count">{phaseModules.length} {phaseModules.length === 1 ? "module" : "modules"}</span>
              </div>
            </div>
            <div className="module-grid">
              {phaseModules.map(({ module, status, activityCount, completedActivityCount }) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  status={status}
                  activityCount={activityCount}
                  completedActivityCount={completedActivityCount}
                />
              ))}
            </div>
          </section>
        );
      }) : (
        <div className="roadmap-empty" role="status">
          <SearchX size={25} aria-hidden="true" />
          <div><h2>No modules match these filters.</h2><p>Clear the filters to browse the full learning pathway.</p></div>
          <button className="button button-outline" type="button" onClick={clearFilters}>Clear filters <ArrowRight size={14} /></button>
        </div>
      )}
      <p className="roadmap-completion-note">Progress reflects saved module and activity records. It is a learning log, not an assessment of mastery.</p>
      <p className="roadmap-activity-link"><Link href="/activities">Browse all activities <ArrowRight size={14} aria-hidden="true" /></Link></p>
    </>
  );
}
