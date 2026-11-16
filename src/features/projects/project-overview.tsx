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
  track: string;
  estimatedTime: string;
  relevantModules: string;
  tools: string[];
  milestones: { id: string; label: string }[];
};

export type SmallProjectSummary = {
  id: string;
  title: string;
  problem: string;
  track: string;
  estimatedTime: string;
  relevantModules: string;
  tools: string[];
  milestones: { id: string; label: string }[];
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
  active,
  loaded,
  loadError,
}: {
  project: MajorProjectSummary;
  status?: ProgressStatus;
  completedMilestones: number;
  nextMilestone?: { id: string; label: string };
  active: boolean;
  loaded: boolean;
  loadError: boolean;
}) {
  const tone = project.id === "P2" ? "teal" : project.id === "P3" ? "earth" : "charcoal";
  return <Link className={`major-build-card major-build-card--${tone}${active ? " major-build-card--active" : ""}`} data-project-id={project.id} href={`/projects/${project.id}`}>
    <div className="major-build-band"><span>{project.id} <i aria-hidden="true">·</i> Major build</span><ArrowRight size={17} aria-hidden="true" /></div>
    <div className="major-build-content">
      <div className="major-build-heading"><h3>{project.title}</h3><SavedStatus status={status} loaded={loaded} loadError={loadError} /></div>
      <p>{project.purpose}</p>
      <div className="project-card-meta"><span>{project.track}</span><span>{project.estimatedTime}</span><span>Modules {project.relevantModules}</span></div>
      {project.tools.length > 0 && <p className="project-card-tools">Core stack: {project.tools.slice(0, 3).join(" · ")}{project.tools.length > 3 ? " · more" : ""}</p>}
      {nextMilestone && <div className="major-build-next"><span>{active ? "Next checkpoint" : "First checkpoint"}</span><strong>{nextMilestone.id}</strong><span>{nextMilestone.label}</span></div>}
      <div className="major-build-progress">
        {loaded && !loadError ? <>
          <div className="major-build-progress-label"><span><CheckCircle2 size={15} aria-hidden="true" />Checkpoints self-reported</span><strong>{completedMilestones} / {project.milestones.length}</strong></div>
          <div className="major-build-progress-track" role="progressbar" aria-label={`${project.title} checkpoints self-reported`} aria-valuemin={0} aria-valuemax={project.milestones.length} aria-valuenow={completedMilestones}>
            <span style={{ width: `${project.milestones.length ? (completedMilestones / project.milestones.length) * 100 : 0}%` }} />
          </div>
        </> : <span className="major-build-progress-unavailable">{loadError ? "Saved milestone progress could not be read." : "Loading saved milestones…"}</span>}
      </div>
      <div className="major-build-footer"><span>{project.milestones.length} guided checkpoints</span><span>Open project plan <ArrowRight size={14} /></span></div>
    </div>
  </Link>;
}

function SmallToolCard({ project, status, completedMilestones, nextMilestone, active, loaded, loadError }: { project: SmallProjectSummary; status?: ProgressStatus; completedMilestones: number; nextMilestone?: { id: string; label: string }; active: boolean; loaded: boolean; loadError: boolean }) {
  return <Link className="small-tool-card" data-project-id={project.id} href={`/projects/${project.id}`}>
    <div className="small-tool-top"><span className="small-tool-id">{project.id}</span><SavedStatus status={status} loaded={loaded} loadError={loadError} /></div>
    <h3>{project.title}</h3>
    <p>{project.problem}</p>
    <div className="project-card-meta"><span>{project.track}</span><span>{project.estimatedTime}</span><span>Modules {project.relevantModules}</span><span>{project.milestones.length} checkpoints</span></div>
    {project.tools.length > 0 && <p className="project-card-tools">{project.tools.slice(0, 2).join(" · ")}{project.tools.length > 2 ? " · more" : ""}</p>}
    {nextMilestone && <div className="small-project-next"><span>{active ? "Next checkpoint" : "First checkpoint"} · {nextMilestone.id}</span><strong>{nextMilestone.label}</strong></div>}
    {loaded && !loadError && <div className="small-project-progress"><span>{completedMilestones} of {project.milestones.length} checkpoints self-reported</span><span className="major-build-progress-track" role="progressbar" aria-label={`${project.title} checkpoints self-reported`} aria-valuemin={0} aria-valuemax={project.milestones.length} aria-valuenow={completedMilestones}><i style={{ width: `${project.milestones.length ? (completedMilestones / project.milestones.length) * 100 : 0}%` }} /></span></div>}
    <div className="small-tool-footer"><span>Open project plan</span><ArrowRight size={14} aria-hidden="true" /></div>
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
    const allProjects = [...majorProjects, ...smallProjects];
    const milestoneProjectById = new Map(allProjects.flatMap((project) => project.milestones.map((milestone) => [milestone.id, project.id] as const)));
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
  }, [majorProjects, smallProjects, records]);
  const orderedMajorProjects = useMemo(() => [...majorProjects].sort((left, right) => Number(activeProjectIds.has(right.id)) - Number(activeProjectIds.has(left.id))), [activeProjectIds, majorProjects]);
  const orderedSmallProjects = useMemo(() => [...smallProjects].sort((left, right) => Number(activeProjectIds.has(right.id)) - Number(activeProjectIds.has(left.id))), [activeProjectIds, smallProjects]);

  function statusForProjectCard(projectId: string, itemType: "project" | "small_project"): ProgressStatus | undefined {
    const savedStatus = recordByItem.get(`${itemType}:${projectId}`)?.status;
    return activeProjectIds.has(projectId) && (!savedStatus || savedStatus === "not_started")
      ? "in_progress"
      : savedStatus;
  }

  return <>
    <div className="project-overview-stats" aria-label="Project collection summary">
      <div><Rocket size={18} aria-hidden="true" /><strong>{majorProjects.length}</strong><span>major builds</span></div>
      <div><Layers3 size={18} aria-hidden="true" /><strong>{smallProjects.length}</strong><span>focused builds</span></div>
      {loaded && !loadError ? <>
        <div><Circle size={17} aria-hidden="true" /><strong>{projectProgress.active}</strong><span>active projects</span></div>
        <div><CheckCircle2 size={17} aria-hidden="true" /><strong>{projectProgress.completed}</strong><span>marked complete</span></div>
      </> : <div className="project-stats-loading" role="status"><RefreshCw size={16} aria-hidden="true" />{loadError ? "Saved progress unavailable" : "Loading saved progress"}</div>}
    </div>

    <section className="project-section" aria-labelledby="small-tools-title">
      <div className="project-section-heading"><div><p className="eyebrow">Start with one operational problem</p><h2 id="small-tools-title">Focused builds</h2><p>Shorter projects (4–9 hours) that turn one operational concept into a reproducible, reviewable tool.</p></div><span className="project-count-tag">{smallProjects.length} projects</span></div>
      <div className="small-tool-grid">
        {orderedSmallProjects.map((project) => {
          const status = statusForProjectCard(project.id, "small_project");
          const nextMilestone = status === "completed" ? undefined : project.milestones.find((milestone) => !completedMilestones.has(milestone.id));
          return <SmallToolCard key={project.id} project={project} status={status} completedMilestones={project.milestones.filter((milestone) => completedMilestones.has(milestone.id)).length} nextMilestone={nextMilestone} active={activeProjectIds.has(project.id)} loaded={loaded} loadError={loadError} />;
        })}
      </div>
    </section>

    <section className="project-section" aria-labelledby="major-builds-title">
      <div className="project-section-heading"><div><p className="eyebrow">Combine skills across the roadmap</p><h2 id="major-builds-title">Integrated builds and capstone</h2><p>Longer portfolio work that combines delivery, reliability, security, and recovery.</p></div><span className="project-count-tag">{majorProjects.length} tracks</span></div>
      <div className="major-build-grid">
        {orderedMajorProjects.map((project) => <MajorBuildCard
          key={project.id}
          project={project}
          status={statusForProjectCard(project.id, "project")}
          completedMilestones={project.milestones.filter((milestone) => completedMilestones.has(milestone.id)).length}
          nextMilestone={statusForProjectCard(project.id, "project") === "completed" ? undefined : project.milestones.find((milestone) => !completedMilestones.has(milestone.id))}
          active={activeProjectIds.has(project.id)}
          loaded={loaded}
          loadError={loadError}
        />)}
      </div>
    </section>
  </>;
}
