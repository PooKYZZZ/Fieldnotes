"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProgressInput, ProgressRecord } from "@/features/progress/model";
import { useAuthSession } from "@/features/auth/auth-session-context";
import { progressAccountHeaders } from "@/features/progress/progress-draft";

type ProgressLookup = Pick<ProgressInput, "itemType" | "itemId">;
type ProgressRecordsSnapshot = {
  identity: string;
  attempt: number;
  records: ProgressRecord[];
  loaded: boolean;
  loadError: boolean;
  requiresSignIn: boolean;
};

export function useProgressRecords(lookup?: ProgressLookup) {
  const { userId, pending: sessionPending } = useAuthSession();
  const [attempt, setAttempt] = useState(0);
  const identity = JSON.stringify([userId ?? null, lookup?.itemType ?? null, lookup?.itemId ?? null]);
  const itemType = lookup?.itemType;
  const itemId = lookup?.itemId;
  const params = itemType && itemId ? new URLSearchParams({ itemType, itemId }) : undefined;
  const url = params ? `/api/progress?${params.toString()}` : "/api/progress";
  const [snapshot, setSnapshot] = useState<ProgressRecordsSnapshot>();

  useEffect(() => {
    if (sessionPending) return;
    const controller = new AbortController();
    fetch(url, { cache: "no-store", headers: progressAccountHeaders(userId), signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return { records: [] as ProgressRecord[], requiresSignIn: true };
        if (!response.ok) throw new Error("Could not load saved progress.");
        const records = await response.json() as ProgressRecord[];
        if (!Array.isArray(records)) throw new Error("The saved progress response was unexpected.");
        return { records, requiresSignIn: false };
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setSnapshot({ identity, attempt, ...result, loaded: true, loadError: false });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSnapshot({ identity, attempt, records: [], loaded: true, loadError: true, requiresSignIn: false });
        }
      });
    return () => controller.abort();
  }, [attempt, identity, sessionPending, url, userId]);

  useEffect(() => {
    const refresh = () => setAttempt((current) => current + 1);
    window.addEventListener("progress-updated", refresh);
    return () => window.removeEventListener("progress-updated", refresh);
  }, []);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const current = !sessionPending && snapshot?.identity === identity && snapshot.attempt === attempt ? snapshot : undefined;
  return {
    records: current?.records ?? [],
    loaded: current?.loaded ?? false,
    loadError: current?.loadError ?? false,
    requiresSignIn: current?.requiresSignIn ?? false,
    retry,
  };
}
