"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MarkdownContent } from "@/components/ui/markdown-content";
import type { ProjectMilestone } from "@/content";
import type { ProgressInput, ProgressRecord } from "@/features/progress/model";

export function MilestoneChecklist({ milestones }: { milestones: ProjectMilestone[] }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    fetch("/api/progress", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load saved project checkpoints.");
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        const milestoneIds = new Set(milestones.map(({ id }) => id));
        setCompleted(new Set(rows.filter((row) => row.itemType === "milestone" && row.status === "completed" && milestoneIds.has(row.itemId)).map((row) => row.itemId)));
        setLoadError(false);
        setMessage("");
      })
      .catch(() => {
        setLoadError(true);
        setMessage("Saved checkpoint states could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, [milestones]);

  useEffect(() => { load(); }, [load]);

  async function toggle(milestone: ProjectMilestone) {
    const isComplete = completed.has(milestone.id);
    setSaving(milestone.id);
    setMessage("Saving checkpoint…");
    const input: ProgressInput = {
      itemType: "milestone",
      itemId: milestone.id,
      status: isComplete ? "not_started" : "completed",
      comfort: null,
      notes: "",
      evidence: "",
      repositoryUrl: "",
    };
    try {
      const response = await fetch("/api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error("Could not save this project checkpoint.");
      setCompleted((previous) => {
        const next = new Set(previous);
        if (isComplete) next.delete(milestone.id); else next.add(milestone.id);
        return next;
      });
      setMessage("Checkpoint progress saved.");
      window.dispatchEvent(new CustomEvent("progress-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this project checkpoint.");
    } finally {
      setSaving(undefined);
    }
  }

  function retryLoad() {
    setLoading(true);
    setLoadError(false);
    setMessage("");
    load();
  }

  return <>
    <ol className="project-milestone-list">
      {milestones.map((milestone, index) => {
        const isComplete = completed.has(milestone.id);
        return <li className={`project-milestone${isComplete ? " project-milestone--complete" : ""}`} id={`milestone-${milestone.id}`} key={milestone.id}>
          <div className="project-milestone-heading">
            <div className="project-milestone-title-group"><span className="project-milestone-number">{String(index + 1).padStart(2, "0")}</span><div><span className="project-milestone-id">{milestone.id}</span><h3>{milestone.label}</h3></div></div>
            <label className="project-milestone-toggle" htmlFor={`milestone-check-${milestone.id}`}>
              <input id={`milestone-check-${milestone.id}`} type="checkbox" checked={isComplete} disabled={loading || loadError || saving === milestone.id} onChange={() => toggle(milestone)} />
              <span>{saving === milestone.id ? "Saving" : isComplete ? "Checkpoint done" : "Mark done"}</span>
            </label>
          </div>
          <details className="project-milestone-guide">
            <summary><span>Open the work and checkpoint guide</span><ChevronDown size={15} aria-hidden="true" /></summary>
            <div className="project-milestone-guide-body"><MarkdownContent>{milestone.guidance}</MarkdownContent></div>
          </details>
        </li>;
      })}
    </ol>
    {loading && <p className="form-message" role="status">Loading saved project checkpoints…</p>}
    {!loading && loadError && <button className="button button-outline" type="button" onClick={retryLoad}>Try loading checkpoints again</button>}
    <p className="form-message" role="status" aria-live="polite">{message}</p>
    {!loading && !loadError && <p className="project-milestone-footnote"><Check size={13} aria-hidden="true" /> Checklist states are self-reported; use the linked evidence to explain what you verified.</p>}
  </>;
}
