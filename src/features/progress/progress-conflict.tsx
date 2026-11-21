import { formatStatus, type ProgressInput, type ProgressRecord } from "@/features/progress/model";

export function ProgressConflictNotice({ draft, current, onUseSaved, onKeepDraft }: {
  draft: ProgressInput;
  current: ProgressRecord | null;
  onUseSaved: () => void;
  onKeepDraft: () => void;
}) {
  const taskIds = new Set([...Object.keys(current?.taskObservations ?? {}), ...Object.keys(draft.taskObservations ?? {})]);
  const fields = [
    { label: "Status", saved: current && formatStatus(current.status), draft: formatStatus(draft.status) },
    { label: "Confidence", saved: current?.comfort, draft: draft.comfort },
    { label: "Learning note", saved: current?.notes, draft: draft.notes },
    { label: "Evidence", saved: current?.evidence, draft: draft.evidence },
    { label: "Repository or project URL", saved: current?.repositoryUrl, draft: draft.repositoryUrl },
    ...[...taskIds].map((id) => ({ label: id, saved: current?.taskObservations?.[id], draft: draft.taskObservations?.[id] })),
  ].filter((field) => (field.saved ?? "") !== (field.draft ?? ""));

  return <section className="progress-conflict">
    <p role="status"><strong>A newer change was saved.</strong> Your draft is still available.</p>
    <details>
      <summary>Compare saved version</summary>
      {current ? <p>Saved {new Date(current.updatedAt).toLocaleString()}.</p> : <p>There is no longer a saved record for this item.</p>}
      {fields.length ? <dl>{fields.map((field) => <div key={field.label}>
        <dt>{field.label}</dt>
        <dd><strong>Saved version</strong> {field.saved || "Empty"}</dd>
        <dd><strong>Your draft</strong> {field.draft || "Empty"}</dd>
      </div>)}</dl> : <p>The visible fields match your draft.</p>}
    </details>
    <p>Use the saved version to discard this draft. Keep your draft to review it and choose Save again when you are ready to replace the saved version.</p>
    <div className="progress-conflict-actions">
      <button type="button" className="button button-outline" onClick={onUseSaved}>Use saved version</button>
      <button type="button" className="button button-outline" onClick={onKeepDraft}>Keep my draft</button>
    </div>
  </section>;
}
