"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, RefreshCw, X } from "lucide-react";
import { MarkdownContent } from "@/components/ui/markdown-content";
import type { ProjectMilestone } from "@/content";
import { ProgressEditor } from "@/features/progress/progress-editor";
import type { ProgressInput, ProgressRecord } from "@/features/progress/model";

export function ProjectMilestoneWorkbench({ projectId, projectType, milestones }: {
  projectId: string;
  projectType: "project" | "small_project";
  milestones: ProjectMilestone[];
}) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState(milestones[0]?.id ?? "");
  const [saving, setSaving] = useState<string>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [mobileNotebookOpen, setMobileNotebookOpen] = useState(false);
  const userSelectedRef = useRef(false);
  const notebookRef = useRef<HTMLElement>(null);
  const closeNotebookRef = useRef<HTMLButtonElement>(null);
  const notebookToggleRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/progress", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load saved project checkpoints.");
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        const milestoneIds = new Set(milestones.map(({ id }) => id));
        const savedCompleted = new Set(rows
          .filter((row) => row.itemType === "milestone" && row.status === "completed" && milestoneIds.has(row.itemId))
          .map((row) => row.itemId));
        setCompleted(savedCompleted);
        if (!userSelectedRef.current) {
          const linkedMilestoneId = window.location.hash.startsWith("#milestone-")
            ? window.location.hash.slice("#milestone-".length)
            : "";
          const linkedMilestone = milestones.find(({ id }) => id === linkedMilestoneId);
          setSelectedId(linkedMilestone?.id ?? milestones.find(({ id }) => !savedCompleted.has(id))?.id ?? milestones[0]?.id ?? "");
        }
        setLoadError(false);
        setMessage("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(true);
        setMessage(error instanceof Error ? error.message : "Saved checkpoint states could not be loaded.");
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return controller;
  }, [milestones]);

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, [load, loadAttempt]);

  useEffect(() => {
    function selectLinkedCheckpoint() {
      if (!window.location.hash.startsWith("#milestone-")) return;
      const linkedId = window.location.hash.slice("#milestone-".length);
      if (!milestones.some(({ id }) => id === linkedId)) return;
      userSelectedRef.current = true;
      setSelectedId(linkedId);
    }
    window.addEventListener("hashchange", selectLinkedCheckpoint);
    return () => window.removeEventListener("hashchange", selectLinkedCheckpoint);
  }, [milestones]);

  useEffect(() => {
    if (!mobileNotebookOpen) return;
    const previousFocus = document.activeElement;
    const returnFocusTarget = notebookToggleRef.current;
    closeNotebookRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNotebookOpen(false);
        return;
      }
      if (event.key !== "Tab" || !notebookRef.current) return;
      const controls = [...notebookRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      else returnFocusTarget?.focus();
    };
  }, [mobileNotebookOpen]);

  async function toggle(milestone: ProjectMilestone) {
    const isComplete = completed.has(milestone.id);
    setSaving(milestone.id);
    setMessage("Saving checkpoint…");
    setCompleted((previous) => {
      const next = new Set(previous);
      if (isComplete) next.delete(milestone.id); else next.add(milestone.id);
      return next;
    });
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
      setMessage("Checkpoint progress saved.");
      window.dispatchEvent(new CustomEvent("progress-updated"));
    } catch (error) {
      setCompleted((previous) => {
        const next = new Set(previous);
        if (isComplete) next.add(milestone.id); else next.delete(milestone.id);
        return next;
      });
      setMessage(error instanceof Error ? error.message : "Could not save this project checkpoint.");
    } finally {
      setSaving(undefined);
    }
  }

  function retryLoad() {
    setLoading(true);
    setLoadError(false);
    setMessage("");
    setLoadAttempt((attempt) => attempt + 1);
  }

  function selectMilestone(id: string) {
    userSelectedRef.current = true;
    setSelectedId(id);
    setMessage("");
    window.history.replaceState(null, "", `#milestone-${id}`);
  }

  const selectedIndex = Math.max(0, milestones.findIndex(({ id }) => id === selectedId));
  const activeMilestone = milestones[selectedIndex];
  const completedCount = milestones.filter(({ id }) => completed.has(id)).length;

  useEffect(() => {
    if (!activeMilestone || window.location.hash !== `#milestone-${activeMilestone.id}`) return;
    requestAnimationFrame(() => document.getElementById(`milestone-${activeMilestone.id}`)?.scrollIntoView({ block: "start" }));
  }, [activeMilestone]);

  return <div className="project-build-workspace">
    <div className="project-build-main">
      <div className="project-build-selector">
        <div className="project-build-progress-copy">
          <strong>{milestones.length} build checkpoints</strong>
          <span>{completedCount} self-reported complete</span>
        </div>
        <nav className="project-checkpoint-map" aria-label="Build checkpoints">
          {milestones.map((milestone, index) => {
            const current = milestone.id === activeMilestone?.id;
            const isComplete = completed.has(milestone.id);
            return <button
              key={milestone.id}
              className="project-checkpoint-map-item"
              type="button"
              aria-current={current ? "step" : undefined}
              aria-pressed={current}
              aria-label={`${milestone.id}: ${milestone.label}. ${current ? "Current checkpoint" : isComplete ? "Self-reported complete" : "Not started"}`}
              title={`${milestone.id} · ${milestone.label}`}
              data-complete={isComplete || undefined}
              disabled={loading || loadError}
              onClick={() => selectMilestone(milestone.id)}
            >
              <span className="project-checkpoint-map-number">{String(index + 1).padStart(2, "0")}</span>
            </button>;
          })}
        </nav>
      </div>

      {activeMilestone ? <article className="project-active-milestone" id={`milestone-${activeMilestone.id}`} aria-labelledby={`milestone-title-${activeMilestone.id}`}>
        <div className="project-active-milestone-heading">
          <div>
            <p className="eyebrow">Checkpoint {selectedIndex + 1} of {milestones.length} · {activeMilestone.id}</p>
            <h3 id={`milestone-title-${activeMilestone.id}`}>{activeMilestone.label}</h3>
          </div>
          <label className="project-milestone-toggle" htmlFor={`milestone-check-${activeMilestone.id}`}>
            <input
              id={`milestone-check-${activeMilestone.id}`}
              type="checkbox"
              checked={completed.has(activeMilestone.id)}
              disabled={loading || loadError || saving === activeMilestone.id}
              onChange={() => void toggle(activeMilestone)}
            />
            <span>{saving === activeMilestone.id ? "Saving" : completed.has(activeMilestone.id) ? "Self-reported complete" : "Mark checkpoint done"}</span>
          </label>
        </div>
        <div className="project-active-milestone-guidance"><MarkdownContent>{activeMilestone.guidance}</MarkdownContent></div>
        <div className="project-milestone-navigation">
          <button className="button button-outline" type="button" disabled={selectedIndex === 0} onClick={() => selectMilestone(milestones[selectedIndex - 1].id)}>
            <ArrowLeft size={14} aria-hidden="true" /> Previous checkpoint
          </button>
          <button className="button button-outline" type="button" disabled={selectedIndex >= milestones.length - 1} onClick={() => selectMilestone(milestones[selectedIndex + 1].id)}>
            Next checkpoint <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </article> : <p>This project does not have any checkpoints yet.</p>}

      {loading && <p className="form-message" role="status">Loading saved project checkpoints…</p>}
      {!loading && loadError && <button className="button button-outline" type="button" onClick={retryLoad}><RefreshCw size={14} aria-hidden="true" /> Try loading checkpoints again</button>}
      <p className="form-message project-checkpoint-message" role="status" aria-live="polite">{message}</p>
      {!loading && !loadError && <p className="project-milestone-footnote"><Check size={13} aria-hidden="true" /> Checkpoint states are self-reported. Save the evidence and explain what each check supports in your project notebook.</p>}
      <button
        ref={notebookToggleRef}
        className="project-notebook-mobile-toggle"
        type="button"
        aria-label="Open project notebook for this checkpoint"
        aria-expanded={mobileNotebookOpen}
        onClick={() => setMobileNotebookOpen(true)}
      >
        <BookOpen size={16} aria-hidden="true" /> Record a note for this checkpoint
      </button>
    </div>

    {mobileNotebookOpen && <button className="project-notebook-backdrop" type="button" aria-label="Dismiss project notebook backdrop" onClick={() => setMobileNotebookOpen(false)} />}
    <aside ref={notebookRef} className={`project-notebook${mobileNotebookOpen ? " project-notebook--open" : ""}`} aria-label="Project notebook" role={mobileNotebookOpen ? "dialog" : undefined} aria-modal={mobileNotebookOpen || undefined}>
      <div className="project-notebook-mobile-head">
        <p className="eyebrow"><BookOpen size={14} aria-hidden="true" /> One shared project record</p>
        <button ref={closeNotebookRef} className="project-notebook-close" type="button" onClick={() => setMobileNotebookOpen(false)}><X size={16} aria-hidden="true" /> Close</button>
      </div>
      <div className="project-notebook-content">
        {activeMilestone && <div className="project-notebook-context" aria-live="polite">
          <p className="eyebrow">Checkpoint-specific note</p>
          <strong>{activeMilestone.id} · {activeMilestone.label}</strong>
          <span>The note below is saved to this checkpoint inside the same project record.</span>
        </div>}
        <ProgressEditor
          itemType={projectType}
          itemId={projectId}
          title="Project notebook"
          variant="project-workbench"
          checkpointContext={activeMilestone ? { id: activeMilestone.id, label: activeMilestone.label } : undefined}
        />
      </div>
    </aside>
  </div>;
}
