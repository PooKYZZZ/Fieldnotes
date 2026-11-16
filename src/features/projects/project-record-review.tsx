"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, NotebookPen } from "lucide-react";
import type { ProjectMilestone } from "@/content";
import { formatStatus, type ProgressRecord } from "@/features/progress/model";

export function ProjectRecordReview({ projectId, projectType, milestones }: {
  projectId: string;
  projectType: "project" | "small_project";
  milestones: ProjectMilestone[];
}) {
  const [record, setRecord] = useState<ProgressRecord>();
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const load = useCallback((signal: AbortSignal) => {
    fetch("/api/progress", { cache: "no-store", signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the saved project record.");
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        const milestoneIds = new Set(milestones.map(({ id }) => id));
        setRecord(rows.find((row) => row.itemType === projectType && row.itemId === projectId));
        setCompletedMilestones(new Set(rows.filter((row) => row.itemType === "milestone" && row.status === "completed" && milestoneIds.has(row.itemId)).map((row) => row.itemId)));
        setLoadError(false);
      })
      .catch(() => {
        if (signal.aborted) return;
        setLoadError(true);
        setRecord(undefined);
        setCompletedMilestones(new Set());
      })
      .finally(() => !signal.aborted && setLoading(false));
  }, [milestones, projectId, projectType]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const refresh = () => {
      setLoading(true);
      load(controller.signal);
    };
    window.addEventListener("progress-updated", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("progress-updated", refresh);
    };
  }, [load, loadAttempt]);

  function retryLoad() {
    setLoading(true);
    setLoadError(false);
    setLoadAttempt((attempt) => attempt + 1);
  }

  return <section className="project-record-review" aria-labelledby={`project-record-review-${projectId}`}>
    <div className="project-record-review-heading">
      <div><p className="eyebrow"><NotebookPen size={14} aria-hidden="true" /> One shared record</p><h3 id={`project-record-review-${projectId}`}>Review your saved project notes</h3></div>
      <Link href="/progress?type=project" className="project-record-history">Progress notebook <ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
    {loading ? <p className="project-record-review-empty" role="status">Loading your saved project record…</p>
      : loadError ? <div className="project-record-review-empty" role="status"><p>The saved project record could not be loaded.</p><button className="button button-outline" type="button" onClick={retryLoad}>Retry loading the record</button></div>
      : <>
        {record ? <div className="project-record-review-state"><span>Self-reported status</span><strong>{formatStatus(record.status)}</strong><span>{record.updatedAt ? `Last saved ${new Date(record.updatedAt).toLocaleString()}` : "Saved project record"}</span></div>
          : <div className="project-record-review-empty"><p>No project record has been saved yet. You can start a draft at any checkpoint and finish this review later.</p><Link className="button button-outline" href="#project-build">Open the project notebook <ArrowRight size={14} aria-hidden="true" /></Link></div>}
        <div className="project-checkpoint-review">
          <h4>Build checkpoints</h4>
          <ul>{milestones.map((milestone, index) => <li key={milestone.id}>
            <span className="project-checkpoint-review-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="project-checkpoint-review-copy">
              <strong>{milestone.id} · {milestone.label}</strong>
              <small>{completedMilestones.has(milestone.id) ? "Self-reported complete" : "Not marked complete"}{record?.taskObservations?.[milestone.id]?.trim() ? " · Note saved" : " · No checkpoint note"}</small>
              {record?.taskObservations?.[milestone.id]?.trim() && <p className="project-checkpoint-review-note">{record.taskObservations[milestone.id]}</p>}
            </span>
            <a href={`/projects/${projectId}#milestone-${milestone.id}`}>Review checkpoint</a>
          </li>)}</ul>
        </div>
        {record && <>
          <div className="project-record-review-fields">
            <div><h4>Engineering log</h4><p>{record.notes.trim() || "No engineering notes saved yet."}</p></div>
            <div><h4>Verification and evidence</h4><p>{record.evidence.trim() || "No verification evidence saved yet."}</p></div>
          </div>
          {record.repositoryUrl.trim() && <a className="project-record-review-repository" href={record.repositoryUrl} target="_blank" rel="noreferrer">Open the saved project link <ExternalLink size={13} aria-hidden="true" /></a>}
          <div className="project-record-review-footer"><span>This review shows the same saved project record. It does not verify your implementation.</span><Link className="button button-outline" href="#project-build">Edit in the build notebook <ArrowRight size={14} aria-hidden="true" /></Link></div>
        </>}
      </>}
  </section>;
}
