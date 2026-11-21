"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, RefreshCw, X } from "lucide-react";
import { MarkdownContent } from "@/components/ui/markdown-content";
import type { ProjectMilestone } from "@/content";
import { ProgressEditor } from "@/features/progress/progress-editor";
import { useModalInertSiblings } from "@/features/ui/use-modal-inert-siblings";
import { ProgressSignInNotice } from "@/features/auth/progress-sign-in-notice";
import type { ProgressInput } from "@/features/progress/model";
import { useProgressList } from "@/features/progress/progress-list-context";
import { useAuthSession } from "@/features/auth/auth-session-context";
import { progressAccountHeaders } from "@/features/progress/progress-draft";

function subscribeToLocationChanges(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function locationHashSnapshot(): string {
  return window.location.hash;
}

type ProjectMilestoneProps = {
  projectId: string;
  projectType: "project" | "small_project";
  milestones: ProjectMilestone[];
};

export function ProjectMilestoneWorkbench(props: ProjectMilestoneProps) {
  const { userId } = useAuthSession();
  return <ProjectMilestoneContent key={userId ?? "guest"} {...props} userId={userId} />;
}

function ProjectMilestoneContent({ projectId, projectType, milestones, userId }: ProjectMilestoneProps & { userId?: string }) {
  const [selectedOverride, setSelectedOverride] = useState<string>();
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [savedChanges, setSavedChanges] = useState<Map<string, { complete: boolean; revision: number }>>(new Map());
  const [message, setMessage] = useState("");
  const [mobileNotebookOpen, setMobileNotebookOpen] = useState(false);
  const { records, loaded, loadError, requiresSignIn, retry } = useProgressList();
  const loading = !loaded;
  const locationHash = useSyncExternalStore(subscribeToLocationChanges, locationHashSnapshot, () => "");
  const savedMilestones = useMemo(() => {
    const milestonesById = new Map(records
      .filter((row) => row.itemType === "milestone")
      .map((row) => [row.itemId, { complete: row.status === "completed", revision: row.revision }]));
    for (const [id, saved] of savedChanges) {
      if (saved.revision > (milestonesById.get(id)?.revision ?? 0)) milestonesById.set(id, saved);
    }
    return milestonesById;
  }, [records, savedChanges]);
  const completed = useMemo(() => {
    const complete = new Set([...savedMilestones].filter(([, saved]) => saved.complete).map(([id]) => id));
    for (const [id, pending] of pendingChanges) {
      if (pending) complete.add(id);
      else complete.delete(id);
    }
    return complete;
  }, [savedMilestones, pendingChanges]);
  const linkedCheckpointId = locationHash.startsWith("#milestone-") ? locationHash.slice("#milestone-".length) : "";
  const linkedCheckpoint = milestones.find(({ id }) => id === linkedCheckpointId);
  const selectedId = selectedOverride
    ?? linkedCheckpoint?.id
    ?? milestones.find(({ id }) => !completed.has(id))?.id
    ?? milestones[0]?.id
    ?? "";
  const notebookRef = useRef<HTMLElement>(null);
  const closeNotebookRef = useRef<HTMLButtonElement>(null);
  useModalInertSiblings(notebookRef, mobileNotebookOpen);
  const notebookToggleRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1180px)");
    const closeOnDesktop = () => { if (!media.matches) setMobileNotebookOpen(false); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  async function toggle(milestone: ProjectMilestone) {
    if (!userId || pendingChanges.has(milestone.id)) return;
    const current = savedMilestones.get(milestone.id);
    const complete = !current?.complete;
    setSelectedOverride(milestone.id);
    setPendingChanges((previous) => new Map(previous).set(milestone.id, complete));
    setMessage("Saving checkpoint…");
    const input: ProgressInput = {
      itemType: "milestone",
      itemId: milestone.id,
      status: complete ? "completed" : "not_started",
      comfort: null,
      notes: "",
      evidence: "",
      repositoryUrl: "",
    };
    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: progressAccountHeaders(userId, true),
        body: JSON.stringify({ record: input, expectedRevision: current?.revision ?? null }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409) retry();
        const serverMessage = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Could not save this project checkpoint.";
        throw new Error(serverMessage);
      }
      if (typeof result !== "object" || result === null || !("revision" in result) || typeof result.revision !== "number") {
        throw new Error("The server returned an unexpected checkpoint save response.");
      }
      const revision = result.revision;
      setSavedChanges((previous) => new Map(previous).set(milestone.id, { complete, revision }));
      setMessage("Checkpoint progress saved.");
      window.dispatchEvent(new CustomEvent("progress-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this project checkpoint.");
    } finally {
      setPendingChanges((previous) => {
        const next = new Map(previous);
        next.delete(milestone.id);
        return next;
      });
    }
  }

  function retryLoad() {
    setMessage("");
    retry();
  }

  function selectMilestone(id: string) {
    setSelectedOverride(id);
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
          <span>{requiresSignIn ? "Sign in to view saved progress" : `${completedCount} self-reported complete`}</span>
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
              disabled={loading}
              onClick={() => selectMilestone(milestone.id)}
            >
              <span className="project-checkpoint-map-number">{String(index + 1).padStart(2, "0")}</span>
            </button>;
          })}
        </nav>
      </div>

      {requiresSignIn && <ProgressSignInNotice>Your checkpoint states and notes are private to your account. Sign in to save or review them; the project guidance remains open.</ProgressSignInNotice>}

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
              disabled={loading || loadError || requiresSignIn || pendingChanges.has(activeMilestone.id)}
              onChange={() => void toggle(activeMilestone)}
            />
            <span>{pendingChanges.has(activeMilestone.id) ? "Saving" : completed.has(activeMilestone.id) ? "Self-reported complete" : "Mark checkpoint done"}</span>
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

      {activeMilestone?.hints.length ? <details className="project-milestone-hints">
        <summary>Need a hint? Reveal one nudge at a time.</summary>
        <ol>
          {activeMilestone.hints.map((hint, index) => <li key={activeMilestone.id + "-" + index}>
            <details className="project-milestone-hint">
              <summary><span>Hint {index + 1}</span>{hint.title}</summary>
              <div className="project-milestone-hint-copy"><MarkdownContent>{hint.content}</MarkdownContent></div>
            </details>
          </li>)}
        </ol>
      </details> : null}

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
        disabled={loading}
        onClick={() => setMobileNotebookOpen(true)}
      >
        <BookOpen size={16} aria-hidden="true" /> Record a note for this checkpoint
      </button>
    </div>

    {mobileNotebookOpen && <button className="project-notebook-backdrop" data-modal-dismiss type="button" aria-label="Dismiss project notebook backdrop" onClick={() => setMobileNotebookOpen(false)} />}
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
