"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProgressInput, ProgressRecord } from "@/features/progress/model";

type Milestone = { id: string; label: string };

export function MilestoneChecklist({ projectId, milestones }: { projectId: string; milestones: Milestone[] }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const load = useCallback(() => {
    fetch("/api/progress", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load saved milestone states.");
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        const prefix = projectId === "P3" ? "C" : `${projectId}.`;
        setCompleted(new Set(rows.filter((row) => row.itemType === "milestone" && row.status === "completed" && row.itemId.startsWith(prefix)).map((row) => row.itemId)));
      })
      .catch(() => {
        setLoadError(true);
        setMessage("Could not load saved milestone states.");
      })
      .finally(() => setLoading(false));
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  async function toggle(milestone: Milestone) {
    const isComplete = completed.has(milestone.id);
    setSaving(milestone.id);
    setMessage("");
    const input: ProgressInput = {
      itemType: "milestone",
      itemId: milestone.id,
      status: isComplete ? "not_started" : "completed",
      comfort: null,
      notes: "",
      evidence: "",
      repositoryUrl: "",
    };
    setMessage("Saving milestone…");
    try {
      const response = await fetch("/api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error("Could not save this milestone.");
      setCompleted((previous) => {
        const next = new Set(previous);
        if (isComplete) next.delete(milestone.id); else next.add(milestone.id);
        return next;
      });
      setMessage("Milestone progress saved on this device.");
      window.dispatchEvent(new CustomEvent("progress-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this milestone.");
    } finally { setSaving(undefined); }
  }

  function retryLoad() {
    setLoading(true);
    setLoadError(false);
    setMessage("");
    load();
  }

  return <>
    <ul className="milestone-list">{milestones.map((milestone) => <li className="milestone-row" key={milestone.id}>
      <input id={`milestone-${milestone.id}`} type="checkbox" checked={completed.has(milestone.id)} disabled={loading || loadError || saving === milestone.id} onChange={() => toggle(milestone)} />
      <label htmlFor={`milestone-${milestone.id}`}><strong>{milestone.id}</strong> · {milestone.label}</label>
    </li>)}</ul>
    {loading && <p className="form-message" role="status">Loading saved milestones…</p>}
    {!loading && loadError && <button className="button button-outline" type="button" onClick={retryLoad}>Try loading again</button>}
    <p className="form-message" role="status" aria-live="polite">{message}</p>
  </>;
}

