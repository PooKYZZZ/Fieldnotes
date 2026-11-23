"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpenCheck, ChevronDown, Search } from "lucide-react";
import type { ActivityRecord, ModuleRecord, TroubleshootingRecord } from "@/content/catalog";
import { formatStatus, type ProgressSummary, type ProgressStatus } from "@/features/progress/model";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ProgressEditor } from "@/features/progress/progress-editor";
import { useProgressList } from "@/features/progress/progress-list-context";
import { AuthUnavailableNotice } from "@/features/auth/auth-unavailable-notice";
import { ProgressAccountChangedNotice } from "@/features/progress/progress-account-changed-notice";

type ActivityModule = Pick<ModuleRecord, "id" | "title" | "phase">;
type Phase = ModuleRecord["phase"];

const phaseFilters: { value: "all" | Phase; label: string }[] = [
  { value: "all", label: "All phases" },
  { value: "Foundations", label: "Foundations" },
  { value: "Infrastructure & Cloud", label: "Infrastructure & Cloud" },
  { value: "Operations & Security", label: "Operations & Security" },
];

const statusFilters: { value: "all" | ProgressStatus; label: string }[] = [
  { value: "all", label: "All progress" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "needs_review", label: "Needs review" },
  { value: "completed", label: "Completed" },
];

function phaseForActivity(activity: ActivityRecord, moduleById: Map<number, ActivityModule>): Phase | undefined {
  return moduleById.get(activity.moduleId)?.phase;
}

function TroubleshootingCard({ item, record, progressLoaded, progressError, requiresSignIn }: {
  item: TroubleshootingRecord;
  record?: ProgressSummary;
  progressLoaded: boolean;
  progressError: boolean;
  requiresSignIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (window.location.hash === `#troubleshooting-${item.id.toLowerCase()}` && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [item.id]);
  const status = requiresSignIn ? "Sign in to save" : progressError ? "Progress unavailable" : !progressLoaded ? "Loading progress" : formatStatus(record?.status ?? "not_started");
  const statusClass = progressLoaded && !progressError && !requiresSignIn ? ` practice-status--${record?.status ?? "not_started"}` : "";

  return (
    <details ref={detailsRef} id={`troubleshooting-${item.id.toLowerCase()}`} className="troubleshooting-card" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="troubleshooting-summary">
        <span>{item.id}</span>
        <strong>{item.title}</strong>
        <span className={`practice-status${statusClass}`}>{status}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </summary>
      <div className="troubleshooting-body">
        <div className="troubleshooting-premise">
          <section className="troubleshooting-section"><h3>Scenario</h3><p>{item.observation}</p></section>
          <section className="troubleshooting-section troubleshooting-safety"><h3>Safety boundary</h3><p>{item.constraint}</p></section>
        </div>
        <section className="troubleshooting-section troubleshooting-evidence"><h3>Evidence that completes the investigation</h3><MarkdownContent>{item.completion}</MarkdownContent></section>
        <div className="troubleshooting-procedure">
          <section className="troubleshooting-section"><h3>Investigate in order</h3><MarkdownContent copyable>{item.investigation}</MarkdownContent></section>
          <details className="troubleshooting-hint">
            <summary>Optional hint</summary>
            <MarkdownContent copyable>{item.hint}</MarkdownContent>
          </details>
        </div>
        {open && <div className="troubleshooting-record">
            <ProgressEditor itemType="troubleshooting" itemId={item.id} title={`${item.id} learning record`} showComfort wide />
        </div>}
      </div>
    </details>
  );
}

export function ActivityDirectory({
  activities,
  modules,
  troubleshooting,
}: {
  activities: ActivityRecord[];
  modules: ActivityModule[];
  troubleshooting: TroubleshootingRecord[];
}) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<(typeof phaseFilters)[number]["value"]>("all");
  const [status, setStatus] = useState<(typeof statusFilters)[number]["value"]>("all");
  const { records, loaded, loadError, requiresSignIn, accountChanged, sessionUnavailable, retry } = useProgressList();

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const moduleById = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules]);
  const progressByActivity = useMemo(() => new Map(records.filter((record) => record.itemType === "activity").map((record) => [record.itemId, record])), [records]);
  const progressByTroubleshooting = useMemo(() => new Map(records.filter((record) => record.itemType === "troubleshooting").map((record) => [record.itemId, record])), [records]);
  const phaseCounts = useMemo(() => new Map(phaseFilters.slice(1).map(({ value }) => [
    value,
    activities.filter((activity) => phaseForActivity(activity, moduleById) === value).length,
  ])), [activities, moduleById]);
  const resumableActivity = useMemo(() => {
    if (!loaded || loadError) return undefined;
    const saved = records
      .filter((record) => record.itemType === "activity" && (record.status === "in_progress" || record.status === "needs_review"))
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .find((record) => activities.some((activity) => activity.id === record.itemId));
    const activity = saved ? activities.find((item) => item.id === saved.itemId) : undefined;
    return activity && saved ? { activity, status: saved.status } : undefined;
  }, [activities, loadError, loaded, records]);

  const filteredActivities = useMemo(() => activities.filter((activity) => {
    const activityPhase = phaseForActivity(activity, moduleById);
    const matchesPhase = phase === "all" || activityPhase === phase;
    const savedStatus = progressByActivity.get(activity.id)?.status ?? "not_started";
    const matchesStatus = !loaded || loadError || status === "all" || savedStatus === status;
    const moduleTitle = moduleById.get(activity.moduleId)?.title ?? "";
    const searchText = `${activity.id} ${activity.title} ${activity.challenge} ${activity.build} ${moduleTitle}`.toLocaleLowerCase();
    return matchesPhase && matchesStatus && (!normalizedQuery || searchText.includes(normalizedQuery));
  }), [activities, loadError, loaded, moduleById, normalizedQuery, phase, progressByActivity, status]);

  const filteredTroubleshooting = useMemo(() => troubleshooting.filter((item) => {
    const searchText = `${item.id} ${item.title} ${item.observation} ${item.investigation} ${item.constraint} ${item.hint} ${item.completion}`.toLocaleLowerCase();
    return !normalizedQuery || searchText.includes(normalizedQuery);
  }), [normalizedQuery, troubleshooting]);

  function clearFilters() {
    setQuery("");
    setPhase("all");
    setStatus("all");
  }

  return (
    <>
      {sessionUnavailable && <AuthUnavailableNotice message="Your account could not be checked. Saved activity states stay hidden until the account service responds." onRetry={retry} />}
      {accountChanged && <ProgressAccountChangedNotice />}
      <div className="activity-catalog-search">
        <div className="activity-search search-wrap">
          <Search size={17} aria-hidden="true" />
          <input
            className="form-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by topic, technology, or skill"
            aria-label="Search by topic, technology, or skill"
          />
        </div>
        <p className="activity-search-results" aria-live="polite">
          {filteredActivities.length} module {filteredActivities.length === 1 ? "activity" : "activities"} · {filteredTroubleshooting.length} troubleshooting {filteredTroubleshooting.length === 1 ? "scenario" : "scenarios"}
        </p>
      </div>

      {resumableActivity && <section className="continue-practice-card" aria-labelledby="continue-practice-title">
        <div>
          <p className="eyebrow">Continue practice · Module {String(resumableActivity.activity.moduleId).padStart(2, "0")}</p>
          <h2 id="continue-practice-title">{resumableActivity.activity.title}</h2>
          <p>{formatStatus(resumableActivity.status)} · Return to the saved activity and continue your notes and verification.</p>
        </div>
        <Link className="button button-primary" href={`/activities/${resumableActivity.activity.id}`}>Continue activity <ArrowRight size={14} aria-hidden="true" /></Link>
      </section>}

      <section id="activity-library" className="activity-library activity-library--catalog" aria-labelledby="activity-library-title">
        <div className="activity-library-heading">
          <h2 id="activity-library-title">Module activities</h2>
          <span className="activity-result-count">{filteredActivities.length} of {activities.length}</span>
        </div>

        <div className="activity-filter-panel">
          <div className="activity-filter-row" role="group" aria-label="Filter activities by phase">
            {phaseFilters.map(({ value, label }) => <button className="activity-phase-filter" type="button" key={value} aria-pressed={phase === value} onClick={() => setPhase(value)}>
              {label}{value !== "all" && <span>{phaseCounts.get(value) ?? 0}</span>}
            </button>)}
          </div>
          <label className="activity-status-filter">Saved progress
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} disabled={!loaded || loadError || requiresSignIn}>
              {statusFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
          </label>
        </div>

        {requiresSignIn && <p className="activity-load-message" role="status">Sign in to view saved statuses and resume work. Search and phase filters remain available. <Link href="/sign-in?returnTo=%2Factivities">Sign in</Link></p>}
        {loadError && <p className="activity-load-message" role="status">Saved activity states could not be loaded. Search and phase filters still work.</p>}
        {!loadError && !loaded && <p className="activity-load-message" role="status">Loading your saved activity progress…</p>}

        {filteredActivities.length ? <ul className="practice-grid" role="list">
          {filteredActivities.map((activity) => {
            const courseModule = moduleById.get(activity.moduleId);
            const saved = progressByActivity.get(activity.id);
            const savedStatus = saved?.status ?? "not_started";
            const label = requiresSignIn ? "Sign in to save" : loadError ? "Progress unavailable" : !loaded ? "Loading progress" : formatStatus(savedStatus);
            return <li key={activity.id}>
              <Link className="practice-card" href={`/activities/${activity.id}`}>
                <span className="practice-card-meta"><strong>{activity.id}</strong><span>Module {String(activity.moduleId).padStart(2, "0")}</span></span>
                <div className="practice-card-copy">
                  <h3>{activity.title}</h3>
                  <p className="practice-card-challenge">{activity.challenge}</p>
                </div>
                <div className="practice-card-footer">
                  <span>{courseModule?.phase ?? "Roadmap activity"}</span>
                  {!requiresSignIn && <span className={`practice-status${loaded && !loadError ? ` practice-status--${savedStatus}` : ""}`}>{label}</span>}
                </div>
                <span className="practice-card-arrow">Open activity <ArrowUpRight size={16} aria-hidden="true" /></span>
              </Link>
            </li>;
          })}
        </ul> : (
          <div className="practice-empty" role="status">
            <BookOpenCheck size={24} aria-hidden="true" />
            <h3>No activities match these filters.</h3>
            <p>Clear the search or filters to see more activities.</p>
            <button className="button button-outline" type="button" onClick={clearFilters}>Clear filters</button>
          </div>
        )}
      </section>

      <section id="troubleshooting" className="cross-module-section" aria-labelledby="troubleshooting-title">
        <div className="activity-library-heading">
          <div><h2 id="troubleshooting-title">Troubleshooting scenarios</h2><p>Use evidence to narrow a failure, test one change, and record how you know the fix worked.</p></div>
          <span className="activity-result-count">{filteredTroubleshooting.length} of {troubleshooting.length}</span>
        </div>
        {filteredTroubleshooting.length ? <div className="troubleshooting-grid">
          {filteredTroubleshooting.map((item) => <TroubleshootingCard key={item.id} item={item} record={progressByTroubleshooting.get(item.id)} progressLoaded={loaded} progressError={loadError} requiresSignIn={requiresSignIn} />)}
        </div> : <p className="troubleshooting-empty" role="status">No troubleshooting scenarios match this search.</p>}
      </section>
    </>
  );
}
