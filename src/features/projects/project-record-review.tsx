"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, NotebookPen } from "lucide-react";
import type { ProjectMilestone } from "@/content";
import { formatStatus, type ProgressRecord } from "@/features/progress/model";
import { ProgressSignInNotice } from "@/features/auth/progress-sign-in-notice";

export function ProjectRecordReview({ projectId, projectType, milestones }: {
  projectId: string;
  projectType: "project" | "small_project";
  milestones: ProjectMilestone[];
}) {
  const [record, setRecord] = useState<ProgressRecord>();
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const load = useCallback((signal: AbortSignal) => {
    fetch("/api/progress", { cache: "no-store", signal })
      .then((response) => {
        if (response.status === 401) {
          setRequiresSignIn(true);
          setLoadError(false);
          setRecord(undefined);
          setCompletedMilestones(new Set());
          return null;
        }
        if (!response.ok) throw new Error("Could not load the saved project record.");
        setRequiresSignIn(false);
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        if (!rows) return;
        const milestoneIds = new Set(milestones.map(({ id }) => id));
        setRecord(rows.find((row) => row.itemType === projectType && row.itemId === projectId));
        setCompletedMilestones(new Set(rows.filter((row) => row.itemType === "milestone" && row.status === "completed" && milestoneIds.has(row.itemId)).map((row) => row.itemId)));
        setLoadError(false);
      })
      .catch(() => {
        if (signal.aborted) return;
        setRequiresSignIn(false);
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
    setRequiresSignIn(false);
    setLoadAttempt((attempt) => attempt + 1);
  }

  const recordedMilestones = milestones.flatMap((milestone, index) => {
    const note = record?.taskObservations?.[milestone.id]?.trim() ?? "";
    const complete = completedMilestones.has(milestone.id);
    return note || complete ? [{ milestone, index, note, complete }] : [];
  });

  return <section className="project-record-review" aria-labelledby={`project-record-review-${projectId}`}>
    <div className="project-record-review-heading">
      <div><p className="eyebrow"><NotebookPen size={14} aria-hidden="true" /> One shared record</p><h3 id={`project-record-review-${projectId}`}>Review your saved project notes</h3></div>
      <Link href="/progress?type=project" className="project-record-history">Progress notebook <ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
    {loading ? <p className="project-record-review-empty" role="status">Loading your saved project record…</p>
      : requiresSignIn ? <ProgressSignInNotice>Your project notes and checkpoint states are private to your account. Sign in to review them; the project guide stays public.</ProgressSignInNotice>
      : loadError ? <div className="project-record-review-empty" role="status"><p>The saved project record could not be loaded.</p><button className="button button-outline" type="button" onClick={retryLoad}>Retry loading the record</button></div>
      : <>
        {record ? <div className="project-record-review-state"><span>Overall project status · self-reported</span><strong>{formatStatus(record.status)}</strong><span>{record.updatedAt ? `Last saved ${new Date(record.updatedAt).toLocaleString()}` : "Saved project record"}</span></div>
      : <div className="project-record-review-empty"><p>No project record has been saved yet. You can start a draft at any checkpoint and finish this review later.</p><a className="button button-outline" href="#project-build">Open the project notebook <ArrowRight size={14} aria-hidden="true" /></a></div>}
        {(record || recordedMilestones.length > 0) && <div className="project-checkpoint-review">
          <h4>Checkpoint evidence</h4>
          <p className="project-checkpoint-review-summary">{recordedMilestones.length} of {milestones.length} checkpoints have a saved note or self-reported completion.</p>
          {recordedMilestones.length > 0
            ? <ul>{recordedMilestones.map(({ milestone, index, note, complete }) => <li key={milestone.id}>
              <span className="project-checkpoint-review-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="project-checkpoint-review-copy">
                <strong>{milestone.id} · {milestone.label}</strong>
                <small>{complete ? "Self-reported complete" : "Not marked complete"}{note ? " · Note saved" : ""}</small>
                {note && <p className="project-checkpoint-review-note">{note}</p>}
              </span>
              <a href={`/projects/${projectId}#milestone-${milestone.id}`}>Review checkpoint</a>
            </li>)}</ul>
            : <p className="project-checkpoint-review-empty">No checkpoint notes or completion states have been saved yet. Use Build when you are ready to record your work.</p>}
          {recordedMilestones.length > 0 && recordedMilestones.length < milestones.length && <p className="project-checkpoint-review-summary">Other checkpoints have no saved note or completion state yet.</p>}
        </div>}
        {record && <>
          <div className="project-record-review-fields">
            <div><h4>Engineering log</h4><p>{record.notes.trim() || "No engineering notes saved yet."}</p></div>
            <div><h4>Verification and evidence</h4><p>{record.evidence.trim() || "No verification evidence saved yet."}</p></div>
          </div>
          {record.repositoryUrl.trim() && <a className="project-record-review-repository" href={record.repositoryUrl} target="_blank" rel="noreferrer">Open the saved project link <ExternalLink size={13} aria-hidden="true" /></a>}
          <div className="project-record-review-footer"><span>This review shows the same saved project record. It does not verify your implementation.</span><a className="button button-outline" href="#project-build">Edit in the build notebook <ArrowRight size={14} aria-hidden="true" /></a></div>
        </>}
      </>}
  </section>;
}
