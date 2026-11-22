const projectLocationChange = "fieldnotes:project-location-change";

export function subscribeToProjectLocation(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(projectLocationChange, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(projectLocationChange, onChange);
  };
}

export function updateProjectHash(hash: string, history: "push" | "replace"): void {
  if (window.location.hash === hash) return;
  window.history[`${history}State`](null, "", hash);
  window.dispatchEvent(new Event(projectLocationChange));
}
