import { describe, expect, it } from "vitest";
import { activities, majorProjects, modules, smallProjects } from "@/content";
import type { ProgressRecord } from "@/features/progress/model";
import { buildDashboardModel, statusForModule } from "@/features/dashboard/model";

function record(itemType: ProgressRecord["itemType"], itemId: string, status: ProgressRecord["status"], updatedAt: number): ProgressRecord {
  return { itemType, itemId, status, comfort: null, notes: "", evidence: "", repositoryUrl: "", updatedAt };
}

describe("dashboard learning model", () => {
  it("recommends the first real module without linking a prerequisite-blocked activity", () => {
    const model = buildDashboardModel(modules, activities, majorProjects, smallProjects, []);

    expect(model.currentModule?.id).toBe(1);
    expect(model.currentModuleStatus).toBe("not_started");
    expect(model.completedModules).toBe(0);
    expect(model.nextItems).toEqual([]);
    expect(model.recentItems).toEqual([]);
  });

  it("resumes the most recently updated active module and lists only real unfinished activity tasks", () => {
    const records = [
      record("module", "M01", "completed", 100),
      { ...record("module", "M03", "needs_review", 300), notes: "Revisit service management." },
      record("module", "M02", "in_progress", 200),
      record("activity", "A03", "in_progress", 250),
      record("milestone", "P1.1", "completed", 350),
    ];
    const model = buildDashboardModel(modules, activities, majorProjects, smallProjects, records);

    expect(model.currentModule?.id).toBe(3);
    expect(model.currentModuleStatus).toBe("needs_review");
    expect(model.completedModules).toBe(1);
    expect(statusForModule(model, 2)).toBe("in_progress");
    expect(model.nextItems.map((item) => item.type)).toContain("Challenge · Module 03");
    expect(model.nextItems.some((item) => item.id === "P1.2")).toBe(true);
    expect(model.recentItems[0]).toMatchObject({ title: "requirements and diagram", detail: "Milestone completed" });
  });

  it("resumes the actual activity when it is the learner's most recently updated work", () => {
    const records = [
      record("module", "M01", "completed", 100),
      record("activity", "A03", "in_progress", 300),
    ];
    const model = buildDashboardModel(modules, activities, majorProjects, smallProjects, records);

    expect(model.currentModule?.id).toBe(3);
    expect(model.currentActivity?.id).toBe("A03");
    expect(model.currentActivityStatus).toBe("in_progress");
    expect(model.nextItems[0]).toMatchObject({ href: "/activities/A03", type: "Challenge · Module 03" });
  });

  it("uses explicit completion records and does not invent recent work", () => {
    const records = modules.map((learningModule, index) => record("module", `M${String(learningModule.id).padStart(2, "0")}`, "completed", index + 1));
    const model = buildDashboardModel(modules, activities, majorProjects, smallProjects, records);

    expect(model.completedModules).toBe(modules.length);
    expect(model.currentModule).toBeUndefined();
    expect(model.recentItems).toHaveLength(4);
    expect(model.recentItems.every((item) => item.detail === "Module marked complete")).toBe(true);
  });
});
