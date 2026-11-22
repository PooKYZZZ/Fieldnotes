import { afterEach, describe, expect, it, vi } from "vitest";
import { progressImportSchema, progressSchema } from "@/features/progress/validation";
import { maxDateTimestampMs, maxProgressClockSkewMs } from "@/features/progress/timestamp";

const projectRecord = {
  itemType: "project" as const,
  itemId: "P3",
  status: "in_progress" as const,
  comfort: null,
  notes: "",
  evidence: "",
  repositoryUrl: "",
};

describe("project checkpoint observations", () => {
  it("allows stable checkpoint notes within the one saved project record", () => {
    expect(progressSchema.safeParse({
      ...projectRecord,
      taskObservations: { C1: "Defined the user-facing release contract and test boundary." },
    }).success).toBe(true);
  });

  it("rejects checkpoint IDs that belong to another project", () => {
    expect(progressSchema.safeParse({
      ...projectRecord,
      taskObservations: { "P1.1": "This checkpoint belongs to the deployment project." },
    }).success).toBe(false);
  });

  it("limits each checkpoint note to the existing observation field size", () => {
    expect(progressSchema.safeParse({
      ...projectRecord,
      taskObservations: { C1: "x".repeat(1201) },
    }).success).toBe(false);
  });
});

describe("progress backup timestamps", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts historical and current values through each supported backup version", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T00:00:00.000Z"));
    const now = Date.now();
    for (const version of [1, 2, 3] as const) {
      for (const updatedAt of [0, now]) {
        expect(progressImportSchema.safeParse({
          version,
          exportedAt: new Date(now).toISOString(),
          records: [{ ...projectRecord, updatedAt }],
        }).success).toBe(true);
      }
    }
  });

  it("accepts the exact 24-hour cutoff and rejects the next millisecond", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T00:00:00.000Z"));
    const backup = (updatedAt: number) => ({
      version: 3,
      exportedAt: new Date().toISOString(),
      records: [{ ...projectRecord, updatedAt }],
    });

    expect(progressImportSchema.safeParse(backup(Date.now() + maxProgressClockSkewMs)).success).toBe(true);
    expect(progressImportSchema.safeParse(backup(Date.now() + maxProgressClockSkewMs + 1)).success).toBe(false);
  });

  it("rejects out-of-Date-range, fractional, and negative timestamps for versions 1 through 3", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T00:00:00.000Z"));
    for (const version of [1, 2, 3] as const) {
      for (const updatedAt of [maxDateTimestampMs + 1, Date.now() + 0.5, -1]) {
        const result = progressImportSchema.safeParse({
          version,
          exportedAt: new Date().toISOString(),
          records: [{ ...projectRecord, updatedAt }],
        });
        expect(result.success, `version ${version} should reject ${updatedAt}`).toBe(false);
        if (!result.success) expect(result.error.issues[0]?.path).toEqual(["records", 0, "updatedAt"]);
      }
    }
  });
});
