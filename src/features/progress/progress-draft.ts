import { comfortLevels, progressStatuses, type ProgressInput, type ProgressRecord } from "@/features/progress/model";

export type ProgressDraft = { form: ProgressInput; expectedRevision: number | null; editId?: string };
export type ProgressConflict = { current: ProgressRecord | null };

export function progressConflict(value: unknown): ProgressConflict | undefined {
  if (!value || typeof value !== "object" || !("code" in value) || value.code !== "PROGRESS_CONFLICT" || !("current" in value)) return undefined;
  const current = value.current;
  if (current === null) return { current };
  if (typeof current !== "object" || !current || !("revision" in current) || typeof current.revision !== "number") return undefined;
  return { current: current as ProgressRecord };
}

export function progressAccountHeaders(userId?: string, json = false): Record<string, string> {
  return {
    ...(userId ? { "X-Fieldnotes-Account": userId } : {}),
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export function progressDraftKey(userId: string | undefined, itemType: ProgressInput["itemType"], itemId: string): string | undefined {
  return userId ? `fieldnotes-draft:${userId}:${itemType}:${itemId}` : undefined;
}

export function readDraft(key: string | undefined, itemType: ProgressInput["itemType"], itemId: string): ProgressDraft | undefined {
  if (!key) return undefined;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || !("form" in value) || !("expectedRevision" in value)) return undefined;
    const { form, expectedRevision } = value;
    if (typeof form !== "object" || form === null || !("itemType" in form) || !("itemId" in form)
      || !("status" in form) || !("comfort" in form) || !("notes" in form) || !("evidence" in form)
      || !("repositoryUrl" in form)) return undefined;
    if (form.itemType !== itemType || form.itemId !== itemId
      || typeof form.status !== "string" || !progressStatuses.includes(form.status as ProgressInput["status"])
      || !(form.comfort === null || (typeof form.comfort === "string" && comfortLevels.includes(form.comfort as NonNullable<ProgressInput["comfort"]>)))
      || typeof form.notes !== "string" || form.notes.length > 3000
      || typeof form.evidence !== "string" || form.evidence.length > 3000
      || typeof form.repositoryUrl !== "string" || form.repositoryUrl.length > 512
      || !(expectedRevision === null || (typeof expectedRevision === "number" && Number.isSafeInteger(expectedRevision) && expectedRevision > 0))) return undefined;
    if ("taskObservations" in form && form.taskObservations !== undefined
      && (typeof form.taskObservations !== "object" || form.taskObservations === null || Array.isArray(form.taskObservations)
        || !Object.values(form.taskObservations).every((entry) => typeof entry === "string"))) return undefined;
    return { form: form as ProgressInput, expectedRevision: expectedRevision as number | null, editId: "editId" in value && typeof value.editId === "string" ? value.editId : undefined };
  } catch {
    return undefined;
  }
}

export function storeDraft(key: string | undefined, form: ProgressInput, expectedRevision: number | null): ProgressDraft {
  const editId = crypto.getRandomValues(new Uint32Array(4)).join("-");
  const draft = { form, expectedRevision, editId };
  if (key) {
    try { sessionStorage.setItem(key, JSON.stringify(draft)); } catch { /* The editor keeps the draft in memory. */ }
  }
  return draft;
}

/** A save or discard may finish after another editor has written a newer local draft. */
export function replaceDraft(key: string | undefined, expected: ProgressDraft | undefined, replacement?: ProgressDraft): void {
  if (!key || !expected) return;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    const current = JSON.parse(raw) as ProgressDraft;
    const matches = expected.editId ? current.editId === expected.editId : raw === JSON.stringify(expected);
    if (!matches) return;
    if (replacement) sessionStorage.setItem(key, JSON.stringify(replacement));
    else sessionStorage.removeItem(key);
  } catch { /* The editor keeps the draft in memory. */ }
}
