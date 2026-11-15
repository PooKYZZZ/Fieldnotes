"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Check, RefreshCw, Save, X } from "lucide-react";
import type { ActivityRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatStatus, type ComfortLevel, type ProgressInput, type ProgressRecord, type ProgressStatus } from "@/features/progress/model";

const taskPrompts = [
  {
    title: "Confirm your account",
    prompt: "Record the account and numeric UID used for the investigation. The UID is the value the next command uses to find your processes.",
  },
  {
    title: "Choose a process you own",
    prompt: "Record one familiar PID and its sanitized row values. Note which values might change if you check again later.",
  },
  {
    title: "Compare the process with /proc",
    prompt: "Record whether the PID still exists, which fields agree, and one descriptor resource type. Leave private paths out.",
  },
  {
    title: "Check its systemd unit",
    prompt: "Record the unit name and whether it is a service, scope, another unit, or no result. Include any access or systemd limitation.",
  },
  {
    title: "Explain the evidence boundary",
    prompt: "Use one observation to explain what the snapshot supports, what it cannot prove, and how an application request reaches the kernel.",
  },
] as const;

function blankRecord(itemId: string): ProgressInput {
  return {
    itemType: "activity",
    itemId,
    status: "not_started",
    comfort: null,
    notes: "",
    evidence: "",
    repositoryUrl: "",
  };
}

function savedFields(record: ProgressRecord): ProgressInput {
  return {
    itemType: record.itemType,
    itemId: record.itemId,
    status: record.status,
    comfort: record.comfort,
    notes: record.notes,
    evidence: record.evidence,
    repositoryUrl: record.repositoryUrl,
  };
}

export function A01InvestigationWorkbench({ activity }: { activity: ActivityRecord }) {
  const [record, setRecord] = useState<ProgressInput>(() => blankRecord(activity.id));
  const [updatedAt, setUpdatedAt] = useState<number>();
  const [activeTask, setActiveTask] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [mobileNotebookOpen, setMobileNotebookOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageLocation, setMessageLocation] = useState<"notebook" | "review">("notebook");
  const [error, setError] = useState(false);
  const notebookNotesId = `notes-${activity.id}`;
  const notebookEvidenceId = `evidence-${activity.id}`;
  const taskPromptId = `activity-a01-task-prompt-${activity.id}`;
  const disabled = loading || loadFailed || saving;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ itemType: "activity", itemId: activity.id });
    fetch(`/api/progress?${query.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load this activity’s saved record.");
        const rows = await response.json() as ProgressRecord[];
        if (!Array.isArray(rows)) throw new Error("The saved record response was unexpected.");
        const saved = rows[0];
        if (saved) {
          setRecord(savedFields(saved));
          setUpdatedAt(saved.updatedAt);
        }
        setIsDirty(false);
        setMessage("");
        setError(false);
        setLoadFailed(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadFailed(true);
        setError(true);
        setMessage("The saved record could not be loaded. Retry before editing so existing notes are protected.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [activity.id, loadAttempt]);

  useEffect(() => {
    const updateActiveTask = () => {
      const items = document.querySelectorAll<HTMLElement>("#activity-steps ol > li");
      if (!items.length) return;
      const focusLine = window.innerHeight * 0.38;
      let current = 0;
      items.forEach((item, index) => {
        if (item.getBoundingClientRect().top <= focusLine) current = index;
      });
      setActiveTask(Math.min(current, taskPrompts.length - 1));
    };
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveTask();
      });
    };
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!mobileNotebookOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNotebookOpen(false);
        requestAnimationFrame(() => document.getElementById("a01-mobile-notebook-toggle")?.focus());
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNotebookOpen]);

  useEffect(() => {
    const revealLinkedNotebook = () => {
      if (window.location.hash !== `#progress-editor-${activity.id}`) return;
      setMobileNotebookOpen(true);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        document.getElementById(`progress-editor-${activity.id}`)?.scrollIntoView({ block: "start" });
      }));
    };
    revealLinkedNotebook();
    window.addEventListener("hashchange", revealLinkedNotebook);
    return () => window.removeEventListener("hashchange", revealLinkedNotebook);
  }, [activity.id]);

  async function save(status: ProgressStatus, location: "notebook" | "review") {
    setSaving(true);
    setMessageLocation(location);
    setError(false);
    setMessage("");
    const value: ProgressInput = { ...record, status };
    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorText = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "The activity record could not be saved.";
        throw new Error(errorText);
      }
      if (typeof body !== "object" || body === null || !("updatedAt" in body) || typeof body.updatedAt !== "number") {
        throw new Error("The server returned an unexpected save response.");
      }
      const saved = body as ProgressRecord;
      setRecord(savedFields(saved));
      setUpdatedAt(saved.updatedAt);
      setIsDirty(false);
      setMessageLocation(location);
      setMessage(status === "completed" ? "Activity marked complete on this device." : "Draft saved on this device.");
      window.dispatchEvent(new CustomEvent("progress-updated"));
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "The activity record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ProgressInput>(key: K, value: ProgressInput[K]) {
    setRecord((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
    setError(false);
    setMessage("");
  }

  function retryLoad() {
    setLoading(true);
    setLoadFailed(false);
    setError(false);
    setMessage("");
    setLoadAttempt((attempt) => attempt + 1);
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save("in_progress", "notebook");
  }

  const task = taskPrompts[activeTask];
  const savedText = updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet";
  const notebookState = loading ? "Loading saved notes" : loadFailed ? "Saved notes unavailable" : isDirty ? "Unsaved changes" : formatStatus(record.status);

  return (
    <>
      <section className="activity-stage activity-a01-investigate" id="activity-perform" aria-labelledby="activity-perform-title">
        <div className="activity-a01-section-heading">
          <p className="eyebrow">Investigate and record</p>
          <h2 id="activity-perform-title">Follow one process from <code>ps</code> to <code>/proc</code></h2>
          <p>Run each read-only check in your VM. The notebook stays with the steps; save a draft whenever you need to pause.</p>
        </div>

        <div className="activity-a01-workspace">
          <div className="activity-a01-instructions" id="activity-steps">
            {activity.steps && <MarkdownContent copyable>{activity.steps}</MarkdownContent>}
            {(activity.hints || activity.troubleshooting) && <div className="activity-a01-help" aria-label="Investigation help">
              {activity.hints && <details className="optional-hints">
                <summary>Hints if a process changes or disappears</summary>
                <div className="optional-hints-content"><MarkdownContent>{activity.hints}</MarkdownContent></div>
              </details>}
              {activity.troubleshooting && <details className="activity-troubleshooting">
                <summary>Troubleshoot access or systemd results</summary>
                <MarkdownContent>{activity.troubleshooting}</MarkdownContent>
              </details>}
            </div>}
          </div>

          <aside id="a01-notebook" className={`activity-a01-notebook${mobileNotebookOpen ? " activity-a01-notebook--open" : " activity-a01-notebook--closed"}`} aria-label="A01 investigation notebook">
            <div className="activity-a01-mobile-notebook-controls">
              <Button
                id="a01-mobile-notebook-toggle"
                className="button button-outline activity-a01-mobile-notebook-toggle"
                type="button"
                aria-expanded={mobileNotebookOpen}
                aria-controls={`progress-editor-${activity.id}`}
                onClick={() => setMobileNotebookOpen((open) => !open)}
              >
                {mobileNotebookOpen ? <X size={16} aria-hidden="true" /> : <BookOpen size={16} aria-hidden="true" />}
                {mobileNotebookOpen ? "Close notebook" : "Open investigation notebook"}
                {!mobileNotebookOpen && <span className="activity-a01-notebook-state">{notebookState}</span>}
              </Button>
            </div>

            <form id={`progress-editor-${activity.id}`} className="activity-a01-notebook-panel" onSubmit={submitDraft}>
              <div className="activity-a01-notebook-body">
                <div className="activity-a01-notebook-heading">
                  <p className="eyebrow"><BookOpen size={14} aria-hidden="true" /> One shared record</p>
                  <h2>Investigation notebook</h2>
                  <p>These notes stay with A01 and appear in the final review.</p>
                </div>

                <div className="activity-a01-current-task" aria-live="polite">
                  <span>Task {activeTask + 1} of {taskPrompts.length}</span>
                  <strong>{task.title}</strong>
                  <p id={taskPromptId}>{task.prompt}</p>
                </div>

                <div className="activity-a01-notebook-form">
                  <div className="form-field">
                    <label htmlFor={notebookNotesId}>Findings and interpretation</label>
                    <span className="field-hint">Use the current task prompt to separate what you observed from what you infer.</span>
                    <Textarea
                      id={notebookNotesId}
                      className="form-textarea"
                      maxLength={3000}
                      value={record.notes}
                      disabled={disabled}
                      aria-describedby={`${taskPromptId} activity-a01-notes-privacy`}
                      placeholder={"Observation: …\nWhat it means: …\nWhat it cannot prove: …"}
                      onChange={(event) => update("notes", event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={notebookEvidenceId}>Sanitized commands and evidence</label>
                    <span className="field-hint">Keep only the command and values needed to support your finding.</span>
                    <Textarea
                      id={notebookEvidenceId}
                      className="form-textarea"
                      maxLength={3000}
                      value={record.evidence}
                      disabled={disabled}
                      aria-describedby="activity-a01-evidence-privacy"
                      placeholder={"Command and selected values: …\nCheck or limitation: …"}
                      onChange={(event) => update("evidence", event.target.value)}
                    />
                  </div>
                  <p className="activity-a01-privacy-note" id="activity-a01-notes-privacy">Keep the record concise. Omit private paths, full command arguments, tokens, and personal data.</p>
                  <p className="activity-a01-privacy-note" id="activity-a01-evidence-privacy">Saved in this Fieldnotes workspace on this device; it does not read your terminal.</p>
                </div>
              </div>

              <div className="activity-a01-notebook-footer">
                <div className="activity-a01-save-state" aria-live="polite">
                  <strong>{notebookState}</strong>
                  <span>{loading ? "" : loadFailed ? "Retry loading before editing." : savedText}</span>
                </div>
                <Button className="button button-primary" type="submit" disabled={disabled}>
                  <Save size={15} aria-hidden="true" />{saving ? "Saving…" : "Save draft"}
                </Button>
                {loadFailed && <Button className="button button-outline" type="button" onClick={retryLoad}><RefreshCw size={14} aria-hidden="true" /> Retry loading</Button>}
                {messageLocation === "notebook" && <p className={`form-message${error ? " error" : ""}`} role="status" aria-live="polite">{message}</p>}
              </div>
            </form>
          </aside>
        </div>
      </section>

      <section className="activity-stage activity-a01-review" id="activity-record" aria-labelledby="activity-a01-review-title">
        <div className="activity-a01-review-heading">
          <div>
            <p className="eyebrow">Review, save, and continue</p>
            <h2 id="activity-a01-review-title">Review the findings you already recorded</h2>
          </div>
          <p>Refine your notes in the notebook above. This review shows the same fields; it does not ask you to enter the evidence again.</p>
        </div>

        <div className="activity-a01-review-record" aria-label="Current notebook contents">
          <div>
            <h3>Findings and interpretation</h3>
            <p className="activity-a01-review-value">{record.notes.trim() || "No findings recorded yet. Return to the notebook to add your observations."}</p>
          </div>
          <div>
            <h3>Sanitized commands and evidence</h3>
            <p className="activity-a01-review-value">{record.evidence.trim() || "No supporting evidence recorded yet."}</p>
          </div>
        </div>

        <div className="activity-a01-review-prompt">
          <h3>Before you finish</h3>
          <MarkdownContent>{activity.selfCheck}</MarkdownContent>
          <label htmlFor={`comfort-${activity.id}`}>How independently did this work feel? <span>(optional self-assessment)</span></label>
          <select
            id={`comfort-${activity.id}`}
            className="form-select"
            value={record.comfort ?? ""}
            disabled={disabled}
            onChange={(event) => update("comfort", event.target.value ? event.target.value as ComfortLevel : null)}
          >
            <option value="">Choose a level or leave blank</option>
            <option value="familiar">Familiar</option>
            <option value="guided">Guided</option>
            <option value="independent">Independent</option>
          </select>
          <p className="field-hint">This is your self-assessment; Fieldnotes does not verify mastery.</p>
        </div>

        <div className="activity-a01-review-footer">
          <div>
            <span className={`activity-a01-status activity-a01-status--${record.status}`}>{formatStatus(record.status)}</span>
            <p>{isDirty ? "Changes are not saved yet." : updatedAt ? savedText : "No draft has been saved yet."}</p>
          </div>
          <div className="activity-a01-review-actions">
            <a className="button button-outline" href="#activity-perform">Edit in the notebook</a>
            <Button className="button button-outline" type="button" disabled={disabled} onClick={() => void save("in_progress", "review")}>
              <Save size={15} aria-hidden="true" />Save draft
            </Button>
            <Button className="button button-primary" type="button" disabled={disabled || (record.status === "completed" && !isDirty)} onClick={() => void save("completed", "review")}>
              <Check size={15} aria-hidden="true" />{record.status === "completed" && !isDirty ? "Activity marked complete" : "Mark activity complete"}
            </Button>
            {messageLocation === "review" && <p className={`activity-a01-review-message${error ? " error" : ""}`} role="status" aria-live="polite">{message}</p>}
          </div>
        </div>

        {activity.cleanup && <details className="activity-cleanup">
          <summary>Finish the lab · clean up</summary>
          <MarkdownContent>{activity.cleanup}</MarkdownContent>
        </details>}
      </section>
    </>
  );
}
