"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Check, RefreshCw, Save, X } from "lucide-react";
import type { ActivityRecord } from "@/content";
import { a01TaskIds, type A01TaskId } from "@/content/a01-task-ids";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { a01Tasks, type A01TaskSelection } from "@/features/activities/a01-task-catalog";
import { formatStatus, type ComfortLevel, type ProgressInput, type ProgressRecord, type ProgressStatus } from "@/features/progress/model";

function blankRecord(itemId: string): ProgressInput {
  return {
    itemType: "activity",
    itemId,
    status: "not_started",
    comfort: null,
    notes: "",
    evidence: "",
    repositoryUrl: "",
    taskObservations: {},
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
    taskObservations: record.taskObservations ?? {},
  };
}

function countObservations(observations: Record<string, string> | undefined): number {
  return a01Tasks.filter(({ id }) => Boolean(observations?.[id]?.trim())).length;
}

export function A01InvestigationWorkbench({ activity }: { activity: ActivityRecord }) {
  const [record, setRecord] = useState<ProgressInput>(() => blankRecord(activity.id));
  const [savedRecord, setSavedRecord] = useState<ProgressInput>(() => blankRecord(activity.id));
  const [updatedAt, setUpdatedAt] = useState<number>();
  const [selectedTaskId, setSelectedTaskId] = useState<A01TaskSelection>(a01Tasks[0].id);
  const [visibleTaskId, setVisibleTaskId] = useState<A01TaskId>(a01Tasks[0].id);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [mobileNotebookOpen, setMobileNotebookOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageLocation, setMessageLocation] = useState<"notebook" | "review">("notebook");
  const [error, setError] = useState(false);
  const taskObservationId = `task-observation-${activity.id}`;
  const taskPromptId = `activity-a01-task-prompt-${activity.id}`;
  const disabled = loading || loadFailed || saving;
  const currentTask = selectedTaskId === "legacy" ? undefined : a01Tasks.find(({ id }) => id === selectedTaskId)!;
  const currentObservation = currentTask ? record.taskObservations?.[currentTask.id] ?? "" : "";
  const recordedCount = countObservations(record.taskObservations);
  const savedText = updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet";
  const notebookState = loading ? "Loading saved notes" : loadFailed ? "Saved notes unavailable" : isDirty ? "Unsaved changes" : formatStatus(record.status);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ itemType: "activity", itemId: activity.id });
    fetch(`/api/progress?${query.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load this activity’s saved record.");
        const rows = await response.json() as ProgressRecord[];
        if (!Array.isArray(rows)) throw new Error("The saved record response was unexpected.");
        const saved = rows[0] ? savedFields(rows[0]) : blankRecord(activity.id);
        setRecord(saved);
        setSavedRecord(saved);
        setUpdatedAt(rows[0]?.updatedAt);
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
    const updateVisibleTask = () => {
      const items = document.querySelectorAll<HTMLElement>("#activity-steps [data-task-id]");
      if (!items.length) return;
      const focusLine = window.innerHeight * 0.38;
      let current = items[0].dataset.taskId as A01TaskId;
      items.forEach((item) => {
        if (item.getBoundingClientRect().top <= focusLine && item.dataset.taskId) current = item.dataset.taskId as A01TaskId;
      });
      setVisibleTaskId(current);
    };
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateVisibleTask();
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

  async function save(status: ProgressStatus, location: "notebook" | "review", action: "draft" | "reopen" = "draft") {
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
      const normalized = savedFields(saved);
      setRecord(normalized);
      setSavedRecord(normalized);
      setUpdatedAt(saved.updatedAt);
      setIsDirty(false);
      const keptCompleted = record.status === "completed" && status === "completed";
      setMessage(status === "completed"
        ? keptCompleted ? "Draft saved. The activity remains marked complete." : "Activity marked complete on this device."
        : action === "reopen" ? "Activity marked in progress. Your notes were saved on this device." : "Draft saved on this device.");
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

  function updateObservation(taskId: A01TaskId, value: string) {
    update("taskObservations", { ...(record.taskObservations ?? {}), [taskId]: value });
  }

  function selectTask(taskId: A01TaskSelection) {
    setSelectedTaskId(taskId);
    setError(false);
    setMessage("");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const inputId = taskId === "legacy" ? `notes-${activity.id}` : taskObservationId;
      const editor = document.getElementById(inputId);
      editor?.focus();
      if (editor instanceof HTMLElement && window.matchMedia("(max-width: 1180px)").matches) {
        const notebookBody = document.querySelector<HTMLElement>(".activity-a01-notebook--open .activity-a01-notebook-body");
        if (notebookBody) {
          const targetTop = notebookBody.getBoundingClientRect().top + notebookBody.clientHeight * 0.58;
          notebookBody.scrollTop += editor.getBoundingClientRect().top - targetTop;
        }
      }
    }));
  }

  function editTask(taskId: A01TaskSelection) {
    selectTask(taskId);
    setMobileNotebookOpen(true);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const editor = document.getElementById(`progress-editor-${activity.id}`);
      editor?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById(taskObservationId)?.focus({ preventScroll: true });
    }));
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
    void save(record.status === "completed" ? "completed" : "in_progress", "notebook");
  }

  function submitReviewDraft() {
    void save(record.status === "completed" ? "completed" : "in_progress", "review");
  }

  const viewingDifferentTask = visibleTaskId !== selectedTaskId && selectedTaskId !== "legacy";
  const legacyExists = Boolean(record.notes.trim() || record.evidence.trim());
  const legacyDirty = record.notes !== savedRecord.notes || record.evidence !== savedRecord.evidence;

  return (
    <>
      <section className="activity-stage activity-a01-investigate" id="activity-perform" aria-labelledby="activity-perform-title">
        <div className="activity-a01-section-heading">
          <p className="eyebrow">Investigate and record</p>
          <h2 id="activity-perform-title">Follow one process from <code>ps</code> to <code>/proc</code></h2>
          <p>Run each read-only check in your VM. Select a task in the notebook to record it; scrolling through the steps will never change the note you are editing.</p>
        </div>

        <div className="activity-a01-workspace">
          <div className="activity-a01-instructions" id="activity-steps">
            {activity.steps && <MarkdownContent copyable taskIds={a01TaskIds} taskHints={activity.taskHints}>{activity.steps}</MarkdownContent>}
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
                  <p>Choose a task, record what your VM showed, and return to these notes in the final review.</p>
                </div>

                {viewingDifferentTask && <div className="activity-a01-visible-task" role="status">
                  <span>Viewing Task {a01Tasks.findIndex(({ id }) => id === visibleTaskId) + 1}: {a01Tasks.find(({ id }) => id === visibleTaskId)?.title}</span>
                  <button type="button" onClick={() => selectTask(visibleTaskId)}>Switch notebook to this task</button>
                </div>}

                <div className="activity-a01-task-picker" role="group" aria-label="Task notes and saved states">
                  {a01Tasks.map((task, index) => {
                    const value = record.taskObservations?.[task.id] ?? "";
                    const savedValue = savedRecord.taskObservations?.[task.id] ?? "";
                    const taskState = value.trim() ? value !== savedValue ? "Unsaved" : "Recorded" : "Not recorded";
                    return <button
                      key={task.id}
                      type="button"
                      className="activity-a01-task-choice"
                      aria-pressed={selectedTaskId === task.id}
                      disabled={disabled}
                      onClick={() => selectTask(task.id)}
                    >
                      <span className="activity-a01-task-choice-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="activity-a01-task-choice-copy"><strong>{task.title}</strong><small>{taskState}</small></span>
                    </button>;
                  })}
                  {legacyExists && <button
                    type="button"
                    className="activity-a01-task-choice activity-a01-task-choice--legacy"
                    aria-pressed={selectedTaskId === "legacy"}
                    disabled={disabled}
                    onClick={() => selectTask("legacy")}
                  >
                    <span className="activity-a01-task-choice-number">Old</span>
                    <span className="activity-a01-task-choice-copy"><strong>Earlier unassigned note</strong><small>{legacyDirty ? "Unsaved" : "Preserved"}</small></span>
                  </button>}
                </div>
                <label className="activity-a01-task-picker-mobile">
                  <span id="activity-a01-task-picker-label">Choose a task observation</span>
                  <select
                    className="form-select"
                    aria-labelledby="activity-a01-task-picker-label"
                    value={selectedTaskId}
                    disabled={disabled}
                    onChange={(event) => selectTask(event.target.value as A01TaskSelection)}
                  >
                    {a01Tasks.map((task, index) => {
                      const value = record.taskObservations?.[task.id] ?? "";
                      const savedValue = savedRecord.taskObservations?.[task.id] ?? "";
                      const taskState = value.trim() ? value !== savedValue ? "Unsaved" : "Recorded" : "Not recorded";
                      return <option key={task.id} value={task.id}>Task {index + 1} · {task.title} · {taskState}</option>;
                    })}
                    {legacyExists && <option value="legacy">Earlier unassigned note · {legacyDirty ? "Unsaved" : "Preserved"}</option>}
                  </select>
                </label>

                {currentTask ? <div className="activity-a01-current-task" aria-live="polite">
                  <span>Task {a01Tasks.findIndex(({ id }) => id === currentTask.id) + 1} of {a01Tasks.length}</span>
                  <strong>{currentTask.title}</strong>
                  <p id={taskPromptId}>{currentTask.prompt}</p>
                </div> : <div className="activity-a01-current-task activity-a01-current-task--legacy">
                  <span>Earlier A01 record</span>
                  <strong>Not linked to a specific task</strong>
                  <p>This note came from the earlier A01 notebook. It remains editable here and has not been assigned to a task.</p>
                </div>}

                <div className="activity-a01-notebook-form">
                  {currentTask ? <div className="form-field">
                    <label htmlFor={taskObservationId}>Task observation</label>
                    <span className="field-hint">A short note is enough: what you observed, what it means, and a relevant limit.</span>
                    <Textarea
                      id={taskObservationId}
                      className="form-textarea"
                      maxLength={1200}
                      value={currentObservation}
                      disabled={disabled}
                      aria-describedby={`${taskPromptId} activity-a01-observation-privacy`}
                      placeholder={"What did your VM show? What does it mean? What can’t it prove?"}
                      onChange={(event) => updateObservation(currentTask.id, event.target.value)}
                    />
                    <span className="activity-a01-character-count">{currentObservation.length} / 1,200 characters · {recordedCount} of 5 tasks recorded</span>
                  </div> : <>
                    <div className="form-field">
                      <label htmlFor={`notes-${activity.id}`}>Earlier notes</label>
                      <span className="field-hint">Kept as an unassigned note from your earlier A01 record.</span>
                      <Textarea id={`notes-${activity.id}`} className="form-textarea" maxLength={3000} value={record.notes} disabled={disabled} onChange={(event) => update("notes", event.target.value)} />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`evidence-${activity.id}`}>Earlier evidence</label>
                      <span className="field-hint">Kept with the same record; it has not been copied into a task.</span>
                      <Textarea id={`evidence-${activity.id}`} className="form-textarea" maxLength={3000} value={record.evidence} disabled={disabled} onChange={(event) => update("evidence", event.target.value)} />
                    </div>
                  </>}
                  <p className="activity-a01-privacy-note" id="activity-a01-observation-privacy">Omit private paths, full command arguments, tokens, and personal data. Fieldnotes saves your note here; it does not read your terminal.</p>
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
            <h2 id="activity-a01-review-title">Review the observations you recorded</h2>
          </div>
          <p>Each row shows the same observation saved in the notebook. Choose Edit to return to that task; no evidence needs to be entered again.</p>
        </div>

        <p className="activity-a01-review-progress">{recordedCount} of 5 task observations recorded. “Recorded” describes saved learner notes; it does not mean Fieldnotes verified the Linux results.</p>
        <div className="activity-a01-review-record" aria-label="Task observations in the shared notebook">
          {a01Tasks.map((task, index) => {
            const observation = record.taskObservations?.[task.id]?.trim();
            return <article className="activity-a01-review-task" key={task.id}>
              <div className="activity-a01-review-task-heading">
                <div><span className="activity-a01-review-number">{String(index + 1).padStart(2, "0")}</span><h3>{task.title}</h3></div>
                <a href={`#progress-editor-${activity.id}`} onClick={() => editTask(task.id)}>Edit Task {index + 1}</a>
              </div>
              <p className={`activity-a01-review-value${observation ? "" : " activity-a01-review-value--empty"}`}>{observation || "Not recorded yet."}</p>
            </article>;
          })}
          {legacyExists && <article className="activity-a01-review-task activity-a01-review-task--legacy">
            <div className="activity-a01-review-task-heading">
              <div><span className="activity-a01-review-number">Old</span><h3>Earlier unassigned A01 note</h3></div>
              <a href={`#progress-editor-${activity.id}`} onClick={() => editTask("legacy")}>Edit earlier note</a>
            </div>
            <p className="activity-a01-review-value">{record.notes.trim() || "No earlier notes."}{record.evidence.trim() ? `\n\nEarlier evidence: ${record.evidence.trim()}` : ""}</p>
            <p className="activity-a01-review-legacy-help">Preserved from the earlier record without guessing which task it belongs to.</p>
          </article>}
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
          <p className="field-hint">Completion is your choice. Fieldnotes does not inspect the VM or verify these results.</p>
        </div>

        <div className="activity-a01-review-footer">
          <div>
            <span className={`activity-a01-status activity-a01-status--${record.status}`}>{formatStatus(record.status)}</span>
            <p>{isDirty ? "Changes are not saved yet." : updatedAt ? savedText : "No draft has been saved yet."}</p>
          </div>
          <div className="activity-a01-review-actions">
            <a className="button button-outline" href="#progress-editor-A01">Edit in the notebook</a>
            <Button className="button button-outline" type="button" disabled={disabled} onClick={submitReviewDraft}>
              <Save size={15} aria-hidden="true" />Save draft
            </Button>
            {record.status === "completed" && <Button className="button button-outline" type="button" disabled={disabled} onClick={() => void save("in_progress", "review", "reopen")}>
              Reopen as in progress
            </Button>}
            <Button className="button button-primary" type="button" disabled={disabled || record.status === "completed"} onClick={() => void save("completed", "review")}>
              <Check size={15} aria-hidden="true" />{record.status === "completed" ? "Activity marked complete" : "Mark activity complete"}
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
