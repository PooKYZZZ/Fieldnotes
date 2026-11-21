"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/features/auth/auth-session-context";
import type { ProgressInput, ProgressRecord, ProgressStatus } from "@/features/progress/model";
import { progressAccountHeaders, progressConflict, progressDraftKey, readDraft, replaceDraft, storeDraft, type ProgressConflict, type ProgressDraft } from "@/features/progress/progress-draft";
import { useUnsavedChangesWarning } from "@/features/progress/use-unsaved-changes-warning";

function editableActivity(itemId: string, saved?: ProgressRecord | null): ProgressInput {
  return {
    itemType: "activity",
    itemId,
    status: saved?.status ?? "not_started",
    comfort: saved?.comfort ?? null,
    notes: saved?.notes ?? "",
    evidence: saved?.evidence ?? "",
    repositoryUrl: saved?.repositoryUrl ?? "",
    taskObservations: saved?.taskObservations ?? {},
  };
}

export function useActivityRecord(itemId: string) {
  const { userId, pending } = useAuthSession();
  const draftKey = progressDraftKey(userId, "activity", itemId);
  const [record, setRecord] = useState(() => editableActivity(itemId));
  const [saved, setSaved] = useState<ProgressRecord | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [accountChanged, setAccountChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageLocation, setMessageLocation] = useState<"notebook" | "review">("notebook");
  const [error, setError] = useState(false);
  const [conflict, setConflict] = useState<ProgressConflict>();
  const draftRef = useRef<ProgressDraft>(undefined);
  const recordRef = useRef(record);
  const requiresSignIn = (!pending && !userId) || sessionExpired || accountChanged;
  const loading = Boolean(userId) ? loadingRecord : pending;
  const visibleRecord = requiresSignIn ? editableActivity(itemId) : record;
  const savedRecord = editableActivity(itemId, requiresSignIn ? null : saved);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ itemType: "activity", itemId });
    fetch(`/api/progress?${query.toString()}`, { cache: "no-store", headers: progressAccountHeaders(userId), signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          setSessionExpired(true);
          return;
        }
        if (response.status === 409) {
          setAccountChanged(true);
          return;
        }
        if (!response.ok) throw new Error("Could not load this activity’s saved record.");
        const rows = await response.json() as ProgressRecord[];
        if (controller.signal.aborted) return;
        if (!Array.isArray(rows)) throw new Error("The saved record response was unexpected.");
        const existing = rows[0] ?? null;
        const draft = readDraft(draftKey, "activity", itemId);
        const next = draft?.form ?? editableActivity(itemId, existing);
        const savedRevision = existing?.revision ?? null;
        draftRef.current = draft;
        recordRef.current = next;
        setRecord(next);
        setSaved(existing);
        setRevision(draft ? draft.expectedRevision : savedRevision);
        setConflict(draft && savedRevision !== draft.expectedRevision ? { current: existing } : undefined);
        setIsDirty(Boolean(draft));
        setSessionExpired(false);
        setAccountChanged(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadFailed(true);
        setError(true);
        setMessage("The saved record could not be loaded. Retry before editing so existing notes are protected.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingRecord(false); });
    return () => controller.abort();
  }, [draftKey, itemId, loadAttempt, userId]);

  function resolveConflict(keepDraft: boolean) {
    const latest = conflict ? conflict.current : saved;
    const latestRevision = latest?.revision ?? null;
    if (keepDraft) {
      draftRef.current = storeDraft(draftKey, recordRef.current, latestRevision);
    } else {
      replaceDraft(draftKey, draftRef.current);
      draftRef.current = undefined;
      const next = editableActivity(itemId, latest);
      recordRef.current = next;
      setRecord(next);
      setIsDirty(false);
    }
    setSaved(latest);
    setRevision(latestRevision);
    setConflict(undefined);
    setError(false);
    setMessage(keepDraft ? "Draft kept. Review your changes before saving again." : "Showing the saved version.");
  }

  useUnsavedChangesWarning(`activity:${userId}:${itemId}`, isDirty && !requiresSignIn, () => resolveConflict(false));

  async function save(status: ProgressStatus, location: "notebook" | "review", action: "draft" | "reopen" = "draft") {
    if (!userId || requiresSignIn || loading || loadFailed || saving || conflict) return;
    setSaving(true);
    setMessageLocation(location);
    setError(false);
    setMessage("");
    const value = { ...recordRef.current, status };
    const submittedDraft = draftRef.current;
    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: progressAccountHeaders(userId, true),
        body: JSON.stringify({ record: value, expectedRevision: revision }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) setSessionExpired(true);
        if (typeof body === "object" && body !== null && "code" in body && body.code === "ACCOUNT_CHANGED") setAccountChanged(true);
        const changedRecord = progressConflict(body);
        if (changedRecord) {
          setConflict(changedRecord);
          return;
        }
        const errorText = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "The activity record could not be saved.";
        throw new Error(errorText);
      }
      if (typeof body !== "object" || body === null || !("updatedAt" in body) || typeof body.updatedAt !== "number") {
        throw new Error("The server returned an unexpected save response.");
      }
      const updated = body as ProgressRecord;
      const next = editableActivity(itemId, updated);
      setSaved(updated);
      recordRef.current = next;
      setRecord(next);
      setRevision(updated.revision);
      replaceDraft(draftKey, submittedDraft);
      draftRef.current = undefined;
      setIsDirty(false);
      const keptCompleted = record.status === "completed" && status === "completed";
      setMessage(status === "completed"
        ? keptCompleted ? "Draft saved to your account. The activity remains marked complete." : "Activity marked complete in your account."
        : action === "reopen" ? "Activity marked in progress in your account." : "Draft saved to your account.");
      window.dispatchEvent(new CustomEvent("progress-updated"));
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "The activity record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ProgressInput>(key: K, value: ProgressInput[K]) {
    const next = { ...recordRef.current, [key]: value };
    recordRef.current = next;
    setRecord(next);
    draftRef.current = storeDraft(draftKey, next, revision);
    setIsDirty(true);
    setError(false);
    setMessage("");
  }

  function retryLoad() {
    setLoadingRecord(true);
    setLoadFailed(false);
    setError(false);
    setMessage("");
    setLoadAttempt((attempt) => attempt + 1);
  }

  return {
    record: visibleRecord, savedRecord, updatedAt: requiresSignIn ? undefined : saved?.updatedAt,
    isDirty, loading, loadFailed, requiresSignIn, accountChanged, saving, error, message, messageLocation,
    conflict: requiresSignIn ? undefined : conflict, resolveConflict, save, update, retryLoad, setError, setMessage,
  };
}
