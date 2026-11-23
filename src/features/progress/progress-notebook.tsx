"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, NotebookPen, PencilLine, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProgressRecord, ProgressStatus } from "@/features/progress/model";
import { ProgressSignInNotice } from "@/features/auth/progress-sign-in-notice";
import { AuthUnavailableNotice } from "@/features/auth/auth-unavailable-notice";
import { ProgressAccountChangedNotice } from "@/features/progress/progress-account-changed-notice";
import { useProgressRecords } from "@/features/progress/use-progress-records";
import { formatSavedDate } from "@/features/progress/date-format";

export type NotebookItem = { itemType: ProgressRecord["itemType"]; itemId: string; label: string; href: string; editHref?: string; editLabel?: string; kind: string; investigationTasks?: { id: string; title: string }[]; checkpointTasks?: { id: string; title: string }[] };
type ItemFilter = "all" | "module" | "lesson" | "activity" | "troubleshooting" | "project" | "milestone";

const itemFilters: { value: ItemFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "module", label: "Modules" },
  { value: "lesson", label: "Lessons" },
  { value: "activity", label: "Activities" },
  { value: "troubleshooting", label: "Troubleshooting" },
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

export function ProgressNotebook({ items, initialTypeFilter = "all" }: { items: NotebookItem[]; initialTypeFilter?: ItemFilter }) {
  const { records, loaded, loadError, requiresSignIn, accountChanged, sessionUnavailable, retry } = useProgressRecords();
  const [query, setQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>(initialTypeFilter);
  const [statusFilter, setStatusFilter] = useState<"all" | ProgressStatus>("all");

  const itemByKey = useMemo(() => new Map(items.map((item) => [`${item.itemType}:${item.itemId}`, item])), [items]);
  const savedItems = useMemo(() => records
    .map((record) => ({
      record,
      item: itemByKey.get(`${record.itemType}:${record.itemId}`) ?? {
        itemType: record.itemType,
        itemId: record.itemId,
        label: `${record.itemType.replaceAll("_", " ")} · ${record.itemId} (saved item)`,
        href: record.itemType === "troubleshooting" ? "/activities#troubleshooting" : "/roadmap",
        kind: "Legacy saved record",
      },
    }))
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
  if (sessionUnavailable) return <AuthUnavailableNotice message="Your account could not be checked. Your public learning material remains available; saved records are hidden until the account service responds." onRetry={retry} />;
  if (accountChanged) return <ProgressAccountChangedNotice />;
  if (requiresSignIn) return <section className="progress-journal" aria-label="Open your notebook">
    <ProgressSignInNotice reloadAfterSignIn={false}>Sign in to keep your lesson progress, lab observations, and project notes together. You can export or restore your saved records from here.</ProgressSignInNotice>
    <Link className="button button-outline" href="/roadmap">Return to the roadmap</Link>
  </section>;
  if (loadError) return <div className="progress-load-error" role="alert"><h2>Saved progress is unavailable</h2><p>Your records were not cleared. Check the app or local database, then retry.</p><button className="button button-outline" type="button" onClick={retry}><RefreshCw size={14} aria-hidden="true" /> Try again</button></div>;

  return <section className="progress-journal" aria-labelledby="saved-work-title">
    <div className="progress-journal-heading"><div><h2 id="saved-work-title">Saved learning record</h2><p>Most recently saved first.</p></div><span className="progress-record-count">{filteredItems.length} of {savedItems.length} records shown</span></div>
    <dl className="progress-stats" aria-label="Roadmap module progress summary, self-reported">
      <div className="progress-stat"><dt>Roadmap modules</dt><dd>{counts.modules}</dd></div>
      <div className="progress-stat"><dt>Marked complete</dt><dd>{counts.completedModules}</dd></div>
      <div className="progress-stat"><dt>In progress</dt><dd>{counts.activeModules}</dd></div>
      <div className="progress-stat"><dt>Needs review</dt><dd>{counts.modulesToReview}</dd></div>
    </dl>

    <div className="progress-filter-panel">
      <label className="progress-search search-wrap"><Search size={17} aria-hidden="true" /><span className="sr-only">Search saved learning records</span><input className="form-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes, evidence, or items" /></label>
      <div className="progress-filter-tools">
        <div className="progress-type-filters" role="group" aria-label="Filter by learning item type">
          {itemFilters.map(({ value, label }) => <button className="progress-type-filter" type="button" key={value} aria-pressed={itemFilter === value} onClick={() => setItemFilter(value)}>{label}</button>)}
        </div>
        <label className="progress-status-filter">Status<select value={statusFilter} onChange={(event) => {
          const value = event.currentTarget.value;
          setStatusFilter(statusFilters.find((filter) => filter.value === value)?.value ?? "all");
        }}>{statusFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select></label>
      </div>
    </div>

    {filteredItems.length ? <div className="progress-record-list">{filteredItems.map(({ record, item }) => {
      const savedDate = formatSavedDate(record.updatedAt, { dateStyle: "medium" });
      return <article className="progress-record" key={`${record.itemType}-${record.itemId}`}>
        <div className="progress-record-marker" aria-hidden="true">{record.itemId}</div>
        <div className="progress-record-body">
          <div className="progress-record-heading"><div><p className="progress-record-meta">{item.kind} <span aria-hidden="true">·</span> {savedDate.dateTime ? <time dateTime={savedDate.dateTime}>Saved {savedDate.text}</time> : <span>{savedDate.text}</span>}</p><h3><Link href={item.href}>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></Link></h3></div><StatusPill status={record.status} /></div>
          {record.comfort && <p className="progress-record-detail"><strong>Confidence:</strong> {record.comfort[0].toUpperCase() + record.comfort.slice(1)}</p>}
          {record.itemType === "activity" && item.investigationTasks && record.taskObservations && <div className="progress-record-task-observations" aria-label={`Saved ${record.itemId} task observations`}>
            {item.investigationTasks.map((task) => {
              const observation = record.taskObservations?.[task.id]?.trim();
              return observation ? <div className="progress-record-detail" key={task.id}><Link href={`${item.href}#activity-task-${task.id}`}>{task.title}</Link><p>{observation}</p></div> : null;
            })}
          </div>}
          {(record.itemType === "project" || record.itemType === "small_project") && item.checkpointTasks && record.taskObservations && <div className="progress-record-task-observations" aria-label={`Saved ${record.itemId} checkpoint notes`}>
            {item.checkpointTasks.map((checkpoint) => {
              const observation = record.taskObservations?.[checkpoint.id]?.trim();
              return observation ? <div className="progress-record-detail" key={checkpoint.id}><Link href={`${item.href}#milestone-${checkpoint.id}`}>{checkpoint.id} · {checkpoint.title}</Link><p>{observation}</p></div> : null;
            })}
          </div>}
          {record.notes && <p className="progress-record-note">{record.notes}</p>}
          {record.evidence && <p className="progress-record-detail"><strong>Evidence:</strong> {record.evidence}</p>}
          {record.repositoryUrl && <a className="progress-repository-link" href={record.repositoryUrl} target="_blank" rel="noreferrer">Open saved repository <ArrowUpRight size={13} aria-hidden="true" /></a>}
          {!record.notes && !record.evidence && !record.repositoryUrl && !Object.values(record.taskObservations ?? {}).some((observation) => observation.trim()) && <p className="progress-record-empty"><ShieldCheck size={14} aria-hidden="true" />No note or evidence has been added yet.</p>}
          {item.editHref && <Link className="progress-record-action" href={item.editHref}><PencilLine size={14} aria-hidden="true" />{item.editLabel ?? "Edit learning record"}</Link>}
        </div>
      </article>;
    })}</div> : records.length ? <div className="progress-empty-filter" role="status"><Search size={23} aria-hidden="true" /><h3>No saved records match these filters.</h3><p>Try another type or status, or search for a different term.</p>{hasFilters && <button className="button button-outline" type="button" onClick={clearFilters}>Clear filters</button>}</div> : <div className="progress-first-entry"><div className="progress-first-icon"><NotebookPen size={24} aria-hidden="true" /></div><div><h3>Your learning notes will collect here</h3><p>Open a lesson, lab, or project to record what you tried, what you observed, and how you verified the result.</p><Link className="button button-primary" href="/roadmap">Choose your next module <ArrowUpRight size={15} aria-hidden="true" /></Link></div></div>}
  </section>;
}
