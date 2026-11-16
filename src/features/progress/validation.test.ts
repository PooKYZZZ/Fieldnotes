import { describe, expect, it } from "vitest";
import { progressSchema } from "@/features/progress/validation";

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
