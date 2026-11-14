import { describe, expect, it } from "vitest";
import { summarizeModuleProgress } from "@/features/progress/module-progress";

describe("summarizeModuleProgress", () => {
  it("counts only explicit completion records", () => {
    expect(summarizeModuleProgress("not_started", 1, 0)).toEqual({
      completedSteps: 0,
      totalSteps: 2,
      percent: 0,
    });
    expect(summarizeModuleProgress("in_progress", 1, 0).completedSteps).toBe(0);
  });

  it("combines the module record and linked activity records", () => {
    expect(summarizeModuleProgress("completed", 1, 0)).toEqual({
      completedSteps: 1,
      totalSteps: 2,
      percent: 50,
    });
    expect(summarizeModuleProgress("not_started", 1, 1)).toEqual({
      completedSteps: 1,
      totalSteps: 2,
      percent: 50,
    });
    expect(summarizeModuleProgress("completed", 1, 1).percent).toBe(100);
  });

  it("bounds invalid counts and handles modules without linked activities", () => {
    expect(summarizeModuleProgress("completed", 0, 5)).toEqual({
      completedSteps: 1,
      totalSteps: 1,
      percent: 100,
    });
    expect(summarizeModuleProgress(undefined, -2, -4)).toEqual({
      completedSteps: 0,
      totalSteps: 1,
      percent: 0,
    });
  });
});
