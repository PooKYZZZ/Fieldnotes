"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, RefreshCw } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProgressSummary, ProgressStatus } from "@/features/progress/model";
import { useProgressList } from "@/features/progress/progress-list-context";
import { AuthUnavailableNotice } from "@/features/auth/auth-unavailable-notice";
import { ProgressAccountChangedNotice } from "@/features/progress/progress-account-changed-notice";
import { ProjectModuleLinks } from "@/features/projects/project-module-links";

export type ProjectSummary = {
  id: string;
  title: string;
  outcome?: string;
  track: string;
  estimatedTime: string;
  relevantModules: string;
  milestones: { id: string; label: string }[];
};

function SavedStatus({ status, savedDraft, completedMilestones, loaded, loadError, requiresSignIn }: { status?: ProgressStatus; savedDraft: boolean; completedMilestones: number; loaded: boolean; loadError: boolean; requiresSignIn: boolean }) {
  if (!loaded || requiresSignIn) return null;
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

function ProjectLedgerRow({
  project,
  major,
  status,
  completedMilestones,
  nextMilestone,
  active,
  savedDraft,
  loaded,
  loadError,
  requiresSignIn,
}: {
  project: ProjectSummary;
  major: boolean;
  status?: ProgressStatus;
  completedMilestones: number;
  nextMilestone?: ProjectSummary["milestones"][number];
  active: boolean;
  savedDraft: boolean;
  loaded: boolean;
  loadError: boolean;
  requiresSignIn: boolean;
}) {
  const href = projectHref(project.id, active, nextMilestone, status);
  const checkpointCount = project.milestones.length;
  const progressVisible = loaded && !loadError && !requiresSignIn && checkpointCount > 0;

  return <article className={`project-ledger-row ${major ? "major-build-card" : "small-tool-card"}`} data-project-id={project.id}>
    <span className="project-ledger-id">{project.id}</span>
    <div className="project-ledger-brief">
      <h3><Link href={href}>{project.title}</Link></h3>
      {project.outcome && <p>{project.outcome}</p>}
      <div className="project-card-meta">
        <span>{project.track}</span><span>{project.estimatedTime}</span><span>{checkpointCount} checkpoints</span>
        <ProjectModuleLinks reference={project.relevantModules} className="project-card-module-links" />
      </div>
    </div>
    <div className="project-ledger-evidence">
      <SavedStatus status={status} savedDraft={savedDraft} completedMilestones={completedMilestones} loaded={loaded} loadError={loadError} requiresSignIn={requiresSignIn} />
      {nextMilestone && <div className={major ? "major-build-next" : "small-project-next"}>
        <span className="project-ledger-checkpoint">{active ? "Next checkpoint" : "First checkpoint"} · {nextMilestone.id}</span>
        <strong className="project-ledger-checkpoint-label">{nextMilestone.label}</strong>
      </div>}
      {progressVisible && <div className="small-project-progress">
        <span>{completedMilestones} of {checkpointCount} checkpoints self-reported</span>
        <span className="major-build-progress-track" role="progressbar" aria-label={`${project.title} checkpoints self-reported`} aria-valuemin={0} aria-valuemax={checkpointCount} aria-valuenow={completedMilestones}>
          <i style={{ width: `${(completedMilestones / checkpointCount) * 100}%` }} />
        </span>
      </div>}
      <div className={major ? "major-build-footer" : "small-tool-footer"}>
        <Link href={href}>{projectActionLabel(active, nextMilestone, status)} <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
    </div>
  </article>;
}

export function ProjectOverview({ majorProjects, smallProjects }: { majorProjects: ProjectSummary[]; smallProjects: ProjectSummary[] }) {
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

  function renderProjectRows(projects: ProjectSummary[], major: boolean) {
    return projects.map((project) => {
      const itemType = major ? "project" : "small_project";
      const record = recordByItem.get(`${itemType}:${project.id}`);
      const status = record?.status;
      const nextMilestone = status === "completed" || status === "needs_review"
        ? undefined
        : project.milestones.find((milestone) => !completedMilestones.has(milestone.id));
      return <ProjectLedgerRow
        key={project.id}
        project={project}
        major={major}
        status={status}
        completedMilestones={project.milestones.filter((milestone) => completedMilestones.has(milestone.id)).length}
        nextMilestone={nextMilestone}
        active={activeProjectIds.has(project.id)}
        savedDraft={hasSavedProjectDraft(record)}
        loaded={loaded}
        loadError={loadError}
        requiresSignIn={requiresSignIn}
      />;
    });
  }

  return <>
    {sessionUnavailable && <AuthUnavailableNotice message="Your account could not be checked. Saved project progress stays hidden until the account service responds." onRetry={retry} />}
    {accountChanged && <ProgressAccountChangedNotice />}
    <nav className="project-overview-stats" aria-label="Project collection summary">
      <a href="#focused-builds">Focused builds <ArrowDown size={14} aria-hidden="true" /></a>
      <a href="#integrated-builds">Integrated builds <ArrowDown size={14} aria-hidden="true" /></a>
      {requiresSignIn && loaded
        ? <Link href="/sign-in?returnTo=%2Fprojects">Sign in to track projects <ArrowRight size={14} aria-hidden="true" /></Link>
        : loaded && !loadError
          ? <div><strong>{projectProgress.active}</strong><span>active or saved projects</span><span aria-hidden="true">·</span><strong>{projectProgress.completed}</strong><span>complete</span></div>
          : <div className="project-stats-loading" role="status"><RefreshCw size={14} aria-hidden="true" />{loadError ? "Saved progress unavailable" : "Loading saved progress"}</div>}
    </nav>

    <section className="project-section" id="focused-builds" aria-labelledby="small-tools-title">
      <div className="project-section-heading"><div><h2 id="small-tools-title">Focused builds</h2><p>Turn one operational concept into a reproducible tool in 4–9 hours.</p></div><span className="project-count-tag">{smallProjects.length} projects</span></div>
      <div className="project-ledger">{renderProjectRows(orderedSmallProjects, false)}</div>
    </section>

    <section className="project-section" id="integrated-builds" aria-labelledby="major-builds-title">
      <div className="project-section-heading"><div><h2 id="major-builds-title">Integrated builds and capstone</h2><p>Longer portfolio work combining delivery, reliability, security, and recovery.</p></div><span className="project-count-tag">{majorProjects.length} projects</span></div>
      <div className="project-ledger">{renderProjectRows(orderedMajorProjects, true)}</div>
    </section>
  </>;
}
