"use client";

import { useState, type FormEvent } from "react";
import { RefreshCw, Save } from "lucide-react";
import { comfortLevels, formatStatus, progressStatuses, type ProgressInput } from "@/features/progress/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProgressSignInNotice } from "@/features/auth/progress-sign-in-notice";
import { AuthUnavailableNotice } from "@/features/auth/auth-unavailable-notice";
import { useAuthSession } from "@/features/auth/auth-session-context";
import { ProgressConflictNotice } from "@/features/progress/progress-conflict";
import { ProgressAccountChangedNotice } from "@/features/progress/progress-account-changed-notice";
import { useProgressRecord } from "@/features/progress/use-progress-record";
import { formatSavedDate } from "@/features/progress/date-format";
import { useProjectRecordSnapshot } from "@/features/projects/project-record-context";

const comfortLabels = { familiar: "Familiar", guided: "Guided", independent: "Independent" };

export function ProgressEditor(props: ProgressEditorProps) {
  const session = useAuthSession();
  const sessionKey = session.status === "signed-in" ? `signed-in:${session.userId}` : session.status;
  return <ProgressEditorInstance key={`${sessionKey}:${props.itemType}:${props.itemId}`} {...props} />;
}

type ProgressEditorProps = {
  itemType: ProgressInput["itemType"];
  itemId: string;
  title?: string;
  showComfort?: boolean;
  wide?: boolean;
  checkpointContext?: { id: string; label: string };
  workspaceHandlesSessionFailure?: boolean;
  variant?: "full" | "module-summary" | "lesson-status" | "project-workbench";
};

function ProgressEditorInstance({
  itemType,
  itemId,
  title = "Progress note",
  showComfort = false,
  wide = false,
  checkpointContext,
  workspaceHandlesSessionFailure = false,
  variant = "full",
}: ProgressEditorProps) {
  const isModuleSummary = variant === "module-summary";
  const isLessonStatus = variant === "lesson-status";
  const isProjectWorkbench = variant === "project-workbench";
  const isPracticeRecord = itemType === "activity" || itemType === "troubleshooting";
  const isCompact = isModuleSummary || isLessonStatus;
  const EditorTitle = isProjectWorkbench ? "h3" : "h2";
  const noteHintId = `notes-help-${itemId}`;
  const evidenceHintId = `evidence-help-${itemId}`;
  const evidencePrivacyId = `evidence-privacy-${itemId}`;
  const projectSnapshot = useProjectRecordSnapshot();
  const {
    form, saved, status, isDirty, saving, error, message, conflict,
    resolveConflict, save, update: updateDraft, retryLoad,
  } = useProgressRecord(itemType, itemId, isProjectWorkbench ? projectSnapshot : undefined);
  const loading = status === "loading";
  const loadFailed = status === "error";
  const [projectWideFieldsPreference, setProjectWideFieldsPreference] = useState<boolean>();
  const projectWideFieldsOpen = projectWideFieldsPreference ?? Boolean(form.notes || form.evidence || form.repositoryUrl);
  const updatedAt = saved?.updatedAt;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  function update<K extends keyof ProgressInput>(key: K, value: ProgressInput[K]) {
    updateDraft((current) => ({ ...current, [key]: value }));
  }

  function updateCheckpointObservation(value: string) {
    if (!checkpointContext) return;
    updateDraft((current) => ({
      ...current,
      taskObservations: { ...current.taskObservations, [checkpointContext.id]: value },
    }));
  }

  function renderProjectWideFields() {
    return <>
      <div className="progress-long-fields">
        <div className="form-field">
          <label htmlFor={`notes-${itemId}`}>Engineering log</label>
          <span className="field-hint" id={noteHintId}>Capture decisions that affect the whole project, why you chose them, and what remains uncertain.</span>
          <Textarea id={`notes-${itemId}`} aria-describedby={noteHintId} className="form-textarea" maxLength={3000} value={form.notes} disabled={loading || loadFailed} onChange={(event) => update("notes", event.target.value)} placeholder="Project-wide decision: …\nReasoning: …\nOpen question: …" />
        </div>
        <div className="form-field">
          <label htmlFor={`evidence-${itemId}`}>Final verification summary</label>
          <span className="field-hint" id={evidenceHintId}>Summarize the end-to-end checks that support your handoff and what they do not prove.</span>
          <Textarea id={`evidence-${itemId}`} aria-describedby={`${evidenceHintId} ${evidencePrivacyId}`} className="form-textarea" maxLength={3000} value={form.evidence} disabled={loading || loadFailed} onChange={(event) => update("evidence", event.target.value)} placeholder="End-to-end check: …\nExpected: …\nObserved: …\nLimit: …" />
          <span className="field-hint" id={evidencePrivacyId}>Keep saved evidence small and sanitized; omit passwords, tokens, private addresses, and personal data.</span>
        </div>
      </div>
      <div className="form-field progress-repository-field">
        <label htmlFor={`repository-${itemId}`}>Repository or project URL <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label>
        <Input id={`repository-${itemId}`} className="form-input" type="url" maxLength={512} value={form.repositoryUrl} disabled={loading || loadFailed} onChange={(event) => update("repositoryUrl", event.target.value)} placeholder="https://github.com/…" />
      </div>
    </>;
  }

  if (status === "unavailable") {
    if (workspaceHandlesSessionFailure) return <p id={`progress-editor-${itemId}`}>Private notes are unavailable. Retry from the Build instructions.</p>;
    return <div id={`progress-editor-${itemId}`}><AuthUnavailableNotice message="Your account could not be checked. This private record is hidden until the account service responds." onRetry={retryLoad} /></div>;
  }

  if (status === "account-changed") {
    return <div id={`progress-editor-${itemId}`}><ProgressAccountChangedNotice /></div>;
  }

  if (status === "signed-out") {
    return <div id={`progress-editor-${itemId}`}><ProgressSignInNotice>{isDirty
      ? "Your session expired. Sign in to the same account and reopen this page to recover your draft."
      : "Sign in to view and edit this private learning record. Your course content remains available."}</ProgressSignInNotice></div>;
  }

  if (isProjectWorkbench && loadFailed) {
    return <div id={`progress-editor-${itemId}`} role="alert">
      <p>The saved project record could not be loaded. Retry before editing to avoid overwriting existing notes.</p>
      <Button className="button button-outline" type="button" onClick={retryLoad}><RefreshCw size={14} aria-hidden="true" /> Retry loading</Button>
    </div>;
  }

  const lastSaved = updatedAt === undefined ? undefined : formatSavedDate(updatedAt, { dateStyle: "medium", timeStyle: "short" });

  return (
    <section id={`progress-editor-${itemId}`} className={`card editor-card${wide ? " editor-card--wide" : ""}${isModuleSummary ? " progress-editor--module-summary" : ""}${isLessonStatus ? " progress-editor--lesson-status" : ""}${isProjectWorkbench ? " progress-editor--project-workbench" : ""}`} aria-labelledby={`editor-title-${itemId}`}>
      <EditorTitle id={`editor-title-${itemId}`}>{title}</EditorTitle>
      <p className="editor-intro">{isProjectWorkbench
        ? "Keep design decisions, useful evidence, and open questions in this one project record. Save partial work whenever you need; completion remains your self-report."
        : isLessonStatus
        ? "Choose a draft status, then save it below. Completion is self-reported and does not indicate mastery."
        : isModuleSummary
          ? "Mark your module progress and add a short reflection if useful. This is a self-report, not a mastery check. Saved privately to your account."
        : isPracticeRecord
          ? `Save partial work and return later. Record what you attempted, expected versus observed results, how you investigated, and how you verified the outcome. This is a self-report, not proof of mastery. Saved privately to your account.`
          : "Reading does not change this item’s status. Choose the status and independence level that reflect your work; the app does not verify mastery. This record is private to your account."}</p>
      {conflict && <ProgressConflictNotice draft={form} current={conflict.current} onUseSaved={() => resolveConflict(false)} onKeepDraft={() => resolveConflict(true)} />}
      <form onSubmit={submit}>
        {isLessonStatus ? (
          <div className="progress-lesson-status-control">
            <Button className="button button-primary" type="button" disabled={loading || loadFailed} onClick={() => update("status", form.status === "completed" ? "in_progress" : "completed")}>
              {form.status === "completed" ? "Set draft to in progress" : "Set draft to complete"}
            </Button>
            <span className="field-hint">Draft status: {formatStatus(form.status)}</span>
          </div>
        ) : (
        <div className="form-field">
          <label htmlFor={`status-${itemId}`}>Status</label>
          <select id={`status-${itemId}`} className="form-select" value={form.status} disabled={loading || loadFailed} onChange={(event) => update("status", event.target.value as ProgressInput["status"])}>
            {progressStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </select>
        {isProjectWorkbench && <span className="field-hint">Set the status that reflects your work. Checkpoints do not automatically change it.</span>}
        </div>
        )}
        {isProjectWorkbench && checkpointContext && <div className="form-field project-checkpoint-observation-field">
          <label htmlFor={`checkpoint-observation-${itemId}-${checkpointContext.id}`}>Checkpoint note <span>· {checkpointContext.id}</span></label>
          <span className="field-hint" id={`checkpoint-observation-help-${itemId}`}>This note is saved under this checkpoint in the same project record. Record your decision, observed result, evidence path, and any remaining uncertainty; keep full outputs in your repository.</span>
          <Textarea
            id={`checkpoint-observation-${itemId}-${checkpointContext.id}`}
            aria-describedby={`checkpoint-observation-help-${itemId}`}
            className="form-textarea"
            maxLength={1200}
            value={form.taskObservations?.[checkpointContext.id] ?? ""}
            disabled={loading || loadFailed}
            onChange={(event) => updateCheckpointObservation(event.target.value)}
            placeholder={`${checkpointContext.id} · ${checkpointContext.label}\nDecision: …\nObserved result: …\nEvidence path: …\nStill uncertain: …`}
          />
          <span className="field-hint project-checkpoint-observation-count">{(form.taskObservations?.[checkpointContext.id] ?? "").length} / 1,200 characters</span>
        </div>}
        {!isCompact && showComfort && (
          <div className="form-field">
            <label htmlFor={`comfort-${itemId}`}>How independently can you do this?</label>
            <select id={`comfort-${itemId}`} className="form-select" value={form.comfort ?? ""} disabled={loading || loadFailed} onChange={(event) => update("comfort", event.target.value ? event.target.value as ProgressInput["comfort"] : null)}>
              <option value="">Choose a level</option>
              {comfortLevels.map((level) => <option key={level} value={level}>{comfortLabels[level]}</option>)}
            </select>
            <span className="field-hint">Self-assessment only: Familiar = recognize it; Guided = build with references; Independent = reproduce and diagnose it. The app does not verify competence.</span>
          </div>
        )}
        {isCompact ? (
          isModuleSummary ? (
          <div className="form-field progress-summary-reflection">
            <label htmlFor={`notes-${itemId}`}>Reflection <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label>
            <Textarea id={`notes-${itemId}`} className="form-textarea" maxLength={3000} value={form.notes} disabled={loading || loadFailed} onChange={(event) => update("notes", event.target.value)} placeholder="What did you learn or want to revisit?" />
          </div>
          ) : null
        ) : (
          <>
        {isProjectWorkbench ? <details
          className="progress-project-wide-details"
          open={projectWideFieldsOpen}
          onToggle={(event) => setProjectWideFieldsPreference(event.currentTarget.open)}
        >
          <summary>Project-wide notes and final evidence <span>Optional</span></summary>
          {renderProjectWideFields()}
        </details> : <>
        <div className="progress-long-fields">
          <div className="form-field">
            <label htmlFor={`notes-${itemId}`}>Learning note</label>
            <span className="field-hint" id={noteHintId}>{isPracticeRecord ? "Describe what you attempted, expected, observed, and learned." : "Capture your goal, what you observed, any troubleshooting, and the lesson you took away."}</span>
            <Textarea id={`notes-${itemId}`} aria-describedby={noteHintId} className="form-textarea" maxLength={3000} value={form.notes} disabled={loading || loadFailed} onChange={(event) => update("notes", event.target.value)} placeholder={isPracticeRecord ? "Attempt: … Expected: … Observed: … Learned: …" : "What did you predict? What did you observe? What would you revisit?"} />
          </div>
          <div className="form-field">
            <label htmlFor={`evidence-${itemId}`}>Evidence or verification</label>
            <span className="field-hint" id={evidenceHintId}>{itemType === "troubleshooting" ? "Record the cause hypothesis, evidence that distinguishes it, the minimal change tested, and repeatable verification." : itemType === "activity" ? "Use the evidence checklist above. Note the relevant command or setting, what it showed, and how you confirmed your interpretation." : "Record commands or configuration, expected and observed results, and how you checked them."}</span>
            <Textarea id={`evidence-${itemId}`} aria-describedby={`${evidenceHintId} ${evidencePrivacyId}`} className="form-textarea" maxLength={3000} value={form.evidence} disabled={loading || loadFailed} onChange={(event) => update("evidence", event.target.value)} placeholder={isPracticeRecord ? "Evidence: … Expected: … Observed: … Verified by: …" : "Commands or configuration, expected versus observed result, and verification…"} />
            <span className="field-hint" id={evidencePrivacyId}>Keep saved evidence small and sanitized; omit passwords, tokens, private addresses, and personal data.</span>
          </div>
        </div>
          <div className="form-field progress-repository-field">
            <label htmlFor={`repository-${itemId}`}>Repository or project URL <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label>
            <Input id={`repository-${itemId}`} className="form-input" type="url" maxLength={512} value={form.repositoryUrl} disabled={loading || loadFailed} onChange={(event) => update("repositoryUrl", event.target.value)} placeholder="https://github.com/…" />
          </div>
        </>}
          </>
        )}
        <div className="form-footer progress-form-footer">
          <span className="field-hint">{loading ? "Loading saved progress…" : loadFailed ? "Saved progress could not be loaded" : isDirty ? `Unsaved changes${lastSaved ? ` · ${lastSaved.dateTime ? `last saved ${lastSaved.text}` : lastSaved.text}` : ""}` : lastSaved ? lastSaved.dateTime ? `Last saved ${lastSaved.text}` : lastSaved.text : "Not saved yet"}</span>
          <Button className="button button-primary" type="submit" disabled={saving || loading || loadFailed || Boolean(conflict)}>
            <Save size={15} aria-hidden="true" />{saving ? "Saving…" : isModuleSummary ? "Save module progress" : isProjectWorkbench ? "Save project notebook" : "Save learning record"}
          </Button>
        </div>
        {loadFailed && <Button className="button button-outline" type="button" onClick={retryLoad}><RefreshCw size={14} /> Retry loading</Button>}
        <p className={`form-message${error ? " error" : ""}`} role="status" aria-live="polite">{loadFailed ? "Saved progress could not be loaded. Retry before editing to avoid overwriting an existing note." : message}</p>
      </form>
    </section>
  );
}

