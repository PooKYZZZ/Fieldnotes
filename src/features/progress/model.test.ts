import { describe, expect, it } from "vitest";
import { activities } from "@/content";
import { formatStatus } from "@/features/progress/model";
import { progressImportSchema, progressSchema } from "@/features/progress/validation";

const validProgress = {
  itemType: "module",
  itemId: "M01",
  status: "in_progress",
  comfort: "guided",
  notes: "I can explain the process boundary.",
  evidence: "Tested in a disposable VM.",
  repositoryUrl: "https://github.com/example/lab",
};

describe("progressSchema", () => {
  it("accepts a bounded learning record", () => {
    expect(progressSchema.safeParse(validProgress).success).toBe(true);
  });

  it("rejects non-HTTP repository URLs", () => {
    expect(progressSchema.safeParse({ ...validProgress, repositoryUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(progressSchema.safeParse({ ...validProgress, repositoryUrl: "file:///private/key" }).success).toBe(false);
  });

  it("rejects oversized notes and unsupported identifiers", () => {
    expect(progressSchema.safeParse({ ...validProgress, notes: "x".repeat(3001) }).success).toBe(false);
    expect(progressSchema.safeParse({ ...validProgress, itemId: "../../secret" }).success).toBe(false);
    expect(progressSchema.safeParse({ ...validProgress, itemId: "M99" }).success).toBe(false);
  });

  it("allows no repository URL and an unset comfort level", () => {
    expect(progressSchema.safeParse({ ...validProgress, repositoryUrl: "", comfort: null }).success).toBe(true);
  });

  it("accepts lesson records only for canonical lesson IDs", () => {
    expect(progressSchema.safeParse({ ...validProgress, itemType: "lesson", itemId: "M01-L01" }).success).toBe(true);
    expect(progressSchema.safeParse({ ...validProgress, itemType: "lesson", itemId: "M99-L01" }).success).toBe(false);
  });

  it("accepts bounded task observations only for the activity's stable task IDs", () => {
    const a01 = { ...validProgress, itemType: "activity", itemId: "A01", taskObservations: { "compare-proc": "The PID and effective UID matched." } };
    expect(progressSchema.safeParse(a01).success).toBe(true);
    expect(progressSchema.safeParse({ ...a01, taskObservations: { unknown: "No task" } }).success).toBe(false);
    expect(progressSchema.safeParse({ ...a01, taskObservations: { "compare-proc": "x".repeat(1201) } }).success).toBe(false);
    expect(progressSchema.safeParse({ ...a01, taskObservations: { "confirm-account": "x".repeat(1200), "choose-process": "x".repeat(1200), "compare-proc": "x".repeat(1200), "check-systemd": "x".repeat(1200), "explain-boundary": "x".repeat(1201) } }).success).toBe(false);
    expect(progressSchema.safeParse({ ...validProgress, taskObservations: { "compare-proc": "Not an A01 record." } }).success).toBe(false);

    const a02 = { ...validProgress, itemType: "activity", itemId: "A02", taskObservations: { "a02-predict-the-inventory": "The empty file should report zero bytes." } };
    expect(progressSchema.safeParse(a02).success).toBe(true);
    expect(progressSchema.safeParse({ ...a02, taskObservations: { "compare-proc": "Wrong activity task." } }).success).toBe(false);
    const a02TaskIds = activities.find(({ id }) => id === "A02")!.investigationTasks!.map(({ id }) => id);
    expect(a02TaskIds).toHaveLength(7);
    expect(progressSchema.safeParse({ ...a02, taskObservations: Object.fromEntries(a02TaskIds.map((id) => [id, "x".repeat(1200)])) }).success).toBe(true);
  });

  it("uses clear labels for each persisted status", () => {
    expect(formatStatus("needs_review")).toBe("Needs review");
  });
});

describe("progressImportSchema", () => {
  const backup = {
    version: 1,
    exportedAt: "2026-11-14T00:00:00.000Z",
    records: [{ ...validProgress, updatedAt: 1_794_600_000_000 }],
  };

  it("accepts a valid versioned progress backup", () => {
    expect(progressImportSchema.safeParse(backup).success).toBe(true);
    expect(progressImportSchema.safeParse({ ...backup, version: 2 }).success).toBe(true);
    expect(progressImportSchema.safeParse({
      ...backup,
      version: 2,
      records: [{ ...backup.records[0], itemType: "lesson", itemId: "M01-L01" }],
    }).success).toBe(true);
  });

  it("continues to accept old version 1 backups and rejects unsupported versions", () => {
    expect(progressImportSchema.safeParse(backup).success).toBe(true);
    expect(progressImportSchema.safeParse({ ...backup, version: 3 }).success).toBe(true);
    expect(progressImportSchema.safeParse({ ...backup, version: 4 }).success).toBe(false);
  });

  it("rejects unknown learning items and duplicate record keys", () => {
    expect(progressImportSchema.safeParse({ ...backup, records: [{ ...backup.records[0], itemId: "M99" }] }).success).toBe(false);
    expect(progressImportSchema.safeParse({ ...backup, records: [...backup.records, backup.records[0]] }).success).toBe(false);
  });

  it("rejects backups above the record limit", () => {
    const result = progressImportSchema.safeParse({
      ...backup,
      records: Array.from({ length: 251 }, (_, index) => ({ ...backup.records[0], itemId: `invalid-${index}` })),
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.code === "too_big")).toBe(true);
  });
});

