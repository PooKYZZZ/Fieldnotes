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
  accountChanged: boolean;
};

export function useProgressRecords(lookup?: ProgressLookup) {
  const session = useAuthSession();
  const userId = session.status === "signed-in" ? session.userId : undefined;
  const [attempt, setAttempt] = useState(0);
  const identity = JSON.stringify([session.status, userId ?? null, lookup?.itemType ?? null, lookup?.itemId ?? null]);
  const itemType = lookup?.itemType;
  const itemId = lookup?.itemId;
  const params = itemType && itemId ? new URLSearchParams({ itemType, itemId }) : undefined;
  const url = params ? `/api/progress?${params.toString()}` : "/api/progress";
  const [snapshot, setSnapshot] = useState<ProgressRecordsSnapshot>();

  useEffect(() => {
    if (session.status !== "signed-in") return;
    const controller = new AbortController();
    fetch(url, { cache: "no-store", headers: progressAccountHeaders(userId), signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return { records: [] as ProgressRecord[], requiresSignIn: true, accountChanged: false };
        if (response.status === 409) return { records: [] as ProgressRecord[], requiresSignIn: false, accountChanged: true };
        if (!response.ok) throw new Error("Could not load saved progress.");
        const records = await response.json() as ProgressRecord[];
        if (!Array.isArray(records)) throw new Error("The saved progress response was unexpected.");
        return { records, requiresSignIn: false, accountChanged: false };
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setSnapshot({ identity, attempt, ...result, loaded: true, loadError: false });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSnapshot({ identity, attempt, records: [], loaded: true, loadError: true, requiresSignIn: false, accountChanged: false });
        }
      });
    return () => controller.abort();
  }, [attempt, identity, session.status, url, userId]);

  useEffect(() => {
    const refresh = () => setAttempt((current) => current + 1);
    window.addEventListener("progress-updated", refresh);
    return () => window.removeEventListener("progress-updated", refresh);
  }, []);

  const retry = useCallback(() => {
    if (session.status === "unavailable") void session.retry();
    else if (session.status === "signed-in") setAttempt((current) => current + 1);
  }, [session]);
  const current = session.status === "signed-in" && snapshot?.identity === identity && snapshot.attempt === attempt ? snapshot : undefined;
  const signedOut = session.status === "signed-out";
  const sessionUnavailable = session.status === "unavailable";
  return {
    records: current?.records ?? [],
    loaded: signedOut || sessionUnavailable || (current?.loaded ?? false),
    loadError: sessionUnavailable || (current?.loadError ?? false),
    requiresSignIn: signedOut || (current?.requiresSignIn ?? false),
    accountChanged: current?.accountChanged ?? false,
    sessionUnavailable,
    retry,
  };
}
