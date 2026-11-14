"use client";

import { useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Save } from "lucide-react";
import { comfortLevels, formatStatus, progressStatuses, type ProgressInput, type ProgressRecord } from "@/features/progress/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  variant = "full",
}: {
  itemType: ProgressInput["itemType"];
  itemId: string;
  title?: string;
  showComfort?: boolean;
  wide?: boolean;
  variant?: "full" | "module-summary" | "lesson-status";
}) {
  const isModuleSummary = variant === "module-summary";
  const isLessonStatus = variant === "lesson-status";
  const isCompact = isModuleSummary || isLessonStatus;
  const [form, setForm] = useState<ProgressInput>(() => blankRecord(itemType, itemId));
  const [updatedAt, setUpdatedAt] = useState<number>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ itemType, itemId });
    fetch(`/api/progress?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
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
          });
          setUpdatedAt(saved.updatedAt);
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
    setMessage("");
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
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
      setMessage("Saved on this device.");
      window.dispatchEvent(new CustomEvent("progress-updated"));
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "The note could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ProgressInput>(key: K, value: ProgressInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section id={`progress-editor-${itemId}`} className={`card editor-card${wide ? " editor-card--wide" : ""}${isModuleSummary ? " progress-editor--module-summary" : ""}${isLessonStatus ? " progress-editor--lesson-status" : ""}`} aria-labelledby={`editor-title-${itemId}`}>
      <h2 id={`editor-title-${itemId}`}>{title}</h2>
      <p className="editor-intro">{isLessonStatus
        ? "Lesson completion is learner-reported and does not indicate mastery."
        : isModuleSummary
          ? "Mark your module progress and add a short reflection if useful. This is a self-report, not a mastery check. Saved in this Fieldnotes workspace."
        : "Reading does not change this item’s status. Choose the status and independence level that reflect your work; the app does not verify mastery. This record is saved in this Fieldnotes workspace."}</p>
      <form onSubmit={submit}>
        {isLessonStatus ? (
          <div className="progress-lesson-status-control">
            <Button className="button button-primary" type="button" disabled={loading || loadFailed} onClick={() => update("status", form.status === "completed" ? "in_progress" : "completed")}>
              {form.status === "completed" ? "Mark as in progress" : "Mark lesson complete"}
            </Button>
            <span className="field-hint">{formatStatus(form.status)}</span>
          </div>
        ) : (
        <div className="form-field">
          <label htmlFor={`status-${itemId}`}>Status</label>
          <select id={`status-${itemId}`} className="form-select" value={form.status} onChange={(event) => update("status", event.target.value as ProgressInput["status"])}>
            {progressStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </select>
        </div>
        )}
        {!isCompact && showComfort && (
          <div className="form-field">
            <label htmlFor={`comfort-${itemId}`}>How independently can you do this?</label>
            <select id={`comfort-${itemId}`} className="form-select" value={form.comfort ?? ""} onChange={(event) => update("comfort", event.target.value ? event.target.value as ProgressInput["comfort"] : null)}>
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
            <Textarea id={`notes-${itemId}`} className="form-textarea" maxLength={3000} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="What did you learn or want to revisit?" />
          </div>
          ) : null
        ) : (
          <>
        <div className="progress-long-fields">
          <div className="form-field">
            <label htmlFor={`notes-${itemId}`}>Learning note</label>
            <span className="field-hint">A useful reflection can capture your goal, what you observed, any troubleshooting, and the lesson you took away.</span>
            <Textarea id={`notes-${itemId}`} className="form-textarea" maxLength={3000} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="What did you predict? What did you observe? What would you revisit?" />
          </div>
          <div className="form-field">
            <label htmlFor={`evidence-${itemId}`}>Evidence or verification</label>
            <span className="field-hint">Record the command or artifact, observed result, and how you checked it. Keep the excerpt small and sanitized.</span>
            <Textarea id={`evidence-${itemId}`} className="form-textarea" maxLength={3000} value={form.evidence} onChange={(event) => update("evidence", event.target.value)} placeholder="Commands, observed result, and verification…" />
            <span className="field-hint">Keep it sanitized: no passwords, tokens, private addresses, or personal data.</span>
          </div>
        </div>
        <div className="form-field progress-repository-field">
          <label htmlFor={`repository-${itemId}`}>Repository or project URL <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label>
          <Input id={`repository-${itemId}`} className="form-input" type="url" maxLength={512} value={form.repositoryUrl} onChange={(event) => update("repositoryUrl", event.target.value)} placeholder="https://github.com/…" />
        </div>
          </>
        )}
        <div className="form-footer progress-form-footer">
          <span className="field-hint">{loading ? "Loading saved progress…" : updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet"}</span>
          <Button className="button button-primary" type="submit" disabled={saving || loading || loadFailed}>
            <Save size={15} aria-hidden="true" />{saving ? "Saving…" : isModuleSummary ? "Save module progress" : "Save learning record"}
          </Button>
        </div>
        {loadFailed && <Button className="button button-outline" type="button" onClick={retryLoad}><RefreshCw size={14} /> Retry loading</Button>}
        <p className={`form-message${error ? " error" : ""}`} role="status" aria-live="polite">{message}</p>
      </form>
    </section>
  );
}

