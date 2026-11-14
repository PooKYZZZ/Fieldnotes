import { describe, expect, it } from "vitest";
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

