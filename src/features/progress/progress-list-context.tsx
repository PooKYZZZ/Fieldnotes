"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProgressSummary } from "@/features/progress/model";
import { useAuthSession } from "@/features/auth/auth-session-context";
import { progressAccountHeaders } from "@/features/progress/progress-draft";

type ProgressListState = {
  records: ProgressSummary[];
  loaded: boolean;
  loadError: boolean;
  requiresSignIn: boolean;
  retry: () => void;
  subscribe: () => () => void;
};

const ProgressListContext = createContext<ProgressListState | undefined>(undefined);

export function ProgressListProvider({ children }: { children: ReactNode }) {
  const { userId, pending: sessionPending } = useAuthSession();
  const [records, setRecords] = useState<ProgressSummary[]>([]);
  const [loadedForUser, setLoadedForUser] = useState<string | null | undefined>();
  const [loadError, setLoadError] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const activeConsumers = useRef(0);
  const activeRequest = useRef<AbortController | undefined>(undefined);

  const load = useCallback((force = false) => {
    if (sessionPending) return;
    if (activeRequest.current && !force) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const requestUser = userId ?? null;
    setLoadError(false);
    fetch("/api/progress?summary=true", { cache: "no-store", headers: progressAccountHeaders(userId), signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return { records: [] as ProgressSummary[], requiresSignIn: true };
        if (!response.ok) throw new Error("Could not load saved progress.");
        const rows = await response.json() as ProgressSummary[];
        if (!Array.isArray(rows)) throw new Error("The saved progress response was unexpected.");
        return { records: rows, requiresSignIn: false };
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setRecords(result.records);
        setRequiresSignIn(result.requiresSignIn);
        setLoadError(false);
        setLoadedForUser(requestUser);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRecords([]);
        setRequiresSignIn(false);
        setLoadError(true);
        setLoadedForUser(requestUser);
      });
  }, [sessionPending, userId]);

  const subscribe = useCallback(() => {
    activeConsumers.current += 1;
    if (!sessionPending) load();
    return () => {
      activeConsumers.current = Math.max(0, activeConsumers.current - 1);
      if (activeConsumers.current === 0) {
        activeRequest.current?.abort();
        activeRequest.current = undefined;
      }
    };
  }, [load, sessionPending]);
  const retry = useCallback(() => load(true), [load]);

  useEffect(() => {
    const refreshAfterSave = () => {
      if (activeConsumers.current > 0) load(true);
    };
    window.addEventListener("progress-updated", refreshAfterSave);
    return () => window.removeEventListener("progress-updated", refreshAfterSave);
  }, [load]);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const currentUser = userId ?? null;
  const isCurrentResult = !sessionPending && loadedForUser === currentUser;
  const value = useMemo<ProgressListState>(() => ({
    records: isCurrentResult ? records : [],
    loaded: isCurrentResult,
    loadError: isCurrentResult && loadError,
    requiresSignIn: isCurrentResult && requiresSignIn,
    retry,
    subscribe,
  }), [isCurrentResult, loadError, records, requiresSignIn, retry, subscribe]);

  return <ProgressListContext.Provider value={value}>{children}</ProgressListContext.Provider>;
}

export function useProgressList(): Omit<ProgressListState, "subscribe"> {
  const state = useContext(ProgressListContext);
  if (!state) throw new Error("useProgressList must be rendered inside ProgressListProvider.");
  const subscribe = state.subscribe;
  useEffect(() => subscribe(), [subscribe]);
  return {
    records: state.records,
    loaded: state.loaded,
    loadError: state.loadError,
    requiresSignIn: state.requiresSignIn,
    retry: state.retry,
  };
}
