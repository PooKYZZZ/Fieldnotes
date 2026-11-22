"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuthSession } from "@/features/auth/auth-session-context";
import type { ProgressInput, ProgressRecord, ProgressStatus } from "@/features/progress/model";
import {
  progressAccountHeaders,
  progressConflict,
  progressDraftKey,
  readDraft,
  replaceDraft,
  storeDraft,
  type ProgressConflict,
  type ProgressDraft,
} from "@/features/progress/progress-draft";
import { useUnsavedChangesWarning } from "@/features/progress/use-unsaved-changes-warning";

type ItemType = ProgressInput["itemType"];
type LoadStatus = "loading" | "ready" | "signed-out" | "unavailable" | "error" | "account-changed";

type SavedRecordSource = {
  status: LoadStatus;
  record: ProgressRecord | null;
  version: number;
  load: () => void;
  retry: () => void;
  publish: (record: ProgressRecord) => void;
};

function editableRecord(itemType: ItemType, itemId: string, saved: ProgressRecord | null): ProgressInput {
  return {
    itemType,
    itemId,
    status: saved?.status ?? "not_started",
    comfort: saved?.comfort ?? null,
    notes: saved?.notes ?? "",
    evidence: saved?.evidence ?? "",
    repositoryUrl: saved?.repositoryUrl ?? "",
    ...(saved?.taskObservations ? { taskObservations: saved.taskObservations } : {}),
  };
}

function isRecordForItem(body: unknown, itemType: ItemType, itemId: string): body is ProgressRecord {
  return typeof body === "object" && body !== null
    && "itemType" in body && body.itemType === itemType
    && "itemId" in body && body.itemId === itemId
    && "revision" in body && typeof body.revision === "number"
    && Number.isSafeInteger(body.revision) && body.revision > 0
    && "updatedAt" in body && typeof body.updatedAt === "number"
    && "status" in body && typeof body.status === "string"
    && "notes" in body && typeof body.notes === "string"
    && "evidence" in body && typeof body.evidence === "string"
    && "repositoryUrl" in body && typeof body.repositoryUrl === "string";
}

/** The calling component keys this editor by account and learning item. */
export function useProgressRecord(itemType: ItemType, itemId: string, source?: SavedRecordSource) {
  const session = useAuthSession();
  const userId = session.status === "signed-in" ? session.userId : undefined;
  const draftKey = progressDraftKey(userId, itemType, itemId);
  const [form, setForm] = useState(() => editableRecord(itemType, itemId, null));
  const [saved, setSaved] = useState<ProgressRecord | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [hydratedVersion, setHydratedVersion] = useState<number>();
  const [saveBlocked, setSaveBlocked] = useState<"signed-out" | "account-changed">();
  const [conflict, setConflict] = useState<ProgressConflict>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const draftRef = useRef<ProgressDraft>(undefined);
  const formRef = useRef(form);
  const activeSave = useRef<AbortController>(undefined);
  const sourceStatus = source?.status;
  const sourceVersion = source?.version;
  const sourceRecord = source?.record;
  const sourceLoad = source?.load;

  let status: LoadStatus;
  if (session.status === "unavailable" || session.status === "signed-out" || session.status === "loading") {
    status = session.status;
  } else if (saveBlocked) {
    status = saveBlocked;
  } else if (sourceStatus === "ready") {
    status = hydratedVersion === sourceVersion ? "ready" : "loading";
  } else {
    status = sourceStatus ?? loadStatus;
  }

  const hydrate = useCallback((stored: ProgressRecord | null) => {
    const draft = draftRef.current ?? readDraft(draftKey, itemType, itemId);
    const next = draft?.form ?? editableRecord(itemType, itemId, stored);
    draftRef.current = draft;
    formRef.current = next;
    setForm(next);
    setSaved(stored);
    setIsDirty(Boolean(draft));
    setConflict(draft && draft.expectedRevision !== (stored?.revision ?? null) ? { current: stored } : undefined);
  }, [draftKey, itemId, itemType]);

  useEffect(() => {
    if (!userId || sourceStatus !== undefined) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ itemType, itemId });
    fetch(`/api/progress?${query}`, { cache: "no-store", headers: progressAccountHeaders(userId), signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 409) {
          setLoadStatus(response.status === 401 ? "signed-out" : "account-changed");
          return;
        }
        if (!response.ok) throw new Error("Progress read failed");
        const rows: unknown = await response.json();
        if (controller.signal.aborted) return;
        if (!Array.isArray(rows) || (rows.length && !isRecordForItem(rows[0], itemType, itemId))) {
          throw new Error("Unexpected progress record");
        }
        hydrate(rows[0] ?? null);
        setLoadStatus("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setLoadStatus("error"); });
    return () => controller.abort();
  }, [attempt, hydrate, itemId, itemType, sourceStatus, userId]);

  useEffect(() => {
    if (!userId || sourceStatus === undefined) return;
    if (sourceStatus === "loading") sourceLoad?.();
    if (sourceStatus !== "ready" || sourceVersion === hydratedVersion) return;
    let canceled = false;
    queueMicrotask(() => {
      if (canceled) return;
      hydrate(sourceRecord ?? null);
      setHydratedVersion(sourceVersion);
    });
    return () => { canceled = true; };
  }, [hydrate, hydratedVersion, sourceLoad, sourceRecord, sourceStatus, sourceVersion, userId]);

  useLayoutEffect(() => () => activeSave.current?.abort(), [draftKey]);

  function resolveConflict(keepDraft: boolean) {
    const latest = conflict ? conflict.current : saved;
    if (keepDraft) {
      draftRef.current = storeDraft(draftKey, formRef.current, latest?.revision ?? null);
      setIsDirty(true);
    } else {
      replaceDraft(draftKey, draftRef.current);
      draftRef.current = undefined;
      const next = editableRecord(itemType, itemId, latest);
      formRef.current = next;
      setForm(next);
      setIsDirty(false);
    }
    setSaved(latest);
    setConflict(undefined);
    setError(false);
    setMessage(keepDraft ? "Draft kept. Review your changes before saving again." : "Showing the saved version.");
  }

  useUnsavedChangesWarning(draftKey ?? "", Boolean(draftKey && isDirty && status === "ready"), () => resolveConflict(false));

  function update(change: (current: ProgressInput) => ProgressInput) {
    if (!userId || status !== "ready") return;
    const next = change(formRef.current);
    formRef.current = next;
    setForm(next);
    const expectedRevision = draftRef.current ? draftRef.current.expectedRevision : saved?.revision ?? null;
    draftRef.current = storeDraft(draftKey, next, expectedRevision);
    setIsDirty(true);
    setError(false);
    setMessage("");
  }

  function retryLoad() {
    if (session.status === "unavailable") {
      void session.retry();
      return;
    }
    setError(false);
    setMessage("");
    if (source) {
      source.retry();
    } else {
      setLoadStatus("loading");
      setAttempt((current) => current + 1);
    }
  }

  async function save(nextStatus?: ProgressStatus, successMessage = "Saved to your account.") {
    if (!userId || status !== "ready" || activeSave.current || conflict) return;
    const submittedDraft = draftRef.current;
    const submittedForm = nextStatus ? { ...formRef.current, status: nextStatus } : formRef.current;
    const expectedRevision = submittedDraft ? submittedDraft.expectedRevision : saved?.revision ?? null;
    const controller = new AbortController();
    activeSave.current = controller;
    setSaving(true);
    setError(false);
    setMessage("");

    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: progressAccountHeaders(userId, true),
        body: JSON.stringify({ record: submittedForm, expectedRevision }),
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 401 || (response.status === 409 && typeof body === "object"
          && body !== null && "code" in body && body.code === "ACCOUNT_CHANGED")) {
          setSaveBlocked(response.status === 401 ? "signed-out" : "account-changed");
          return;
        }
        const stale = progressConflict(body);
        if (stale) {
          setConflict(stale);
          if (!draftRef.current) {
            // A review action can change status without a prior text edit.
            formRef.current = submittedForm;
            setForm(submittedForm);
            draftRef.current = storeDraft(draftKey, submittedForm, expectedRevision);
            setIsDirty(true);
          }
          return;
        }
        const serverMessage = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "The record could not be saved.";
        throw new Error(serverMessage);
      }
      if (!isRecordForItem(body, itemType, itemId)) throw new Error("The server returned an unexpected save response.");

      const currentDraft = draftRef.current;
      const newerDraft = currentDraft && currentDraft !== submittedDraft
        ? { ...currentDraft, expectedRevision: body.revision }
        : undefined;
      replaceDraft(draftKey, currentDraft, newerDraft);
      draftRef.current = newerDraft;
      if (!newerDraft) {
        const next = editableRecord(itemType, itemId, body);
        formRef.current = next;
        setForm(next);
      }
      setSaved(body);
      setIsDirty(Boolean(newerDraft));
      setMessage(newerDraft ? "Earlier changes saved to your account. Newer edits still need saving." : successMessage);
      source?.publish(body);
      window.dispatchEvent(new CustomEvent("progress-updated", { detail: { source: "editor-save", itemType, itemId } }));
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "The record could not be saved.");
    } finally {
      if (activeSave.current === controller) {
        activeSave.current = undefined;
        if (!controller.signal.aborted) setSaving(false);
      }
    }
  }

  const visible = status !== "signed-out" && status !== "account-changed" && status !== "unavailable";
  return {
    form: visible ? form : editableRecord(itemType, itemId, null),
    saved: visible ? saved : null,
    status,
    isDirty,
    saving,
    error,
    message,
    conflict: visible ? conflict : undefined,
    resolveConflict,
    save,
    update,
    retryLoad,
    setError,
    setMessage,
  };
}
