"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { RefreshCw, Save } from "lucide-react";
import { comfortLevels, formatStatus, progressStatuses, type ProgressInput, type ProgressRecord } from "@/features/progress/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedChangesWarning } from "@/features/progress/use-unsaved-changes-warning";
import { ProgressSignInNotice } from "@/features/auth/progress-sign-in-notice";

const blankRecord = (itemType: ProgressInput["itemType"], itemId: string): ProgressInput => ({
  itemType,
  itemId,
  status: "not_started",
  comfort: null,
  notes: "",
  evidence: "",
  repositoryUrl: "",
});
const comfortLabels = { familiar: "Familiar", guided: "Guided", independent: "Independent" };

export function ProgressEditor({
  itemType,
  itemId,
  title = "Progress note",
  showComfort = false,
  wide = false,
  bare = false,
  recordContext,
  reflectionPrompt,
  checkpointContext,
  variant = "full",
}: {
  itemType: ProgressInput["itemType"];
  itemId: string;
  title?: string;
  showComfort?: boolean;
  wide?: boolean;
  bare?: boolean;
  recordContext?: string;
  reflectionPrompt?: string;
  checkpointContext?: { id: string; label: string };
  variant?: "full" | "module-summary" | "lesson-status" | "activity-lab" | "project-workbench";
}) {
  const isModuleSummary = variant === "module-summary";
  const isLessonStatus = variant === "lesson-status";
  const isActivityLab = variant === "activity-lab";
  const isProjectWorkbench = variant === "project-workbench";
  const isPracticeRecord = itemType === "activity" || itemType === "troubleshooting";
  const isCompact = isModuleSummary || isLessonStatus;
  const EditorTitle = bare || isActivityLab || isProjectWorkbench ? "h3" : "h2";
  const noteHintId = `notes-help-${itemId}`;
  const noteReflectionId = `notes-reflection-${itemId}`;
  const evidenceHintId = `evidence-help-${itemId}`;
  const evidencePrivacyId = `evidence-privacy-${itemId}`;
  const [form, setForm] = useState<ProgressInput>(() => blankRecord(itemType, itemId));
  const [updatedAt, setUpdatedAt] = useState<number>();
  const [isDirty, setIsDirty] = useState(false);
  const [repositoryOpen, setRepositoryOpen] = useState(false);
  const [projectWideFieldsOpen, setProjectWideFieldsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const editRevision = useRef(0);

  useUnsavedChangesWarning(`progress:${itemType}:${itemId}`, isDirty);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ itemType, itemId });
    fetch(`/api/progress?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setRequiresSignIn(true);
          throw new Error("Sign in to open your personal learning record.");
        }
        if (!response.ok) throw new Error("Could not load the saved note.");
        const rows = (await response.json()) as ProgressRecord[];
        const saved = rows[0];
        if (saved) {
          setForm({
            itemType: saved.itemType,
            itemId: saved.itemId,
            status: saved.status,
            comfort: saved.comfort,
            notes: saved.notes,
            evidence: saved.evidence,
            repositoryUrl: saved.repositoryUrl,
            ...(saved.taskObservations ? { taskObservations: saved.taskObservations } : itemType === "project" || itemType === "small_project" ? { taskObservations: {} } : {}),
          });
          setUpdatedAt(saved.updatedAt);
          setIsDirty(false);
          setRepositoryOpen(Boolean(saved.repositoryUrl));
          if ((itemType === "project" || itemType === "small_project") && (saved.notes || saved.evidence || saved.repositoryUrl)) {
            setProjectWideFieldsOpen(true);
          }
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError(true);
        setLoadFailed(true);
        setMessage("Saved progress could not be loaded. Retry before editing to avoid overwriting an existing note.");
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [itemType, itemId, loadAttempt]);

  function retryLoad() {
    setLoading(true);
    setError(false);
    setLoadFailed(false);
    setRequiresSignIn(false);
    setMessage("");
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedRevision = editRevision.current;
    const submittedForm = form;
    setSaving(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedForm),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) setRequiresSignIn(true);
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "The note could not be saved.";
        throw new Error(message);
      }
      if (typeof body !== "object" || body === null || !("updatedAt" in body) || typeof body.updatedAt !== "number") {
        throw new Error("The server returned an unexpected save response.");
      }
      const saved = body as ProgressRecord;
      setUpdatedAt(saved.updatedAt);
      setRequiresSignIn(false);
      const hasNewerEdits = editRevision.current !== submittedRevision;
      setIsDirty(hasNewerEdits);
      setMessage(hasNewerEdits ? "Earlier changes saved to your account. Newer edits still need saving." : "Saved to your account.");
      window.dispatchEvent(new CustomEvent("progress-updated"));
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "The note could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ProgressInput>(key: K, value: ProgressInput[K]) {
    editRevision.current += 1;
    setForm((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
    setError(false);
    setMessage("");
  }

  function updateCheckpointObservation(value: string) {
    if (!checkpointContext) return;
    editRevision.current += 1;
    setForm((current) => ({
      ...current,
      taskObservations: {
        ...(current.taskObservations ?? {}),
        [checkpointContext.id]: value,
      },
    }));
    setIsDirty(true);
    setError(false);
    setMessage("");
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

  if (requiresSignIn && !isDirty) {
    return <div id={`progress-editor-${itemId}`}><ProgressSignInNotice>Sign in to view and edit this private learning record. Your course content remains available.</ProgressSignInNotice></div>;
  }

  return (
    <section id={`progress-editor-${itemId}`} className={`card editor-card${wide ? " editor-card--wide" : ""}${bare ? " editor-card--bare" : ""}${isModuleSummary ? " progress-editor--module-summary" : ""}${isLessonStatus ? " progress-editor--lesson-status" : ""}${isActivityLab ? " progress-editor--activity-lab" : ""}${isProjectWorkbench ? " progress-editor--project-workbench" : ""}`} aria-labelledby={`editor-title-${itemId}`}>
      <EditorTitle id={`editor-title-${itemId}`}>{title}</EditorTitle>
      <p className="editor-intro">{isActivityLab
        ? "Record sanitized findings and the commands that support them. Save partial work at any time; choose Completed only when you want to record that status yourself."
        : isProjectWorkbench
        ? "Keep design decisions, useful evidence, and open questions in this one project record. Save partial work whenever you need; completion remains your self-report."
        : bare && isPracticeRecord
        ? "This self-reported record is private to your account on this Fieldnotes server; it does not prove mastery."
        : isLessonStatus
        ? "Choose a draft status, then save it below. Completion is self-reported and does not indicate mastery."
        : isModuleSummary
          ? "Mark your module progress and add a short reflection if useful. This is a self-report, not a mastery check. Saved privately to your account."
        : isPracticeRecord
          ? `Save partial work and return later. Record what you attempted, expected versus observed results, how you investigated, and how you verified the outcome. This is a self-report, not proof of mastery. Saved privately to your account.`
          : "Reading does not change this item’s status. Choose the status and independence level that reflect your work; the app does not verify mastery. This record is private to your account."}</p>
      {requiresSignIn && <ProgressSignInNotice reloadAfterSignIn={!isDirty}>Your session has expired. Your unsaved text is still open here. Sign in in another tab, return, and save again.</ProgressSignInNotice>}
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
        {isActivityLab && <span className="field-hint">Saving keeps this choice; it never marks the activity complete automatically.</span>}
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
          onToggle={(event) => setProjectWideFieldsOpen(event.currentTarget.open)}
        >
          <summary>Project-wide notes and final evidence <span>Optional</span></summary>
          {renderProjectWideFields()}
        </details> : <>
        <div className="progress-long-fields">
          <div className="form-field">
            <label htmlFor={`notes-${itemId}`}>{isActivityLab ? "Findings and reflection" : "Learning note"}</label>
            <span className="field-hint" id={noteHintId}>{isActivityLab
              ? `For ${recordContext ?? itemId}, interpret the process state, memory, and unit result. Separate what you observed from what you infer.`
              : itemType === "activity" && recordContext
              ? `For ${recordContext}, describe what you attempted, what you expected, what you observed, and what you learned.`
              : isPracticeRecord ? "Describe what you attempted, expected, observed, and learned." : "Capture your goal, what you observed, any troubleshooting, and the lesson you took away."}</span>
            <Textarea id={`notes-${itemId}`} aria-describedby={reflectionPrompt ? `${noteHintId} ${noteReflectionId}` : noteHintId} className="form-textarea" maxLength={3000} value={form.notes} disabled={loading || loadFailed} onChange={(event) => update("notes", event.target.value)} placeholder={isActivityLab ? "Process and finding: …\nWhat it suggests: …\nWhat remains uncertain: …" : isPracticeRecord ? "Attempt: … Expected: … Observed: … Learned: …" : "What did you predict? What did you observe? What would you revisit?"} />
            {reflectionPrompt && <span className="field-hint" id={noteReflectionId}>Reflection prompt: {reflectionPrompt}</span>}
          </div>
          <div className="form-field">
            <label htmlFor={`evidence-${itemId}`}>{isActivityLab ? "Commands and evidence" : "Evidence or verification"}</label>
            <span className="field-hint" id={evidenceHintId}>{isActivityLab
              ? "Record the commands and sanitized results that support your process and systemd observations."
              : itemType === "troubleshooting" ? "Record the cause hypothesis, evidence that distinguishes it, the minimal change tested, and repeatable verification." : itemType === "activity" ? "Use the evidence checklist above. Note the relevant command or setting, what it showed, and how you confirmed your interpretation." : "Record commands or configuration, expected and observed results, and how you checked them."}</span>
            <Textarea id={`evidence-${itemId}`} aria-describedby={`${evidenceHintId} ${evidencePrivacyId}`} className="form-textarea" maxLength={3000} value={form.evidence} disabled={loading || loadFailed} onChange={(event) => update("evidence", event.target.value)} placeholder={isActivityLab ? "Command and relevant result: …\nVerification: …" : isPracticeRecord ? "Evidence: … Expected: … Observed: … Verified by: …" : "Commands or configuration, expected versus observed result, and verification…"} />
            <span className="field-hint" id={evidencePrivacyId}>Keep saved evidence small and sanitized; omit passwords, tokens, private addresses, and personal data.</span>
          </div>
        </div>
        {isActivityLab ? (
          <details className="progress-repository-field progress-optional-repository" open={repositoryOpen} onToggle={(event) => setRepositoryOpen(event.currentTarget.open)}>
            <summary>Repository or project URL (optional)</summary>
            <div className="form-field">
              <label htmlFor={`repository-${itemId}`}>Repository or project URL</label>
              <Input id={`repository-${itemId}`} className="form-input" type="url" maxLength={512} value={form.repositoryUrl} disabled={loading || loadFailed} onChange={(event) => update("repositoryUrl", event.target.value)} placeholder="https://github.com/…" />
            </div>
          </details>
        ) : (
          <div className="form-field progress-repository-field">
            <label htmlFor={`repository-${itemId}`}>Repository or project URL <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label>
            <Input id={`repository-${itemId}`} className="form-input" type="url" maxLength={512} value={form.repositoryUrl} disabled={loading || loadFailed} onChange={(event) => update("repositoryUrl", event.target.value)} placeholder="https://github.com/…" />
          </div>
        )}
        </>}
          </>
        )}
        <div className="form-footer progress-form-footer">
          <span className="field-hint">{loading ? "Loading saved progress…" : loadFailed ? "Saved progress could not be loaded" : isDirty ? `Unsaved changes${updatedAt ? ` · last saved ${new Date(updatedAt).toLocaleString()}` : ""}` : updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet"}</span>
          <Button className="button button-primary" type="submit" disabled={saving || loading || loadFailed}>
            <Save size={15} aria-hidden="true" />{saving ? "Saving…" : isModuleSummary ? "Save module progress" : isProjectWorkbench ? "Save project notebook" : "Save learning record"}
          </Button>
        </div>
        {loadFailed && <Button className="button button-outline" type="button" onClick={retryLoad}><RefreshCw size={14} /> Retry loading</Button>}
        <p className={`form-message${error ? " error" : ""}`} role="status" aria-live="polite">{message}</p>
      </form>
    </section>
  );
}

