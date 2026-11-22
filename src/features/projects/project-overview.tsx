"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Layers3, RefreshCw, Rocket } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProgressSummary, ProgressStatus } from "@/features/progress/model";
import { useProgressList } from "@/features/progress/progress-list-context";
import { AuthUnavailableNotice } from "@/features/auth/auth-unavailable-notice";
import { ProgressAccountChangedNotice } from "@/features/progress/progress-account-changed-notice";
import { ProjectModuleLinks } from "@/features/projects/project-module-links";

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

function SavedStatus({ status, savedDraft, completedMilestones, loaded, loadError, requiresSignIn }: { status?: ProgressStatus; savedDraft: boolean; completedMilestones: number; loaded: boolean; loadError: boolean; requiresSignIn: boolean }) {
  if (!loaded) return <span className="project-state-badge" role="status">Loading saved status</span>;
  if (requiresSignIn) return <span className="project-state-badge" role="status">Sign in to view status</span>;
  if (loadError) return <span className="project-state-badge project-state-badge--unavailable" role="status">Progress unavailable</span>;
  if (completedMilestones > 0 && (!status || status === "not_started")) return <span className="project-state-badge" role="status">Checkpoint progress saved</span>;
  if (savedDraft && (!status || status === "not_started")) return <span className="project-state-badge" role="status">Draft saved</span>;
  return <StatusPill status={status ?? "not_started"} />;
}

function hasSavedProjectDraft(record?: ProgressSummary) {
  return Boolean(record?.hasContent);
}

function projectHref(projectId: string, active: boolean, nextMilestone?: { id: string }, status?: ProgressStatus) {
  if (!active) return `/projects/${projectId}`;
  if (status === "needs_review") return `/projects/${projectId}#project-review`;
  return nextMilestone ? `/projects/${projectId}#milestone-${nextMilestone.id}` : `/projects/${projectId}#project-review`;
}

function projectActionLabel(active: boolean, nextMilestone?: { id: string }, status?: ProgressStatus) {
  if (!active) return "Open project plan";
  if (status === "needs_review" || !nextMilestone) return "Review handoff";
  return `Resume ${nextMilestone.id}`;
}

function MajorBuildCard({
  project,
  status,
  completedMilestones,
  nextMilestone,
  active,
  savedDraft,
  loaded,
  loadError,
  requiresSignIn,
}: {
  project: MajorProjectSummary;
  status?: ProgressStatus;
  completedMilestones: number;
  nextMilestone?: { id: string; label: string };
  active: boolean;
  savedDraft: boolean;
  loaded: boolean;
  loadError: boolean;
  requiresSignIn: boolean;
}) {
  const tone = project.id === "P2" ? "teal" : project.id === "P3" ? "earth" : "charcoal";
  const href = projectHref(project.id, active, nextMilestone, status);
  return <article className={`major-build-card major-build-card--${tone}${active ? " major-build-card--active" : ""}`} data-project-id={project.id}>
    <div className="major-build-band"><span>{project.id} <i aria-hidden="true">·</i> Major build</span></div>
    <div className="major-build-content">
      <div className="major-build-heading"><h3><Link href={href}>{project.title}</Link></h3><SavedStatus status={status} savedDraft={savedDraft} completedMilestones={completedMilestones} loaded={loaded} loadError={loadError} requiresSignIn={requiresSignIn} /></div>
      <p>{project.purpose}</p>
      <div className="project-card-meta"><span>{project.track}</span><span>{project.estimatedTime}</span><ProjectModuleLinks reference={project.relevantModules} className="project-card-module-links" /></div>
      {project.tools.length > 0 && <p className="project-card-tools">Core stack: {project.tools.slice(0, 3).join(" · ")}{project.tools.length > 3 ? " · more" : ""}</p>}
      {nextMilestone && <div className="major-build-next"><span>{active ? "Next checkpoint" : "First checkpoint"}</span><strong>{nextMilestone.id}</strong><span>{nextMilestone.label}</span></div>}
      <div className="major-build-progress">
        {loaded && !loadError ? <>
          <div className="major-build-progress-label"><span><CheckCircle2 size={15} aria-hidden="true" />Checkpoints self-reported</span><strong>{completedMilestones} / {project.milestones.length}</strong></div>
          <div className="major-build-progress-track" role="progressbar" aria-label={`${project.title} checkpoints self-reported`} aria-valuemin={0} aria-valuemax={project.milestones.length} aria-valuenow={completedMilestones}>
            <span style={{ width: `${project.milestones.length ? (completedMilestones / project.milestones.length) * 100 : 0}%` }} />
          </div>
        </> : <span className="major-build-progress-unavailable">{requiresSignIn ? "Sign in to view private checkpoint progress." : loadError ? "Saved milestone progress could not be read." : "Loading saved milestones…"}</span>}
      </div>
      <div className="major-build-footer"><span>{project.milestones.length} guided checkpoints</span><Link href={href}>{projectActionLabel(active, nextMilestone, status)} <ArrowRight size={14} /></Link></div>
    </div>
  </article>;
}

function SmallToolCard({ project, status, completedMilestones, nextMilestone, active, savedDraft, loaded, loadError, requiresSignIn }: { project: SmallProjectSummary; status?: ProgressStatus; completedMilestones: number; nextMilestone?: { id: string; label: string }; active: boolean; savedDraft: boolean; loaded: boolean; loadError: boolean; requiresSignIn: boolean }) {
  const href = projectHref(project.id, active, nextMilestone, status);
  return <article className="small-tool-card" data-project-id={project.id}>
    <div className="small-tool-top"><span className="small-tool-id">{project.id}</span><SavedStatus status={status} savedDraft={savedDraft} completedMilestones={completedMilestones} loaded={loaded} loadError={loadError} requiresSignIn={requiresSignIn} /></div>
    <h3><Link href={href}>{project.title}</Link></h3>
    <p>{project.problem}</p>
    <div className="project-card-meta"><span>{project.track}</span><span>{project.estimatedTime}</span><ProjectModuleLinks reference={project.relevantModules} className="project-card-module-links" /><span>{project.milestones.length} checkpoints</span></div>
    {project.tools.length > 0 && <p className="project-card-tools">{project.tools.slice(0, 2).join(" · ")}{project.tools.length > 2 ? " · more" : ""}</p>}
    {nextMilestone && <div className="small-project-next"><span>{active ? "Next checkpoint" : "First checkpoint"} · {nextMilestone.id}</span><strong>{nextMilestone.label}</strong></div>}
    {loaded && !loadError && <div className="small-project-progress"><span>{completedMilestones} of {project.milestones.length} checkpoints self-reported</span><span className="major-build-progress-track" role="progressbar" aria-label={`${project.title} checkpoints self-reported`} aria-valuemin={0} aria-valuemax={project.milestones.length} aria-valuenow={completedMilestones}><i style={{ width: `${project.milestones.length ? (completedMilestones / project.milestones.length) * 100 : 0}%` }} /></span></div>}
    <div className="small-tool-footer"><Link href={href}>{projectActionLabel(active, nextMilestone, status)} <ArrowRight size={14} aria-hidden="true" /></Link></div>
  </article>;
}

export function ProjectOverview({ majorProjects, smallProjects }: { majorProjects: MajorProjectSummary[]; smallProjects: SmallProjectSummary[] }) {
  const { records, loaded, loadError, requiresSignIn, accountChanged, sessionUnavailable, retry } = useProgressList();

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
      if (record.itemType !== "project" && record.itemType !== "small_project") continue;
      if (record.status !== "completed" && hasSavedProjectDraft(record)) active.add(record.itemId);
    }
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
    return recordByItem.get(`${itemType}:${projectId}`)?.status;
  }

  function hasSavedDraft(projectId: string, itemType: "project" | "small_project") {
    return hasSavedProjectDraft(recordByItem.get(`${itemType}:${projectId}`));
  }

  return <>
    {sessionUnavailable && <AuthUnavailableNotice message="Your account could not be checked. Saved project progress stays hidden until the account service responds." onRetry={retry} />}
    {accountChanged && <ProgressAccountChangedNotice />}
    <div className="project-overview-stats" aria-label="Project collection summary">
      <div><Rocket size={18} aria-hidden="true" /><strong>{majorProjects.length}</strong><span>major builds</span></div>
      <div><Layers3 size={18} aria-hidden="true" /><strong>{smallProjects.length}</strong><span>focused builds</span></div>
      {requiresSignIn && loaded ? <div className="project-stats-loading" role="status">Sign in to view saved project progress</div> : loaded && !loadError ? <>
        <div><Circle size={17} aria-hidden="true" /><strong>{projectProgress.active}</strong><span>active or saved projects</span></div>
        <div><CheckCircle2 size={17} aria-hidden="true" /><strong>{projectProgress.completed}</strong><span>marked complete</span></div>
      </> : <div className="project-stats-loading" role="status"><RefreshCw size={16} aria-hidden="true" />{loadError ? "Saved progress unavailable" : "Loading saved progress"}</div>}
    </div>

    <section className="project-section" aria-labelledby="small-tools-title">
      <div className="project-section-heading"><div><p className="eyebrow">Start with one operational problem</p><h2 id="small-tools-title">Focused builds</h2><p>Shorter projects (4–9 hours) that turn one operational concept into a reproducible, reviewable tool.</p></div><span className="project-count-tag">{smallProjects.length} projects</span></div>
      <div className="small-tool-grid">
        {orderedSmallProjects.map((project) => {
          const status = statusForProjectCard(project.id, "small_project");
          const nextMilestone = status === "completed" || status === "needs_review" ? undefined : project.milestones.find((milestone) => !completedMilestones.has(milestone.id));
          return <SmallToolCard key={project.id} project={project} status={status} completedMilestones={project.milestones.filter((milestone) => completedMilestones.has(milestone.id)).length} nextMilestone={nextMilestone} active={activeProjectIds.has(project.id)} savedDraft={hasSavedDraft(project.id, "small_project")} loaded={loaded} loadError={loadError} requiresSignIn={requiresSignIn} />;
        })}
      </div>
    </section>

    <section className="project-section" aria-labelledby="major-builds-title">
      <div className="project-section-heading"><div><p className="eyebrow">Combine skills across the roadmap</p><h2 id="major-builds-title">Integrated builds and capstone</h2><p>Longer portfolio work that combines delivery, reliability, security, and recovery.</p></div><span className="project-count-tag">{majorProjects.length} tracks</span></div>
      <div className="major-build-grid">
        {orderedMajorProjects.map((project) => {
          const status = statusForProjectCard(project.id, "project");
          const nextMilestone = status === "completed" || status === "needs_review" ? undefined : project.milestones.find((milestone) => !completedMilestones.has(milestone.id));
          return <MajorBuildCard
            key={project.id}
            project={project}
            status={status}
            completedMilestones={project.milestones.filter((milestone) => completedMilestones.has(milestone.id)).length}
            nextMilestone={nextMilestone}
            active={activeProjectIds.has(project.id)}
            savedDraft={hasSavedDraft(project.id, "project")}
            loaded={loaded}
            loadError={loadError}
            requiresSignIn={requiresSignIn}
          />;
        })}
      </div>
    </section>
  </>;
}
