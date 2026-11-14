"use client";

import { useState, type ChangeEvent } from "react";
import { Download, FileUp } from "lucide-react";

type ExportRecord = {
  itemType: string;
  itemId: string;
  status: string;
  comfort: string | null;
  notes: string;
  evidence: string;
  repositoryUrl: string;
  updatedAt: number;
};

type ExportPayload = { version: 1; exportedAt: string; records: ExportRecord[] };

function isExportPayload(value: unknown): value is ExportPayload {
  return typeof value === "object"
    && value !== null
    && "version" in value
    && value.version === 1
    && "exportedAt" in value
    && typeof value.exportedAt === "string"
    && "records" in value
    && Array.isArray(value.records);
}

export function ProgressBackup() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function exportProgress() {
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch("/api/progress", { cache: "no-store" });
      if (!response.ok) throw new Error("Saved progress could not be exported.");
      const records = await response.json() as ExportRecord[];
      const payload: ExportPayload = { version: 1, exportedAt: new Date().toISOString(), records };
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

  async function importProgress(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      if (file.size > 1_000_000) throw new Error("Choose a backup smaller than 1 MB.");
      const payload: unknown = JSON.parse(await file.text());
      if (!isExportPayload(payload)) throw new Error("This is not a supported Fieldnotes progress backup.");
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const serverMessage = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "Progress backup could not be imported.";
        throw new Error(serverMessage);
      }
      const importedCount = typeof result === "object" && result !== null && "importedCount" in result && typeof result.importedCount === "number" ? result.importedCount : payload.records.length;
      window.dispatchEvent(new CustomEvent("progress-updated"));
      setMessage(`${importedCount} ${importedCount === 1 ? "record was" : "records were"} imported. Matching items were updated; other saved records were kept.`);
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Progress backup could not be imported.");
    } finally {
      input.value = "";
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad progress-backup" aria-labelledby="progress-backup-title">
      <div className="progress-backup-copy">
        <p className="eyebrow">Your local data</p>
        <h2 id="progress-backup-title">Backup and restore</h2>
        <p>Export notes and progress to a JSON file, or import a backup. Import merges records: matching items are updated, while other saved records stay. Imported records receive a new saved timestamp.</p>
      </div>
      <div className="progress-backup-actions">
        <button className="button button-outline" type="button" onClick={exportProgress} disabled={busy}><Download size={15} /> Export JSON</button>
        <label className="backup-file-label">
          <FileUp size={15} /> Import JSON
          <input type="file" accept="application/json,.json" onChange={importProgress} disabled={busy} aria-label="Import a Fieldnotes JSON backup" />
        </label>
      </div>
      <p className={`form-message${error ? " error" : ""}`} role="status" aria-live="polite">{busy ? "Working with your local backup…" : message}</p>
    </section>
  );
}
