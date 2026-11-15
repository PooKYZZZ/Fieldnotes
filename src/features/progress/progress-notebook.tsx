"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, NotebookPen, PencilLine, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProgressRecord, ProgressStatus } from "@/features/progress/model";

export type NotebookItem = { itemType: ProgressRecord["itemType"]; itemId: string; label: string; href: string; editHref?: string; editLabel?: string; kind: string; investigationTasks?: { id: string; title: string }[] };
type ItemFilter = "all" | "module" | "lesson" | "activity" | "project" | "milestone";

const itemFilters: { value: ItemFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "module", label: "Modules" },
  { value: "lesson", label: "Lessons" },
  { value: "activity", label: "Activities" },
  { value: "project", label: "Projects" },
  { value: "milestone", label: "Milestones" },
];

const statusFilters: { value: "all" | ProgressStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "needs_review", label: "Needs review" },
  { value: "completed", label: "Completed" },
];

function matchesType(record: ProgressRecord, filter: ItemFilter): boolean {
  if (filter === "all") return true;
  if (filter === "project") return record.itemType === "project" || record.itemType === "small_project";
  return record.itemType === filter;
}

export function ProgressNotebook({ items }: { items: NotebookItem[] }) {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProgressStatus>("all");

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
    return controller;
  }, []);

  useEffect(() => {
    let controller = loadProgress();
    const refresh = () => {
      controller.abort();
      setLoaded(false);
      controller = loadProgress();
    };
    window.addEventListener("progress-updated", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("progress-updated", refresh);
    };
  }, [loadAttempt, loadProgress]);

  const itemByKey = useMemo(() => new Map(items.map((item) => [`${item.itemType}:${item.itemId}`, item])), [items]);
  const savedItems = useMemo(() => records
    .map((record) => ({ record, item: itemByKey.get(`${record.itemType}:${record.itemId}`) }))
    .filter((entry): entry is { record: ProgressRecord; item: NotebookItem } => Boolean(entry.item))
    .sort((left, right) => right.record.updatedAt - left.record.updatedAt), [itemByKey, records]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return savedItems.filter(({ record, item }) => {
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const observations = Object.values(record.taskObservations ?? {}).join(" ");
      const searchable = `${item.label} ${item.kind} ${record.notes} ${record.evidence} ${observations}`.toLocaleLowerCase();
      return matchesType(record, itemFilter) && matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [itemFilter, query, savedItems, statusFilter]);
  const counts = useMemo(() => {
    const moduleItems = items.filter((item) => item.itemType === "module");
    const moduleRecords = records.filter((record) => record.itemType === "module");
    return {
      modules: moduleItems.length,
      completedModules: moduleRecords.filter((record) => record.status === "completed").length,
      activeModules: moduleRecords.filter((record) => record.status === "in_progress").length,
      modulesToReview: moduleRecords.filter((record) => record.status === "needs_review").length,
    };
  }, [items, records]);
  const hasFilters = Boolean(query.trim()) || itemFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => { setQuery(""); setItemFilter("all"); setStatusFilter("all"); };

  if (!loaded) return <div className="progress-loading" role="status"><RefreshCw size={17} aria-hidden="true" />Loading your saved learning records…</div>;
  if (loadError) return <div className="progress-load-error" role="alert"><h2>Saved progress is unavailable</h2><p>Your records were not cleared. Check the app or local database, then retry.</p><button className="button button-outline" type="button" onClick={() => { setLoaded(false); setLoadError(false); setLoadAttempt((attempt) => attempt + 1); }}><RefreshCw size={14} aria-hidden="true" /> Try again</button></div>;

  return <section className="progress-journal" aria-labelledby="saved-work-title">
    <div className="progress-overview-heading"><div><p className="eyebrow">Journey snapshot</p><h2>Learning overview</h2><p>Module states come from your saved records. They describe what you chose to track, not verified mastery.</p></div></div>
    <div className="progress-stats" aria-label="Roadmap module progress summary">
      <div className="progress-stat"><span>Roadmap modules</span><strong>{counts.modules}</strong></div>
      <div className="progress-stat"><span>Modules marked complete</span><strong>{counts.completedModules}</strong></div>
      <div className="progress-stat"><span>Modules in progress</span><strong>{counts.activeModules}</strong></div>
      <div className="progress-stat"><span>Modules needing review</span><strong>{counts.modulesToReview}</strong></div>
    </div>

    <div className="progress-journal-heading"><div><p className="eyebrow">Notes, practice, and evidence</p><h2 id="saved-work-title">Saved learning record</h2><p>Records are ordered by their last saved time. A completion label reflects your saved choice; it is not an external skills assessment.</p></div><span className="progress-record-count">{filteredItems.length} of {savedItems.length} records shown</span></div>

    <div className="progress-filter-panel">
      <label className="progress-search search-wrap"><Search size={17} aria-hidden="true" /><span className="sr-only">Search saved learning records</span><input className="form-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes, evidence, or items" /></label>
      <div className="progress-filter-tools">
        <div className="progress-type-filters" role="group" aria-label="Filter by learning item type">
          {itemFilters.map(({ value, label }) => <button className="progress-type-filter" type="button" key={value} aria-pressed={itemFilter === value} onClick={() => setItemFilter(value)}>{label}</button>)}
        </div>
        <label className="progress-status-filter">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>{statusFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select></label>
      </div>
    </div>

    {filteredItems.length ? <div className="progress-record-list">{filteredItems.map(({ record, item }) => {
      const updatedAt = new Date(record.updatedAt);
      const formattedDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(updatedAt);
      return <article className="progress-record" key={`${record.itemType}-${record.itemId}`}>
        <div className="progress-record-marker" aria-hidden="true"><NotebookPen size={17} /></div>
        <div className="progress-record-body">
          <div className="progress-record-heading"><div><p className="progress-record-meta">{item.kind} <span aria-hidden="true">·</span> <time dateTime={updatedAt.toISOString()}>Saved {formattedDate}</time></p><h3><Link href={item.href}>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></Link></h3></div><StatusPill status={record.status} /></div>
          {record.comfort && <p className="progress-record-detail"><strong>Confidence:</strong> {record.comfort[0].toUpperCase() + record.comfort.slice(1)}</p>}
          {record.itemType === "activity" && item.investigationTasks && record.taskObservations && <div className="progress-record-task-observations" aria-label={`Saved ${record.itemId} task observations`}>
            {item.investigationTasks.map((task) => {
              const observation = record.taskObservations?.[task.id]?.trim();
              return observation ? <p className="progress-record-detail" key={task.id}><strong>{task.title}:</strong> {observation}</p> : null;
            })}
          </div>}
          {record.notes && <p className="progress-record-note">{record.notes}</p>}
          {record.evidence && <p className="progress-record-detail"><strong>Evidence:</strong> {record.evidence}</p>}
          {record.repositoryUrl && <a className="progress-repository-link" href={record.repositoryUrl} target="_blank" rel="noreferrer">Open saved repository <ArrowUpRight size={13} aria-hidden="true" /></a>}
          {!record.notes && !record.evidence && !record.repositoryUrl && !Object.values(record.taskObservations ?? {}).some((observation) => observation.trim()) && <p className="progress-record-empty"><ShieldCheck size={14} aria-hidden="true" />No note or evidence has been added yet.</p>}
          {item.editHref && <Link className="progress-record-action" href={item.editHref}><PencilLine size={14} aria-hidden="true" />{item.editLabel ?? "Edit learning record"}</Link>}
        </div>
      </article>;
    })}</div> : records.length ? <div className="progress-empty-filter" role="status"><Search size={23} aria-hidden="true" /><h3>No saved records match these filters.</h3><p>Try another type or status, or search for a different term.</p>{hasFilters && <button className="button button-outline" type="button" onClick={clearFilters}>Clear filters</button>}</div> : <div className="progress-first-entry"><div className="progress-first-icon"><NotebookPen size={24} aria-hidden="true" /></div><div><p className="eyebrow">A clean start</p><h3>Your learning notes will collect here</h3><p>Open a module, activity, or project to record what you practiced and how you verified it. A concise entry might include a goal, command or artifact, observation, troubleshooting, and takeaway.</p><Link className="button button-primary" href="/roadmap">Choose your next module <ArrowUpRight size={15} aria-hidden="true" /></Link></div></div>}
  </section>;
}
