"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, Cloud, Search, SearchX, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ModuleSummary } from "@/content/catalog";
import type { CurriculumPhase } from "@/content/taxonomy";
import { ModuleCard } from "@/features/roadmap/module-card";
import type { ProgressStatus } from "@/features/progress/model";

type RoadmapEntry = {
  module: ModuleSummary & { activityId: string };
  status: ProgressStatus | undefined;
  activityCount: number;
  completedActivityCount: number;
  activityStatus?: ProgressStatus;
  completedLessonCount: number;
};

type RoadmapPhase = { name: CurriculumPhase; range: string };
type StatusFilter = ProgressStatus | "all";
const openPhasesStorageKey = "fieldnotes-roadmap-open-phases-v1";
const openPhasesChangeEvent = "fieldnotes-roadmap-open-phases-change";
let memoryOpenPhasesSnapshot: string | undefined;
let openPhasesStorageUnavailable = false;

function phaseKey(name: CurriculumPhase): string {
  return "phase-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function subscribeToOpenPhaseChanges(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(openPhasesChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(openPhasesChangeEvent, onChange);
  };
}

function readOpenPhasesSnapshot(defaultSnapshot: string): string {
  try {
    if (openPhasesStorageUnavailable) return memoryOpenPhasesSnapshot ?? defaultSnapshot;
    return window.localStorage.getItem(openPhasesStorageKey) ?? memoryOpenPhasesSnapshot ?? defaultSnapshot;
  } catch {
    openPhasesStorageUnavailable = true;
    return memoryOpenPhasesSnapshot ?? defaultSnapshot;
  }
}

function writeOpenPhasesSnapshot(snapshot: string): void {
  memoryOpenPhasesSnapshot = snapshot;
  try {
    window.localStorage.setItem(openPhasesStorageKey, snapshot);
    openPhasesStorageUnavailable = false;
  } catch {
    openPhasesStorageUnavailable = true;
  }
  window.dispatchEvent(new Event(openPhasesChangeEvent));
}

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
  const phaseKeys = useMemo(() => phases.map(({ name }) => phaseKey(name)), [phases]);
  const defaultOpenPhasesSnapshot = useMemo(() => JSON.stringify(phaseKeys), [phaseKeys]);
  const getOpenPhasesSnapshot = useCallback(() => readOpenPhasesSnapshot(defaultOpenPhasesSnapshot), [defaultOpenPhasesSnapshot]);
  const openPhasesSnapshot = useSyncExternalStore(
    subscribeToOpenPhaseChanges,
    getOpenPhasesSnapshot,
    () => defaultOpenPhasesSnapshot,
  );
  const openPhases = useMemo(() => {
    try {
      const saved: unknown = JSON.parse(openPhasesSnapshot);
      if (Array.isArray(saved) && saved.every((key) => typeof key === "string")) {
        return new Set(phaseKeys.filter((key) => saved.includes(key)));
      }
    } catch {
      // Ignore corrupt preferences and keep all phases open.
    }
    return new Set(phaseKeys);
  }, [openPhasesSnapshot, phaseKeys]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredModules = useMemo(() => modules.filter(({ module, status }) => {
    const searchableText = [module.id, module.title, module.intro].join(" ").toLocaleLowerCase();
    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
    const matchesPhase = phaseFilter === "all" || module.phase === phaseFilter;
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesQuery && matchesPhase && matchesStatus;
  }), [modules, normalizedQuery, phaseFilter, statusFilter]);
  const anyFilter = Boolean(normalizedQuery) || phaseFilter !== "all" || statusFilter !== "all";
  const allExpanded = phaseKeys.every((key) => openPhases.has(key));

  function setAllPhasesOpen(open: boolean) {
    writeOpenPhasesSnapshot(JSON.stringify(open ? phaseKeys : []));
  }

  function togglePhase(key: string) {
    if (anyFilter) return;
    const next = new Set(openPhases);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    writeOpenPhasesSnapshot(JSON.stringify(phaseKeys.filter((phase) => next.has(phase))));
  }

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

      <div className="roadmap-disclosure-controls" role="group" aria-label="Roadmap phase controls">
        <button className="roadmap-global-phase-button" type="button" onClick={() => setAllPhasesOpen(true)} disabled={allExpanded}>
          Expand all phases
        </button>
        <button className="roadmap-global-phase-button" type="button" onClick={() => setAllPhasesOpen(false)} disabled={openPhases.size === 0 || anyFilter}>
          Collapse all phases
        </button>
      </div>

      {filteredModules.length ? phases.map((phase) => {
        const phaseModules = filteredModules.filter(({ module }) => module.phase === phase.name);
        if (!phaseModules.length) return null;
        const Icon = phaseIcons[phase.name];
        const phaseId = phaseKey(phase.name);
        const modulesId = `${phaseId}-modules`;
        const expanded = anyFilter || openPhases.has(phaseId);
        return (
          <section className="roadmap-phase" key={phase.name} aria-labelledby={phaseId}>
            <div className="section-heading">
              <div className="phase-banner">
                <span className="phase-number"><Icon size={18} aria-hidden="true" /></span>
                <div className="phase-banner-copy">
                  <h2 id={phaseId}>{phase.name}<span>{phase.range}</span></h2>
                </div>
                <span className="phase-module-count">{phaseModules.length} {phaseModules.length === 1 ? "module" : "modules"}</span>
                <button
                  className="roadmap-phase-toggle"
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={modulesId}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${phase.name} modules`}
                  disabled={anyFilter}
                  onClick={() => togglePhase(phaseId)}
                >
                  <span>{expanded ? "Collapse" : "Expand"}</span><ChevronDown className={expanded ? "roadmap-phase-toggle-icon is-expanded" : "roadmap-phase-toggle-icon"} size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div id={modulesId} className="module-grid roadmap-phase-modules" aria-labelledby={phaseId} hidden={!expanded}>
              {phaseModules.map(({ module, status, activityCount, activityStatus, completedLessonCount }) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  status={status}
                  activityCount={activityCount}
                  activityId={module.activityId}
                  activityStatus={activityStatus}
                  completedLessonCount={completedLessonCount}
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
      <p className="roadmap-completion-note">Lesson completion is a self-report, activity status describes practical work, and module status is your overall choice. None of these measures mastery.</p>
      <p className="roadmap-activity-link"><Link href="/activities">Browse all activities <ArrowRight size={14} aria-hidden="true" /></Link></p>
    </>
  );
}
