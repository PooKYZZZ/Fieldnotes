"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Layers3, RefreshCw, Rocket } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProgressRecord, ProgressStatus } from "@/features/progress/model";

export type MajorProjectSummary = {
  id: string;
  title: string;
  purpose: string;
  milestones: { id: string; label: string }[];
};

export type SmallProjectSummary = {
  id: string;
  title: string;
  problem: string;
  relevantModules: string;
};

function SavedStatus({ status, loaded, loadError }: { status?: ProgressStatus; loaded: boolean; loadError: boolean }) {
  if (!loaded) return <span className="project-state-badge" role="status">Loading saved status</span>;
  if (loadError) return <span className="project-state-badge project-state-badge--unavailable" role="status">Progress unavailable</span>;
  return <StatusPill status={status ?? "not_started"} />;
}

function MajorBuildCard({
  project,
  status,
  completedMilestones,
  nextMilestone,
  loaded,
  loadError,
}: {
  project: MajorProjectSummary;
  status?: ProgressStatus;
  completedMilestones: number;
  nextMilestone?: { id: string; label: string };
  loaded: boolean;
  loadError: boolean;
}) {
  const tone = project.id === "P2" ? "teal" : project.id === "P3" ? "earth" : "charcoal";
  return <Link className={`major-build-card major-build-card--${tone}${nextMilestone ? " major-build-card--active" : ""}`} data-project-id={project.id} href={`/projects/${project.id}`}>
    <div className="major-build-band"><span>{project.id} <i aria-hidden="true">·</i> Major build</span><ArrowRight size={17} aria-hidden="true" /></div>
    <div className="major-build-content">
      <div className="major-build-heading"><h3>{project.title}</h3><SavedStatus status={status} loaded={loaded} loadError={loadError} /></div>
      <p>{project.purpose}</p>
      {nextMilestone && <div className="major-build-next"><span>Next milestone</span><strong>{nextMilestone.id}</strong><span>{nextMilestone.label}</span></div>}
      <div className="major-build-progress">
        {loaded && !loadError ? <>
          <div className="major-build-progress-label"><span><CheckCircle2 size={15} aria-hidden="true" />Milestones self-marked complete</span><strong>{completedMilestones} / {project.milestones.length}</strong></div>
          <div className="major-build-progress-track" role="progressbar" aria-label={`${project.title} milestones self-marked complete`} aria-valuemin={0} aria-valuemax={project.milestones.length} aria-valuenow={completedMilestones}>
            <span style={{ width: `${project.milestones.length ? (completedMilestones / project.milestones.length) * 100 : 0}%` }} />
          </div>
        </> : <span className="major-build-progress-unavailable">{loadError ? "Saved milestone progress could not be read." : "Loading saved milestones…"}</span>}
      </div>
      <div className="major-build-footer"><span>{project.milestones.length} milestones · evidence checklist</span><span>Open project brief <ArrowRight size={14} /></span></div>
    </div>
  </Link>;
}

function SmallToolCard({ project, status, loaded, loadError }: { project: SmallProjectSummary; status?: ProgressStatus; loaded: boolean; loadError: boolean }) {
  return <Link className="small-tool-card" href={`/projects/${project.id}`}>
    <div className="small-tool-top"><span className="small-tool-id">{project.id}</span><SavedStatus status={status} loaded={loaded} loadError={loadError} /></div>
    <h3>{project.title}</h3>
    <p>{project.problem}</p>
    <div className="small-tool-footer"><span>{project.relevantModules}</span><span>Open brief <ArrowRight size={14} aria-hidden="true" /></span></div>
  </Link>;
}

export function ProjectOverview({ majorProjects, smallProjects }: { majorProjects: MajorProjectSummary[]; smallProjects: SmallProjectSummary[] }) {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadProgress = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/progress", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Saved project progress is unavailable.");
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

  const recordByItem = useMemo(() => new Map(records.map((record) => [`${record.itemType}:${record.itemId}`, record])), [records]);
  const completedMilestones = useMemo(() => new Set(records
    .filter((record) => record.itemType === "milestone" && record.status === "completed")
    .map((record) => record.itemId)), [records]);
  const { activeProjectIds, projectProgress } = useMemo(() => {
    const projectStatus = new Map(records
      .filter((record) => record.itemType === "project" || record.itemType === "small_project")
      .map((record) => [record.itemId, record.status]));
    const milestoneProjectById = new Map(majorProjects.flatMap((project) => project.milestones.map((milestone) => [milestone.id, project.id] as const)));
    const active = new Set([...projectStatus]
      .filter(([, status]) => status === "in_progress" || status === "needs_review")
      .map(([id]) => id));
    for (const record of records) {
      if (record.itemType !== "milestone" || record.status !== "completed") continue;
      const projectId = milestoneProjectById.get(record.itemId);
      if (projectId && projectStatus.get(projectId) !== "completed") active.add(projectId);
    }
    const completed = [...projectStatus.values()].filter((status) => status === "completed").length;
    return {
      activeProjectIds: active,
      projectProgress: { completed, active: active.size },
    };
  }, [majorProjects, records]);
  const orderedMajorProjects = useMemo(() => [...majorProjects].sort((left, right) => Number(activeProjectIds.has(right.id)) - Number(activeProjectIds.has(left.id))), [activeProjectIds, majorProjects]);
  const orderedSmallProjects = useMemo(() => [...smallProjects].sort((left, right) => Number(activeProjectIds.has(right.id)) - Number(activeProjectIds.has(left.id))), [activeProjectIds, smallProjects]);

  function statusForProjectCard(projectId: string): ProgressStatus | undefined {
    const savedStatus = recordByItem.get(`project:${projectId}`)?.status;
    return activeProjectIds.has(projectId) && (!savedStatus || savedStatus === "not_started")
      ? "in_progress"
      : savedStatus;
  }

  return <>
    <div className="project-overview-stats" aria-label="Project collection summary">
      <div><Rocket size={18} aria-hidden="true" /><strong>{majorProjects.length}</strong><span>major builds</span></div>
      <div><Layers3 size={18} aria-hidden="true" /><strong>{smallProjects.length}</strong><span>small tools</span></div>
      {loaded && !loadError ? <>
        <div><Circle size={17} aria-hidden="true" /><strong>{projectProgress.active}</strong><span>active projects</span></div>
        <div><CheckCircle2 size={17} aria-hidden="true" /><strong>{projectProgress.completed}</strong><span>marked complete</span></div>
      </> : <div className="project-stats-loading" role="status"><RefreshCw size={16} aria-hidden="true" />{loadError ? "Saved progress unavailable" : "Loading saved progress"}</div>}
    </div>

    <section className="project-section" aria-labelledby="major-builds-title">
      <div className="project-section-heading"><div><p className="eyebrow">Combine skills across the roadmap</p><h2 id="major-builds-title">Major builds</h2><p>Progressive portfolio projects with milestones, evidence, and a self-review rubric.</p></div><span className="project-count-tag">{majorProjects.length} tracks</span></div>
      <div className="major-build-grid">
        {orderedMajorProjects.map((project) => <MajorBuildCard
          key={project.id}
          project={project}
          status={statusForProjectCard(project.id)}
          completedMilestones={project.milestones.filter((milestone) => completedMilestones.has(milestone.id)).length}
          nextMilestone={activeProjectIds.has(project.id) ? project.milestones.find((milestone) => !completedMilestones.has(milestone.id)) : undefined}
          loaded={loaded}
          loadError={loadError}
        />)}
      </div>
    </section>

    <section className="project-section" aria-labelledby="small-tools-title">
      <div className="project-section-heading"><div><p className="eyebrow">Build a useful thing first</p><h2 id="small-tools-title">Small tools</h2><p>Focused ideas that turn one operational concept into a reproducible tool.</p></div><span className="project-count-tag">{smallProjects.length} ideas</span></div>
      <div className="small-tool-grid">
        {orderedSmallProjects.map((project) => <SmallToolCard key={project.id} project={project} status={recordByItem.get(`small_project:${project.id}`)?.status} loaded={loaded} loadError={loadError} />)}
      </div>
    </section>
  </>;
}
