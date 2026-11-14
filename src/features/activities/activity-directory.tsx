"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpenCheck, FlaskConical, Search, ShieldCheck } from "lucide-react";
import type { ActivityRecord, ModuleRecord } from "@/content/catalog";
import { formatStatus, type ProgressRecord, type ProgressStatus } from "@/features/progress/model";

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

export function ActivityDirectory({ activities, modules }: { activities: ActivityRecord[]; modules: ActivityModule[] }) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<(typeof phaseFilters)[number]["value"]>("all");
  const [status, setStatus] = useState<(typeof statusFilters)[number]["value"]>("all");
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadProgress = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/progress", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Saved activity progress is unavailable.");
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        setRecords(rows.filter((record) => record.itemType === "activity"));
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
    let activeController = loadProgress();
    const refresh = () => {
      activeController.abort();
      setLoaded(false);
      activeController = loadProgress();
    };
    window.addEventListener("progress-updated", refresh);
    return () => {
      activeController.abort();
      window.removeEventListener("progress-updated", refresh);
    };
  }, [loadProgress]);

  const moduleById = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules]);
  const progressByActivity = useMemo(() => new Map(records.map((record) => [record.itemId, record])), [records]);
  const phaseCounts = useMemo(() => new Map(phaseFilters.slice(1).map(({ value }) => [
    value,
    activities.filter((activity) => phaseForActivity(activity, moduleById) === value).length,
  ])), [activities, moduleById]);
  const counts = useMemo(() => ({
    total: activities.length,
    modules: new Set(activities.map((activity) => activity.moduleId)).size,
    active: records.filter((record) => record.status === "in_progress").length,
    review: records.filter((record) => record.status === "needs_review").length,
  }), [activities, records]);
  const resumableActivity = useMemo(() => {
    if (!loaded || loadError) return undefined;
    const saved = records
      .filter((record) => record.status === "in_progress" || record.status === "needs_review")
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .find((record) => activities.some((activity) => activity.id === record.itemId));
    const activity = saved ? activities.find((item) => item.id === saved.itemId) : undefined;
    return activity && saved ? { activity, status: saved.status } : undefined;
  }, [activities, loadError, loaded, records]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return activities.filter((activity) => {
      const activityPhase = phaseForActivity(activity, moduleById);
      const matchesPhase = phase === "all" || activityPhase === phase;
      const savedStatus = progressByActivity.get(activity.id)?.status ?? "not_started";
      const matchesStatus = !loaded || loadError || status === "all" || savedStatus === status;
      const moduleTitle = moduleById.get(activity.moduleId)?.title ?? "";
      const searchText = `${activity.id} ${activity.title} ${activity.challenge} ${activity.build} ${moduleTitle}`.toLocaleLowerCase();
      return matchesPhase && matchesStatus && (!normalizedQuery || searchText.includes(normalizedQuery));
    });
  }, [activities, loadError, loaded, moduleById, phase, progressByActivity, query, status]);

  const notStarted = loaded && !loadError ? activities.filter((activity) => !progressByActivity.has(activity.id)).length : undefined;

  return (
    <>
      <div className="activity-library-summary" aria-label="Activity library summary">
        <div><FlaskConical size={18} /><strong>{counts.total}</strong><span>hands-on activities</span></div>
        <div><BookOpenCheck size={18} /><strong>{counts.modules}</strong><span>modules with practice</span></div>
        <div><span className="activity-summary-dot activity-summary-dot--active" /><strong>{counts.active}</strong><span>in progress</span></div>
        <div><span className="activity-summary-dot activity-summary-dot--review" /><strong>{counts.review}</strong><span>need review</span></div>
      </div>

      {resumableActivity && <section className="continue-practice-card" aria-labelledby="continue-practice-title">
        <div>
          <p className="eyebrow">Continue practice · Module {String(resumableActivity.activity.moduleId).padStart(2, "0")}</p>
          <h2 id="continue-practice-title">{resumableActivity.activity.title}</h2>
          <p>{formatStatus(resumableActivity.status)} · Return to the saved activity and continue your notes and verification.</p>
        </div>
        <Link className="button button-primary" href={`/activities/${resumableActivity.activity.id}`}>Continue activity <ArrowRight size={14} aria-hidden="true" /></Link>
      </section>}

      <div className="activity-workspace">
        <section className="activity-library" aria-labelledby="activity-library-title">
          <div className="activity-library-heading">
            <div><p className="eyebrow">Practice library</p><h2 id="activity-library-title">Module activities</h2><p>Choose a lab, build task, or verification challenge. Each one links back to its learning module.</p></div>
            <span className="activity-result-count">{filtered.length} of {activities.length}</span>
          </div>

          <div className="activity-filter-panel">
            <div className="activity-search search-wrap">
              <Search size={17} aria-hidden="true" />
              <input className="form-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activities or skills" aria-label="Search activities or skills" />
            </div>
            <div className="activity-filter-row" role="group" aria-label="Filter activities by phase">
              {phaseFilters.map(({ value, label }) => <button className="activity-phase-filter" type="button" key={value} aria-pressed={phase === value} onClick={() => setPhase(value)}>
                {label}{value !== "all" && <span>{phaseCounts.get(value) ?? 0}</span>}
              </button>)}
            </div>
            <label className="activity-status-filter">Saved progress
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} disabled={!loaded || loadError}>
                {statusFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
              </select>
            </label>
          </div>

          {loadError && <p className="activity-load-message" role="status">Saved activity states could not be loaded. Search and phase filters still work.</p>}
          {!loadError && !loaded && <p className="activity-load-message" role="status">Loading your saved activity progress…</p>}

          {filtered.length ? <div className="practice-grid">
            {filtered.map((activity) => {
              const courseModule = moduleById.get(activity.moduleId);
              const saved = progressByActivity.get(activity.id);
              const savedStatus = saved?.status ?? "not_started";
              const label = loadError ? "Progress unavailable" : !loaded ? "Loading progress" : formatStatus(savedStatus);
              return <Link className="practice-card" data-phase={courseModule?.phase ?? "Foundations"} href={`/activities/${activity.id}`} key={activity.id}>
                <div className="practice-card-meta"><span>{activity.id} <i aria-hidden="true">·</i> Module {String(activity.moduleId).padStart(2, "0")}</span><span className={`practice-status${loaded && !loadError ? ` practice-status--${savedStatus}` : ""}`}>{label}</span></div>
                <h3>{activity.title}</h3>
                <p className="practice-card-challenge">{activity.challenge}</p>
                <p className="practice-card-outcome"><strong>Build:</strong> {activity.build}</p>
                <div className="practice-card-footer"><span>{courseModule?.phase ?? "Roadmap activity"}</span><span>Open activity <ArrowUpRight size={15} aria-hidden="true" /></span></div>
              </Link>;
            })}
          </div> : (
            <div className="practice-empty" role="status">
              <BookOpenCheck size={24} aria-hidden="true" />
              <h3>No activities match these filters.</h3>
              <p>Clear the search or choose another phase or progress state.</p>
              <button className="button button-outline" type="button" onClick={() => { setQuery(""); setPhase("all"); setStatus("all"); }}>Clear filters</button>
            </div>
          )}
        </section>

        <aside className="activity-guide-rail" aria-label="How to use activities">
          <section className="practice-loop-card">
            <p className="eyebrow">A repeatable practice loop</p>
            <h2>Work from evidence</h2>
            <ol>
              <li><span>01</span><div><strong>Predict</strong><p>Write down what you expect before changing anything.</p></div></li>
              <li><span>02</span><div><strong>Build</strong><p>Complete the smallest practical version of the task.</p></div></li>
              <li><span>03</span><div><strong>Verify</strong><p>Capture the result and one controlled failure.</p></div></li>
              <li><span>04</span><div><strong>Reflect</strong><p>Note what you can repeat without step-by-step help.</p></div></li>
            </ol>
          </section>
          <section className="practice-safety-card">
            <ShieldCheck size={18} aria-hidden="true" />
            <div><h3>Keep labs safe</h3><p>Use systems you own or disposable labs. Sanitize screenshots and logs before saving evidence.</p></div>
          </section>
          <Link className="practice-guide-link" href="/library/04_Activities_and_Practice.pdf" target="_blank" rel="noreferrer">Open the activities source PDF <ArrowRight size={15} /></Link>
          {notStarted !== undefined && <p className="practice-progress-note">{notStarted} activities have no saved progress record yet.</p>}
        </aside>
      </div>
    </>
  );
}
