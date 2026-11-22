"use client";

import { useState } from "react";
import type { ProgressInput, ProgressStatus } from "@/features/progress/model";
import { useProgressRecord } from "@/features/progress/use-progress-record";

export function useActivityRecord(itemId: string) {
  const lifecycle = useProgressRecord("activity", itemId);
  const {
    form: record, saved, status, isDirty, saving, error, message, conflict,
    resolveConflict, retryLoad, setError, setMessage,
  } = lifecycle;
  const [messageLocation, setMessageLocation] = useState<"notebook" | "review">("notebook");
  const disabled = status !== "ready" || saving || Boolean(conflict);

  function update<K extends keyof ProgressInput>(key: K, value: ProgressInput[K]) {
    if (!disabled) lifecycle.update((current) => ({ ...current, [key]: value }));
  }

  async function save(nextStatus: ProgressStatus, location: "notebook" | "review", action: "draft" | "reopen" = "draft") {
    if (disabled) return;
    setMessageLocation(location);
    const completionMessage = record.status === "completed"
      ? "Draft saved to your account. The activity remains marked complete."
      : "Activity marked complete in your account.";
    const successMessage = nextStatus === "completed" ? completionMessage
      : action === "reopen" ? "Activity marked in progress in your account."
        : "Draft saved to your account.";
    await lifecycle.save(nextStatus, successMessage);
  }

  return {
    record,
    savedRecord: saved,
    updatedAt: saved?.updatedAt,
    isDirty,
    loading: status === "loading",
    loadFailed: status === "error" || status === "unavailable",
    requiresSignIn: status === "signed-out",
    sessionUnavailable: status === "unavailable",
    accountChanged: status === "account-changed",
    saving,
    error,
    message: status === "error" ? "The saved record could not be loaded. Retry before editing so existing notes are protected." : message,
    messageLocation,
    conflict,
    resolveConflict,
    save,
    update,
    retryLoad,
    setError,
    setMessage,
  };
}
