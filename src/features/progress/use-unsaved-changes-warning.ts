"use client";

import { useEffect } from "react";

const dirtyForms = new Set<string>();
let listenersInstalled = false;
let skipNextBeforeUnload = false;

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (skipNextBeforeUnload) {
    skipNextBeforeUnload = false;
    return;
  }
  if (dirtyForms.size === 0) return;
  event.preventDefault();
  event.returnValue = "";
}

function handleDocumentClick(event: MouseEvent) {
  if (dirtyForms.size === 0 || event.defaultPrevented || event.button !== 0
    || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;

  const link = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

  const destination = new URL(link.href, window.location.href);
  const current = new URL(window.location.href);
  if (destination.origin === current.origin
    && destination.pathname === current.pathname
    && destination.search === current.search) return;

  if (window.confirm("You have unsaved changes. Leave this page and discard them?")) {
    skipNextBeforeUnload = true;
    window.setTimeout(() => { skipNextBeforeUnload = false; }, 0);
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function syncListeners() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (dirtyForms.size > 0 && !listenersInstalled) {
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    listenersInstalled = true;
  } else if (dirtyForms.size === 0 && listenersInstalled) {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    document.removeEventListener("click", handleDocumentClick, true);
    listenersInstalled = false;
  }
}

export function useUnsavedChangesWarning(key: string, isDirty: boolean) {
  useEffect(() => {
    if (isDirty) dirtyForms.add(key);
    else dirtyForms.delete(key);
    syncListeners();

    return () => {
      dirtyForms.delete(key);
      syncListeners();
    };
  }, [isDirty, key]);
}
