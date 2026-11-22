"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookOpen, Check, RefreshCw, Save, X } from "lucide-react";
import type { ActivityRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ActivityTaskMarkdownContent } from "@/components/ui/activity-task-markdown-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatStatus, type ComfortLevel } from "@/features/progress/model";
import { a01Tasks } from "@/features/activities/a01-task-catalog";
import { formatSavedDate } from "@/features/progress/date-format";
import { useActivityRecord } from "@/features/activities/use-activity-record";
import { useAuthSession } from "@/features/auth/auth-session-context";
import { ProgressConflictNotice } from "@/features/progress/progress-conflict";
import { useModalInertSiblings } from "@/features/ui/use-modal-inert-siblings";
import { ProgressSignInNotice } from "@/features/auth/progress-sign-in-notice";
import { ProgressAccountChangedNotice } from "@/features/progress/progress-account-changed-notice";
import { AuthUnavailableNotice } from "@/features/auth/auth-unavailable-notice";

type InvestigationTask = { id: string; title: string; prompt?: string };
type WorkbenchProps = { activity: ActivityRecord; processInvestigation?: boolean };

export function ActivityInvestigationWorkbench(props: WorkbenchProps) {
  const { userId } = useAuthSession();
  return <ActivityInvestigationWorkbenchContent key={`${userId ?? "guest"}:${props.activity.id}`} {...props} />;
}

function ActivityInvestigationWorkbenchContent({ activity, processInvestigation = false }: WorkbenchProps) {
  const tasks: readonly InvestigationTask[] = processInvestigation ? a01Tasks : activity.investigationTasks ?? [];
  const firstTaskId = tasks[0]?.id ?? "";
  const { record, savedRecord, updatedAt, isDirty, loading, loadFailed, requiresSignIn, sessionUnavailable, accountChanged, saving, error, message, messageLocation, conflict, resolveConflict, save, update, retryLoad, setError, setMessage } = useActivityRecord(activity.id);
  const [taskSelection, setSelectedTaskId] = useState<string>(firstTaskId);
  const [visibleTaskId, setVisibleTaskId] = useState(firstTaskId);
  const [focusRequest, setFocusRequest] = useState(0);
  const [mobileNotebookOpen, setMobileNotebookOpen] = useState(false);
  const focusTargetRef = useRef<string | null>(null);
  const notebookReturnFocusRef = useRef<HTMLElement | null>(null);
  const notebookRef = useRef<HTMLElement>(null);
  const notebookToggleRef = useRef<HTMLButtonElement>(null);
  useModalInertSiblings(notebookRef, mobileNotebookOpen);
  const taskObservationId = `task-observation-${activity.id}`;
  const taskPromptId = processInvestigation ? `activity-a01-task-prompt-${activity.id}` : `activity-task-prompt-${activity.id}`;
  const notebookToggleId = processInvestigation ? "a01-mobile-notebook-toggle" : `activity-mobile-notebook-toggle-${activity.id}`;
  const notebookId = processInvestigation ? "a01-notebook" : `activity-notebook-${activity.id}`;
  const reviewTitleId = processInvestigation ? "activity-a01-review-title" : "activity-review-title";
  const taskPickerLabelId = processInvestigation ? "activity-a01-task-picker-label" : `activity-task-picker-label-${activity.id}`;
  const privacyId = processInvestigation ? "activity-a01-observation-privacy" : `activity-observation-privacy-${activity.id}`;
  const legacyLabel = processInvestigation ? "Earlier unassigned note" : "Earlier saved note";
  const hasLegacyContent = Boolean(record.notes.trim() || record.evidence.trim() || record.repositoryUrl.trim());
  const legacyExists = hasLegacyContent || Boolean(savedRecord?.notes.trim() || savedRecord?.evidence.trim() || savedRecord?.repositoryUrl.trim());
  const selectedTaskId = taskSelection === "legacy" && !legacyExists ? firstTaskId : taskSelection;
  const disabled = accountChanged || requiresSignIn || loading || loadFailed || saving || Boolean(conflict);
  const currentTask = selectedTaskId === "legacy" ? undefined : tasks.find(({ id }) => id === selectedTaskId);
  const currentObservation = currentTask ? record.taskObservations?.[currentTask.id] ?? "" : "";
  const recordedCount = tasks.filter(({ id }) => Boolean(record.taskObservations?.[id]?.trim())).length;
  const savedDate = updatedAt === undefined ? undefined : formatSavedDate(updatedAt, { dateStyle: "medium", timeStyle: "short" });
  const savedText = savedDate?.dateTime ? `Last saved ${savedDate.text}` : savedDate?.text ?? "Not saved yet";
  const notebookState = loading ? "Loading saved notes" : loadFailed ? "Saved notes unavailable" : isDirty ? "Unsaved changes" : formatStatus(record.status);
  const legacyDirty = record.notes !== (savedRecord?.notes ?? "") || record.evidence !== (savedRecord?.evidence ?? "") || record.repositoryUrl !== (savedRecord?.repositoryUrl ?? "");
  const legacySelectionExists = selectedTaskId === "legacy" && legacyExists;

  useEffect(() => {
    const updateVisibleTask = () => {
      const items = document.querySelectorAll<HTMLElement>("#activity-steps [data-task-id]");
      if (!items.length) return;
      const focusLine = window.innerHeight * 0.38;
      let current = items[0].dataset.taskId ?? firstTaskId;
      items.forEach((item) => {
        if (item.getBoundingClientRect().top <= focusLine && item.dataset.taskId) current = item.dataset.taskId;
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
  }, [firstTaskId]);

  useEffect(() => {
    if (!mobileNotebookOpen || !window.matchMedia("(max-width: 1180px)").matches) return;
    const fallbackFocusTarget = notebookToggleRef.current;
    const returnFocusTarget = notebookReturnFocusRef.current ?? fallbackFocusTarget;
    notebookToggleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNotebook();
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
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => {
        const target = returnFocusTarget?.isConnected && returnFocusTarget.getClientRects().length && !returnFocusTarget.closest("[inert]")
          ? returnFocusTarget
          : fallbackFocusTarget;
        target?.focus();
      });
    };
  }, [mobileNotebookOpen, notebookToggleId]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1180px)");
    const closeOnDesktop = () => { if (!media.matches) closeMobileNotebook(); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const revealLinkedNotebook = () => {
      if (window.location.hash !== `#progress-editor-${activity.id}`) return;
      if (window.matchMedia("(max-width: 1180px)").matches) setMobileNotebookOpen(true);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        document.getElementById(`progress-editor-${activity.id}`)?.scrollIntoView({ block: "start" });
      }));
    };
    revealLinkedNotebook();
    window.addEventListener("hashchange", revealLinkedNotebook);
    return () => window.removeEventListener("hashchange", revealLinkedNotebook);
  }, [activity.id]);

  useEffect(() => {
    if (!focusRequest || focusTargetRef.current !== selectedTaskId) return;
    if (window.matchMedia("(max-width: 1180px)").matches && !mobileNotebookOpen) return;
    const inputId = selectedTaskId === "legacy" ? `notes-${activity.id}` : taskObservationId;
    const editor = document.getElementById(inputId);
    if (!(editor instanceof HTMLElement)) return;
    editor.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    editor.focus({ preventScroll: true });
    focusTargetRef.current = null;
  }, [activity.id, focusRequest, mobileNotebookOpen, selectedTaskId, taskObservationId]);

  function updateObservation(taskId: string, value: string) {
    update("taskObservations", { ...record.taskObservations, [taskId]: value });
  }

  function selectTask(taskId: string, trigger?: HTMLElement) {
    if (taskId !== "legacy" && !tasks.some(({ id }) => id === taskId)) return;
    focusTargetRef.current = taskId;
    setFocusRequest((request) => request + 1);
    setSelectedTaskId(taskId);
    setError(false);
    setMessage("");
    if (window.matchMedia("(max-width: 1180px)").matches) {
      if (trigger) notebookReturnFocusRef.current = trigger;
      setMobileNotebookOpen(true);
    }
  }

  function recordTask(taskId: string, trigger: HTMLButtonElement) {
    if (!tasks.some((task) => task.id === taskId)) return;
    selectTask(taskId, trigger);
  }

  function editTask(taskId: string, trigger?: HTMLElement) {
    const target = taskId === "legacy" ? document.getElementById("activity-perform") : document.getElementById(`activity-task-${taskId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    selectTask(taskId, trigger);
  }

  function closeMobileNotebook() {
    setMobileNotebookOpen(false);
  }

  function markComplete() {
    if (recordedCount < tasks.length) {
      const confirmed = window.confirm(
        `You have notes for ${recordedCount} of ${tasks.length} tasks. You can still mark ${activity.id} complete now. Completion is your self-report; Fieldnotes does not verify your ${processInvestigation ? "VM results" : "environment or results"}, and your notes will remain editable.\n\nMark ${activity.id} complete?`,
      );
      if (!confirmed) return;
    }
    void save("completed", "review");
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(record.status === "completed" ? "completed" : "in_progress", "notebook");
  }

  function submitReviewDraft() {
    void save(record.status === "completed" ? "completed" : "in_progress", "review");
  }

  const selectedTaskIndex = currentTask ? tasks.findIndex(({ id }) => id === currentTask.id) : -1;
  const visibleTaskIndex = tasks.findIndex(({ id }) => id === visibleTaskId);
  const viewingDifferentTask = selectedTaskId === "legacy" || (visibleTaskId !== selectedTaskId && visibleTaskIndex >= 0);

  return (
    <>
      <section className="activity-stage activity-a01-investigate" id="activity-perform" aria-labelledby="activity-perform-title">
        <div className="activity-a01-section-heading">
          <p className="eyebrow">{processInvestigation ? "Investigate and record" : "Practice and record"}</p>
          <h2 id="activity-perform-title">{processInvestigation ? "Follow one process across Linux views" : "Work through the lab steps"}</h2>
          <p>{processInvestigation ? "Run each read-only check in your VM. Use its Record button to open the matching notebook entry." : "Use each step’s Record button to open its note. Your notebook stays with you as you work."}</p>
        </div>

        <div className="activity-a01-workspace">
          <div className="activity-a01-instructions" id="activity-steps">
            {activity.steps && <ActivityTaskMarkdownContent copyable taskIds={tasks.map(({ id }) => id)} taskHints={processInvestigation ? activity.taskHints : undefined} taskDetails={processInvestigation ? activity.taskDetails : undefined} onRecordTask={recordTask} recordTaskDisabled={loading}>{activity.steps}</ActivityTaskMarkdownContent>}
            {!processInvestigation && <div className="activity-a01-inline-checks">
              <details>
                <summary>Expected observations</summary>
                <MarkdownContent copyable>{activity.expectedObservations}</MarkdownContent>
              </details>
              {activity.verification && <details>
                <summary>Verify the outcome</summary>
                <MarkdownContent copyable>{activity.verification}</MarkdownContent>
              </details>}
            </div>}
            {!processInvestigation && (activity.hints || activity.troubleshooting) && <div className="activity-a01-help" aria-label="Optional help">
              {activity.hints && <details className="optional-hints">
                <summary>Open a hint</summary>
                <div className="optional-hints-content"><MarkdownContent copyable>{activity.hints}</MarkdownContent></div>
              </details>}
              {activity.troubleshooting && <details className="activity-troubleshooting">
                <summary>Troubleshoot a problem</summary>
                <MarkdownContent copyable>{activity.troubleshooting}</MarkdownContent>
              </details>}
            </div>}
          </div>

          {mobileNotebookOpen && <button className="activity-a01-notebook-backdrop" data-modal-dismiss type="button" tabIndex={-1} aria-label="Close investigation notebook" onClick={closeMobileNotebook} />}
          <aside ref={notebookRef} id={notebookId} className={`activity-a01-notebook${mobileNotebookOpen ? " activity-a01-notebook--open" : " activity-a01-notebook--closed"}`} aria-label={`${activity.id} investigation notebook`} role={mobileNotebookOpen ? "dialog" : undefined} aria-modal={mobileNotebookOpen || undefined}>
            <div className="activity-a01-mobile-notebook-controls">
              <Button
                ref={notebookToggleRef}
                id={notebookToggleId}
                className="button button-outline activity-a01-mobile-notebook-toggle"
                type="button"
                aria-label={mobileNotebookOpen ? "Close notebook" : "Open investigation notebook"}
                aria-expanded={mobileNotebookOpen}
                aria-controls={`progress-editor-${activity.id}`}
                disabled={loading && !mobileNotebookOpen}
                onClick={(event) => {
                  if (mobileNotebookOpen) {
                    closeMobileNotebook();
                    return;
                  }
                  notebookReturnFocusRef.current = event.currentTarget;
                  setMobileNotebookOpen(true);
                }}
              >
                {mobileNotebookOpen ? <X size={16} aria-hidden="true" /> : <BookOpen size={16} aria-hidden="true" />}
                {mobileNotebookOpen ? "Close notebook" : "Open notebook"}
                {!mobileNotebookOpen && <span className="activity-a01-notebook-state">{notebookState}</span>}
              </Button>
            </div>

            <form id={`progress-editor-${activity.id}`} className="activity-a01-notebook-panel" onSubmit={submitDraft}>
              {conflict && <ProgressConflictNotice draft={record} current={conflict.current} onUseSaved={() => resolveConflict(false)} onKeepDraft={() => resolveConflict(true)} />}
              <div className="activity-a01-notebook-body">
                <div className="activity-a01-notebook-heading">
                  <p className="eyebrow"><BookOpen size={14} aria-hidden="true" /> One shared record</p>
                  <h2>Investigation notebook</h2>
                  <p>{processInvestigation ? "Choose a task to edit. Your notes stay in this A01 record until you save them." : "Choose a lab step to edit its note. Final review uses this same saved activity record."}</p>
                </div>

                {requiresSignIn && <ProgressSignInNotice>{isDirty
                  ? "Your session expired. Sign in to the same account and reopen this activity to recover your draft."
                  : `Sign in to open and edit your private ${processInvestigation ? "investigation" : "activity"} notebook. Your learning content remains public.`}</ProgressSignInNotice>}
                {accountChanged && <ProgressAccountChangedNotice />}
                {sessionUnavailable && <AuthUnavailableNotice message="Your account could not be checked. Private notes stay hidden until the account service responds." onRetry={retryLoad} />}

                {viewingDifferentTask && <div className="activity-a01-visible-task" role="status">
                  <span>
                    {visibleTaskIndex >= 0 && <strong>Reading Task {visibleTaskIndex + 1} · {tasks[visibleTaskIndex]?.title}</strong>}
                    <span>Editing {currentTask ? `Task ${selectedTaskIndex + 1} · ${currentTask.title}` : `your ${legacyLabel.toLowerCase()}`}</span>
                  </span>
                  {visibleTaskIndex >= 0 && <button type="button" onClick={(event) => selectTask(visibleTaskId, event.currentTarget)}>Edit Task {visibleTaskIndex + 1}</button>}
                </div>}

                <div className="activity-a01-task-picker" role="group" aria-label="Task notes and saved states">
                  {tasks.map((task, index) => {
                    const value = record.taskObservations?.[task.id] ?? "";
                    const savedValue = savedRecord?.taskObservations?.[task.id] ?? "";
                    const selected = selectedTaskId === task.id;
                    const statusLabel = value.trim()
                      ? value !== savedValue ? processInvestigation ? "unsaved" : "unsaved changes" : "note saved"
                      : processInvestigation ? "not recorded" : "no note yet";
                    const taskState = selected
                      ? `${processInvestigation ? "Editing" : "Selected"} · ${statusLabel}`
                      : statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1);
                    return <button
                      key={task.id}
                      type="button"
                      className="activity-a01-task-choice"
                      aria-pressed={selectedTaskId === task.id}
                      disabled={disabled}
                      onClick={(event) => selectTask(task.id, event.currentTarget)}
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
                    onClick={(event) => selectTask("legacy", event.currentTarget)}
                  >
                    <span className="activity-a01-task-choice-number">Old</span>
                    <span className="activity-a01-task-choice-copy"><strong>{legacyLabel}</strong><small>{legacyDirty ? "Unsaved changes" : "Preserved"}</small></span>
                  </button>}
                </div>
                <label className="activity-a01-task-picker-mobile">
                  <span id={taskPickerLabelId}>
                    Choose a task · {currentTask
                      ? `Editing Task ${selectedTaskIndex + 1} of ${tasks.length} · ${currentTask.title}`
                      : `Editing your ${legacyLabel.toLowerCase()}`}
                  </span>
                  <select
                    className="form-select"
                    aria-labelledby={taskPickerLabelId}
                    value={selectedTaskId}
                    disabled={disabled}
                    onChange={(event) => selectTask(event.target.value)}
                  >
                    {tasks.map((task, index) => {
                      const value = record.taskObservations?.[task.id] ?? "";
                      const savedValue = savedRecord?.taskObservations?.[task.id] ?? "";
                      const taskState = value.trim() ? value !== savedValue ? "unsaved changes" : "note saved" : "no note yet";
                      return <option key={task.id} value={task.id}>Task {index + 1} · {task.title} · {taskState}</option>;
                    })}
                    {legacyExists && <option value="legacy">{legacyLabel} · {legacyDirty ? "unsaved changes" : "preserved"}</option>}
                  </select>
                </label>

                {currentTask ? <div className="activity-a01-current-task" aria-live="polite">
                  <span>Editing Task {selectedTaskIndex + 1} of {tasks.length}</span>
                  <strong>{currentTask.title}</strong>
                  <p id={taskPromptId}>{currentTask.prompt ?? "Capture what you predicted or did, the result you observed, and what it supports."}</p>
                </div> : legacySelectionExists ? <div className="activity-a01-current-task activity-a01-current-task--legacy">
                  <span>{processInvestigation ? "Earlier A01 record" : "Earlier saved record"}</span>
                  <strong>Not linked to a specific task</strong>
                  <p>{processInvestigation ? "This note came from the earlier A01 notebook. It remains editable here and has not been assigned to a task." : "This work was saved before task-linked notes were introduced. It remains editable and is not assigned to a lab step."}</p>
                </div> : <div className="activity-a01-current-task activity-a01-current-task--legacy">
                  <span>Choose a lab step</span>
                  <strong>No task selected</strong>
                  <p>Select a step above to edit its note.</p>
                </div>}

                <div className="activity-a01-notebook-form">
                  {currentTask ? <div className="form-field">
                    <label htmlFor={taskObservationId}>Task observation</label>
                    <Textarea
                      id={taskObservationId}
                      className="form-textarea"
                      maxLength={1200}
                      value={currentObservation}
                      disabled={disabled}
                      aria-describedby={`${taskPromptId} ${privacyId}`}
                      placeholder={processInvestigation ? "Record a short, sanitized observation and what it supports." : "Record what happened in this step and what you concluded."}
                      onChange={(event) => updateObservation(currentTask.id, event.target.value)}
                    />
                    <span className="activity-a01-character-count">{currentObservation.length} / 1,200 characters</span>
                  </div> : legacySelectionExists && <>
                    <div className="form-field">
                      <label htmlFor={`notes-${activity.id}`}>Earlier notes</label>
                      <span className="field-hint">Kept as part of this same activity record.</span>
                      <Textarea id={`notes-${activity.id}`} className="form-textarea" maxLength={3000} value={record.notes} disabled={disabled} onChange={(event) => update("notes", event.target.value)} />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`evidence-${activity.id}`}>Earlier evidence</label>
                      <Textarea id={`evidence-${activity.id}`} className="form-textarea" maxLength={3000} value={record.evidence} disabled={disabled} onChange={(event) => update("evidence", event.target.value)} />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`repository-url-${activity.id}`}>Earlier reference link</label>
                      <input id={`repository-url-${activity.id}`} className="form-input" type="url" maxLength={512} value={record.repositoryUrl} disabled={disabled} onChange={(event) => update("repositoryUrl", event.target.value)} />
                    </div>
                  </>}
                  <p className="activity-a01-privacy-note" id={privacyId}>{processInvestigation ? "Avoid saving private paths, full command arguments, tokens, or personal data." : "Keep private paths, credentials, personal data, and unrelated work out of saved notes."}</p>
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
                {loadFailed && !sessionUnavailable && <Button className="button button-outline" type="button" onClick={retryLoad}><RefreshCw size={14} aria-hidden="true" /> Retry loading</Button>}
                {messageLocation === "notebook" && <p className={`form-message${error ? " error" : ""}`} role="status" aria-live="polite">{message}</p>}
              </div>
            </form>
          </aside>
        </div>
      </section>

      <section className="activity-stage activity-a01-review" id="activity-record" aria-labelledby={reviewTitleId}>
        <div className="activity-a01-review-heading">
          <div>
            <p className="eyebrow">Review, save, and continue</p>
            <h2 id={reviewTitleId}>{processInvestigation ? "Review the observations you recorded" : "Review the work you recorded"}</h2>
          </div>
          <p>{processInvestigation ? "Review the same task notes here, edit any entry, then save the investigation when ready." : "Edit any note from here. This review shows the same observations as the notebook above."}</p>
        </div>

        <p className="activity-a01-review-progress">
          {recordedCount === 0
            ? "No task notes yet. You can save a partial draft at any time."
            : `${recordedCount} of ${tasks.length} tasks have notes in this ${processInvestigation ? "investigation" : "activity"}.`}
        </p>
        <div className="activity-a01-review-record" role="group" aria-label="Task observations in the shared notebook">
          {processInvestigation && recordedCount === 0 && <div className="activity-a01-review-empty">
            <p>Start with your account check. You can return to the other tasks whenever you are ready.</p>
            <Button className="button button-outline" type="button" disabled={disabled} onClick={(event) => editTask(firstTaskId, event.currentTarget)}>
              Open Task 1 · Confirm your account
            </Button>
          </div>}
          {tasks.map((task, index) => {
            const observation = record.taskObservations?.[task.id]?.trim();
            if (processInvestigation && !observation) return null;
            return <article className="activity-a01-review-task" data-task-id={task.id} key={task.id}>
              <div className="activity-a01-review-task-heading">
                <div><span className="activity-a01-review-number">{String(index + 1).padStart(2, "0")}</span><h3>{task.title}</h3></div>
                <button type="button" disabled={disabled} onClick={(event) => editTask(task.id, event.currentTarget)}>Edit Task {index + 1}</button>
              </div>
              <p className={`activity-a01-review-value${observation ? "" : " activity-a01-review-value--empty"}`}>{observation || "No note added for this step yet."}</p>
            </article>;
          })}
          {processInvestigation && recordedCount > 0 && recordedCount < tasks.length && <div className="activity-a01-review-missing">
            <strong>Not recorded yet ({tasks.length - recordedCount})</strong>
            <ul aria-label="Tasks without notes">
              {tasks.map((task, index) => record.taskObservations?.[task.id]?.trim() ? null
                : <li key={task.id}><button type="button" disabled={disabled} onClick={(event) => editTask(task.id, event.currentTarget)}>Record Task {index + 1} · {task.title}</button></li>)}
            </ul>
          </div>}
          {legacyExists && <article className="activity-a01-review-task activity-a01-review-task--legacy">
            <div className="activity-a01-review-task-heading">
              <div><span className="activity-a01-review-number">Old</span><h3>{processInvestigation ? "Earlier unassigned A01 note" : legacyLabel}</h3></div>
              <button type="button" disabled={disabled} onClick={(event) => editTask("legacy", event.currentTarget)}>Edit earlier note</button>
            </div>
            <p className="activity-a01-review-value">{record.notes.trim() || "No earlier notes."}{record.evidence.trim() ? `\n\nEarlier evidence: ${record.evidence.trim()}` : ""}</p>
            {record.repositoryUrl && record.repositoryUrl === savedRecord?.repositoryUrl && <p className="activity-a01-review-legacy-help"><a href={record.repositoryUrl} target="_blank" rel="noreferrer">Open earlier reference link</a></p>}
            <p className="activity-a01-review-legacy-help">Preserved from the older activity record without guessing which task it belongs to.</p>
          </article>}
        </div>

        <div className="activity-a01-review-prompt">
          {processInvestigation ? <>
          <h3>Before you finish</h3>
          <MarkdownContent>{activity.selfCheck}</MarkdownContent>
          {activity.verification && <p className="activity-a01-review-verification">{activity.verification}</p>}
          <div className="activity-a01-transfer-prompt">
            <strong>Think ahead</strong>
            <MarkdownContent>{activity.independencePrompt}</MarkdownContent>
          </div>
          </> : <>
          <h3>Bring the evidence together</h3>
          <MarkdownContent>{activity.submit}</MarkdownContent>
          <div className="activity-a01-transfer-prompt">
            <strong>Check your understanding</strong>
            <MarkdownContent>{activity.selfCheck}</MarkdownContent>
            <MarkdownContent>{activity.independencePrompt}</MarkdownContent>
          </div>
          {activity.verification && <p className="activity-a01-review-verification">Fieldnotes does not inspect your environment or verify command output. Use the checks above to assess your results.</p>}
          </>}
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
        </div>

        <div className="activity-a01-review-footer">
          <div>
            <span className={`activity-a01-status activity-a01-status--${record.status}`}>{formatStatus(record.status)}</span>
            <p>{isDirty ? "Changes are not saved yet." : updatedAt ? savedText : "No draft has been saved yet."}</p>
          </div>
          <div className="activity-a01-review-actions">
            <a className="button button-outline" href={`#progress-editor-${activity.id}`} onClick={(event) => {
              if (!window.matchMedia("(max-width: 1180px)").matches) return;
              event.preventDefault();
              notebookReturnFocusRef.current = event.currentTarget;
              window.history.replaceState(window.history.state, "", `#progress-editor-${activity.id}`);
              setMobileNotebookOpen(true);
            }}>Edit in the notebook</a>
            <Button className="button button-outline" type="button" disabled={disabled} onClick={submitReviewDraft}>
              <Save size={15} aria-hidden="true" />Save draft
            </Button>
            {record.status === "completed" && <Button className="button button-outline" type="button" disabled={disabled} onClick={() => void save("in_progress", "review", "reopen")}>
              Reopen as in progress
            </Button>}
            <Button className="button button-primary" type="button" disabled={disabled || record.status === "completed"} onClick={markComplete}>
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
