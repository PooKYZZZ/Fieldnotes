"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ProgressRecord } from "@/features/progress/model";
import { progressAccountHeaders } from "@/features/progress/progress-draft";
import { useAuthSession } from "@/features/auth/auth-session-context";

type ProjectType = "project" | "small_project";
type SnapshotStatus = "loading" | "ready" | "signed-out" | "unavailable" | "error" | "account-changed";
type SnapshotValue = {
  status: SnapshotStatus;
  record: ProgressRecord | null;
  version: number;
  load: () => void;
  retry: () => void;
  publish: (record: ProgressRecord) => void;
};
type StoredSnapshot = { identity: string; attempt: number; version: number; status: Exclude<SnapshotStatus, "loading">; record: ProgressRecord | null };

const ProjectRecordContext = createContext<SnapshotValue | undefined>(undefined);

export function ProjectRecordProvider({ projectId, projectType, children }: {
  projectId: string;
  projectType: ProjectType;
  children: ReactNode;
}) {
  const session = useAuthSession();
  const userId = session.status === "signed-in" ? session.userId : undefined;
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<StoredSnapshot>();
  const [requestedIdentity, setRequestedIdentity] = useState<string>();
  const identity = JSON.stringify([userId ?? session.status, projectType, projectId]);

  useEffect(() => {
    if (session.status !== "signed-in" || requestedIdentity !== identity) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ itemType: projectType, itemId: projectId });
    fetch(`/api/progress?${params.toString()}`, { cache: "no-store", headers: progressAccountHeaders(userId), signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (response.status === 401) return { status: "signed-out" as const, record: null };
        if (response.status === 409) return { status: "account-changed" as const, record: null };
        if (!response.ok) throw new Error("Could not load the saved project record.");
        const rows = await response.json() as ProgressRecord[];
        if (controller.signal.aborted) return;
        if (!Array.isArray(rows)) throw new Error("The saved project response was unexpected.");
        return { status: "ready" as const, record: rows[0] ?? null };
      })
      .then((result) => {
        if (!controller.signal.aborted && result) setSnapshot((previous) => ({ identity, attempt, version: (previous?.version ?? 0) + 1, ...result }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSnapshot((previous) => ({ identity, attempt, version: (previous?.version ?? 0) + 1, status: "error", record: null }));
      });
    return () => controller.abort();
  }, [attempt, identity, projectId, projectType, requestedIdentity, session.status, userId]);

  useEffect(() => {
    const invalidateAfterRestore = (event: Event) => {
      if ((event as CustomEvent<{ source?: string }>).detail?.source === "restore") {
        setAttempt((current) => current + 1);
      }
    };
    window.addEventListener("progress-updated", invalidateAfterRestore);
    return () => window.removeEventListener("progress-updated", invalidateAfterRestore);
  }, []);

  const retry = useCallback(() => {
    if (session.status === "unavailable") void session.retry();
    else if (session.status === "signed-in") {
      setRequestedIdentity(identity);
      setAttempt((current) => current + 1);
    }
  }, [identity, session]);
  const load = useCallback(() => {
    if (session.status === "signed-in") setRequestedIdentity(identity);
  }, [identity, session.status]);
  const publish = useCallback((record: ProgressRecord) => {
    if (session.status !== "signed-in" || record.itemType !== projectType || record.itemId !== projectId) return;
    setSnapshot((previous) => previous?.identity === identity && previous.attempt === attempt
      ? { ...previous, status: "ready", record }
      : previous);
  }, [attempt, identity, projectId, projectType, session.status]);
  const current = session.status === "signed-in" && snapshot?.identity === identity && snapshot.attempt === attempt
    ? snapshot
    : undefined;
  const value = useMemo<SnapshotValue>(() => ({
    status: session.status === "loading" ? "loading"
      : session.status === "signed-out" ? "signed-out"
        : session.status === "unavailable" ? "unavailable"
          : current?.status ?? "loading",
    record: current?.status === "ready" ? current.record : null,
    version: current?.version ?? 0,
    load,
    retry,
    publish,
  }), [current, load, publish, retry, session.status]);

  return <ProjectRecordContext.Provider value={value}>{children}</ProjectRecordContext.Provider>;
}

export function useProjectRecordSnapshot(): SnapshotValue | undefined {
  return useContext(ProjectRecordContext);
}
