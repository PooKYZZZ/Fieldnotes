"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, FileUp } from "lucide-react";
import { useAuthSession } from "@/features/auth/auth-session-context";
import { maxBackupBytes } from "@/features/progress/backup-limits";
import { progressAccountHeaders } from "@/features/progress/progress-draft";
import type { ProgressRecord } from "@/features/progress/model";

type ExportRecord = Omit<ProgressRecord, "revision">;
type ExportPayload = { version: 1 | 2 | 3; exportedAt: string; records: ExportRecord[] };
type ImportOverlap = {
  itemType: string;
  itemId: string;
  importedUpdatedAt: number;
  currentUpdatedAt: number;
  preserveCurrent: boolean;
};
type ImportPreview = {
  preview: true;
  totalCount: number;
  overlappingCount: number;
  preservedCount: number;
  overlaps: ImportOverlap[];
};
type PendingImport = { payload: ExportPayload; preview: ImportPreview };

function isExportPayload(value: unknown): value is ExportPayload {
  return typeof value === "object"
    && value !== null
    && "version" in value
    && (value.version === 1 || value.version === 2 || value.version === 3)
    && "exportedAt" in value
    && typeof value.exportedAt === "string"
    && "records" in value
    && Array.isArray(value.records);
}

function isImportPreview(value: unknown): value is ImportPreview {
  return typeof value === "object" && value !== null
    && "preview" in value && value.preview === true
    && "totalCount" in value && typeof value.totalCount === "number"
    && "overlappingCount" in value && typeof value.overlappingCount === "number"
    && "preservedCount" in value && typeof value.preservedCount === "number"
    && "overlaps" in value && Array.isArray(value.overlaps);
}

function serverError(value: unknown, fallback: string): string {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}

export function ProgressBackup() {
  const session = useAuthSession();
  if (session.status === "loading") return <p role="status">Loading backup options…</p>;
  if (session.status !== "signed-in") return null;
  return <aside className="progress-backup-rail" aria-label="Progress data tools"><AccountProgressBackup key={session.userId} userId={session.userId} /></aside>;
}

function AccountProgressBackup({ userId }: { userId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRequest = useRef<AbortController>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport>();

  useEffect(() => () => activeRequest.current?.abort(), []);

  function startRequest() {
    const controller = new AbortController();
    activeRequest.current = controller;
    return controller.signal;
  }

  async function exportProgress() {
    const signal = startRequest();
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch("/api/progress", { cache: "no-store", headers: progressAccountHeaders(userId), signal });
      if (!response.ok) throw new Error("Saved progress could not be exported.");
      const records = await response.json() as ProgressRecord[];
      if (signal.aborted) return;
      const backupRecords: ExportRecord[] = records.map(({ itemType, itemId, status, comfort, notes, evidence, repositoryUrl, updatedAt, taskObservations }) => ({
        itemType,
        itemId,
        status,
        comfort,
        notes,
        evidence,
        repositoryUrl,
        updatedAt,
        taskObservations,
      }));
      const payload: ExportPayload = { version: 3, exportedAt: new Date().toISOString(), records: backupRecords };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `fieldnotes-progress-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setMessage(`${records.length} saved ${records.length === 1 ? "record was" : "records were"} exported to a JSON backup.`);
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Saved progress could not be exported.");
    } finally {
      setBusy(false);
    }
  }

  async function previewImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const signal = startRequest();
    setBusy(true);
    setError(false);
    setMessage("");
    setPendingImport(undefined);
    try {
      if (file.size > maxBackupBytes) throw new Error("This backup is larger than the 32 MiB restore limit.");
      const value: unknown = JSON.parse(await file.text());
      if (!isExportPayload(value)) throw new Error("This is not a supported Fieldnotes progress backup.");
      const response = await fetch("/api/progress?preview=true", {
        method: "POST",
        headers: progressAccountHeaders(userId, true),
        body: JSON.stringify(value),
        signal,
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(serverError(result, "This backup could not be validated."));
      if (!isImportPreview(result)) throw new Error("The server returned an unexpected restore preview.");
      setPendingImport({ payload: value, preview: result });
      setMessage("Review the merge details, then choose Apply merge to restore this backup.");
    } catch (caught) {
      input.value = "";
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Progress backup could not be previewed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyImport() {
    if (!pendingImport) return;
    const signal = startRequest();
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: progressAccountHeaders(userId, true),
        body: JSON.stringify(pendingImport.payload),
        signal,
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(serverError(result, "Progress backup could not be imported."));
      const importedCount = typeof result === "object" && result !== null && "importedCount" in result && typeof result.importedCount === "number"
        ? result.importedCount
        : 0;
      const preservedCount = typeof result === "object" && result !== null && "preservedCount" in result && typeof result.preservedCount === "number"
        ? result.preservedCount
        : 0;
      window.dispatchEvent(new CustomEvent("progress-updated", { detail: { source: "restore" } }));
      setPendingImport(undefined);
      setMessage(`${importedCount} ${importedCount === 1 ? "record was" : "records were"} restored; ${preservedCount} equal or newer saved ${preservedCount === 1 ? "record was" : "records were"} kept.`);
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Progress backup could not be imported.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setBusy(false);
    }
  }

  function cancelImport() {
    setPendingImport(undefined);
    setMessage("Restore cancelled. No records were changed.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const preview = pendingImport?.preview;

  return (
    <section className="card card-pad progress-backup" aria-labelledby="progress-backup-title">
      <div className="progress-backup-copy">
        <p className="eyebrow">Your local data</p>
        <h2 id="progress-backup-title">Backup and restore</h2>
        <p>Export notes and progress to a JSON file, or preview a restore before merging. Matching records are updated only when the backup is newer; equal or newer saved records are kept. If an older record shows “Saved date unavailable,” or a backup date is rejected as too far in the future, open its Edit link and save it before exporting a backup to restore elsewhere.</p>
      </div>
      <div className="progress-backup-actions">
        <button className="button button-outline" type="button" onClick={exportProgress} disabled={busy}><Download size={15} /> Export JSON</button>
        <label className="backup-file-label">
          <FileUp size={15} /> Import JSON
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={previewImport} disabled={busy} aria-label="Import a Fieldnotes JSON backup" />
        </label>
      </div>
      {preview && <div className="progress-restore-preview" aria-labelledby="progress-restore-preview-title">
        <h3 id="progress-restore-preview-title">Restore preview</h3>
        <p>Estimates at preview time: {preview.totalCount} records in the backup · {preview.overlappingCount} match records already saved here · {preview.preservedCount} equal or newer saved records will be kept · {preview.totalCount - preview.preservedCount} records will be restored. Current records are checked again when you apply.</p>
        {preview.overlaps.length > 0 && <ul aria-label="Matching saved records">
          {preview.overlaps.map((item) => <li key={`${item.itemType}:${item.itemId}`}>
            <strong>{item.itemType} {item.itemId}</strong>: {item.preserveCurrent ? "keep the saved record" : "replace with the newer backup record"}
          </li>)}
        </ul>}
        <div className="progress-backup-actions">
          <button className="button button-primary" type="button" onClick={() => void applyImport()} disabled={busy}>Apply merge</button>
          <button className="button button-outline" type="button" onClick={cancelImport} disabled={busy}>Cancel restore</button>
        </div>
      </div>}
      <p className={`form-message${error ? " error" : ""}`} role="status" aria-live="polite">{busy ? "Working with your local backup…" : message}</p>
    </section>
  );
}
