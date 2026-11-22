import { describe, expect, it } from "vitest";
import { activities, majorProjects, modules, projectMilestones, smallProjects } from "@/content";
import type { ProgressSummary } from "@/features/progress/model";
import { buildDashboardModel, statusForModule } from "@/features/dashboard/model";

const projectSummaries = [...majorProjects, ...smallProjects].map(({ id, title }) => ({
  id,
  title,
  milestones: projectMilestones.filter((milestone) => milestone.projectId === id)
    .map(({ id: milestoneId, label }) => ({ id: milestoneId, label })),
}));
const majorProjectSummaries = majorProjects.map((project) => projectSummaries.find(({ id }) => id === project.id)!);
const smallProjectSummaries = smallProjects.map((project) => projectSummaries.find(({ id }) => id === project.id)!);

function record(itemType: ProgressSummary["itemType"], itemId: string, status: ProgressSummary["status"], updatedAt: number): ProgressSummary {
  return { itemType, itemId, status, updatedAt, revision: 1, hasContent: false };
}

describe("dashboard learning model", () => {
  it("gives a first-time learner one clear primary lesson and no duplicate next action", () => {
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, []);

    expect(model.currentModule?.id).toBe(1);
    expect(model.currentModuleStatus).toBe("not_started");
    expect(model.completedModules).toBe(0);
    expect(model.currentLesson).toMatchObject({ id: "M01-L01", moduleId: 1 });
    expect(model.completedActivities).toBe(0);
    expect(model.totalActivities).toBe(activities.length);
    expect(model.nextItems).toEqual([]);
    expect(model.recentItems).toEqual([]);
  });

  it("finishes a module's paired activity before starting the next module", () => {
    const records = modules[0].lessons.map((lesson, index) => record("lesson", lesson.id, "completed", index + 1));
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, records);

    expect(model.currentModule?.id).toBe(1);
    expect(model.currentActivity?.id).toBe("A01");
    expect(model.currentLesson).toBeUndefined();
    expect(model.nextItems[0]).toMatchObject({ id: "M02-L01", href: "/modules/02/lessons/m02-l01" });
  });

  it("includes saved troubleshooting records in recent work", () => {
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, [
      record("troubleshooting", "T03", "in_progress", 300),
    ]);

    expect(model.recentItems[0]).toMatchObject({
      title: "Troubleshooting scenario T03",
      href: "/activities#troubleshooting-t03",
      detail: "Learning notes updated",
    });
  });

  it("keeps the latest module context while resuming newer saved project work", () => {
    const records = [
      record("module", "M01", "completed", 100),
      { ...record("module", "M03", "needs_review", 300), hasContent: true },
      record("module", "M02", "in_progress", 200),
      record("activity", "A03", "in_progress", 250),
      record("milestone", "P1.1", "completed", 350),
    ];
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, records);

    expect(model.currentModule?.id).toBe(3);
    expect(model.currentModuleStatus).toBe("needs_review");
    expect(model.completedModules).toBe(1);
    expect(statusForModule(model, 2)).toBe("in_progress");
    expect(model.currentLesson).toMatchObject({ id: "M03-L01", moduleId: 3 });
    expect(model.nextItems[0]).toMatchObject({ id: "M03-L02", href: "/modules/03/lessons/m03-l02" });
    expect(model.nextItems.some((item) => item.href === "/modules/03/lessons/m03-l01")).toBe(false);
    expect(model.currentProject).toMatchObject({ id: "P1", checkpoint: { id: "P1.2" } });
    expect(model.nextItems.some((item) => item.id === "P1.2")).toBe(false);
    expect(model.recentItems[0]).toMatchObject({ title: "Define service, release, and recovery contracts", detail: "Milestone completed" });
  });

  it("resumes the actual activity when it is the learner's most recently updated work", () => {
    const records = [
      record("module", "M01", "completed", 100),
      record("activity", "A03", "in_progress", 300),
    ];
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, records);

    expect(model.currentModule?.id).toBe(3);
    expect(model.currentActivity?.id).toBe("A03");
    expect(model.currentActivityStatus).toBe("in_progress");
    expect(model.nextItems.some((item) => item.href === "/activities/A03")).toBe(false);
    expect(model.nextItems[0]).toMatchObject({ id: "M04-L01", href: "/modules/04/lessons/m04-l01" });
  });

  it("resumes the most recently updated lesson instead of an older active activity", () => {
    const records = [
      record("module", "M01", "in_progress", 100),
      record("activity", "A01", "needs_review", 200),
      record("lesson", "M01-L02", "in_progress", 300),
    ];
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, records);

    expect(model.currentLesson).toMatchObject({ id: "M01-L02", moduleId: 1 });
    expect(model.currentLessonStatus).toBe("in_progress");
    expect(model.currentActivity).toBeUndefined();
    expect(model.nextItems.some((item) => item.href === "/modules/01/lessons/m01-l02")).toBe(false);
    expect(model.recentItems.some((item) => item.href === "/activities/A01" && item.detail === "Activity marked for review")).toBe(true);
  });

  it("resumes a saved project draft at its next self-reported checkpoint without changing its status", () => {
    const records = [
      record("lesson", "M01-L01", "in_progress", 100),
      record("milestone", "S01.1", "completed", 200),
      {
        ...record("small_project", "S01", "not_started", 300),
        hasContent: true,
        taskObservations: { "S01.1": "The fixture contract is documented." },
      },
    ];
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, records);

    expect(model.currentProject).toMatchObject({
      id: "S01",
      itemType: "small_project",
      status: "not_started",
      checkpoint: { id: "S01.2" },
      completedCheckpointCount: 1,
      totalCheckpointCount: 4,
      hasSavedDraft: true,
    });
    expect(model.nextItems.some((item) => item.detail === "Log explorer")).toBe(false);
  });

  it("does not suggest another checkpoint for an explicitly completed project", () => {
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, [
      record("small_project", "S01", "completed", 300),
      record("milestone", "S01.1", "completed", 200),
    ]);

    expect(model.currentProject).toBeUndefined();
    expect(model.nextItems.some((item) => item.id === "S01.2")).toBe(false);
  });

  it("resumes a checkpoint-only project record", () => {
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, [
      record("milestone", "S01.1", "completed", 200),
    ]);

    expect(model.currentProject).toMatchObject({
      id: "S01",
      checkpoint: { id: "S01.2" },
      completedCheckpointCount: 1,
      hasSavedDraft: false,
    });
  });

  it("resumes a project marked for review", () => {
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, [
      record("project", "P1", "needs_review", 500),
    ]);

    expect(model.currentProject).toMatchObject({ id: "P1", status: "needs_review" });
  });

  it("keeps an all-checkpoints-complete project available for review", () => {
    const s01Milestones = smallProjectSummaries.find(({ id }) => id === "S01")!.milestones;
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, [
      record("small_project", "S01", "in_progress", 500),
      ...s01Milestones.map((milestone, index) => record("milestone", milestone.id, "completed", 100 + index)),
    ]);

    expect(model.currentProject).toMatchObject({
      id: "S01",
      checkpoint: undefined,
      completedCheckpointCount: s01Milestones.length,
      totalCheckpointCount: s01Milestones.length,
    });
  });

  it("chooses the most recently updated of two active projects", () => {
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, [
      record("small_project", "S01", "in_progress", 300),
      record("small_project", "S02", "needs_review", 400),
    ]);

    expect(model.currentProject).toMatchObject({ id: "S02", status: "needs_review" });
  });

  it("keeps a newer active lesson ahead of an older saved project draft", () => {
    const records = [
      {
        ...record("small_project", "S01", "not_started", 300),
        hasContent: true,
        taskObservations: { "S01.1": "The fixture contract is documented." },
      },
      record("lesson", "M01-L02", "in_progress", 400),
    ];
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, records);

    expect(model.currentProject).toBeUndefined();
    expect(model.currentLesson).toMatchObject({ id: "M01-L02", moduleId: 1 });
    expect(model.nextItems).toContainEqual(expect.objectContaining({ id: "S01.1", href: "/projects/S01#milestone-S01.1" }));
  });

  it("uses explicit completion records and does not invent recent work", () => {
    const records = modules.map((learningModule, index) => record("module", `M${String(learningModule.id).padStart(2, "0")}`, "completed", index + 1));
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, records);

    expect(model.completedModules).toBe(modules.length);
    expect(model.currentModule?.id).toBe(1);
    expect(model.currentModuleStatus).toBe("completed");
    expect(model.currentLesson?.id).toBe("M01-L01");
    expect(model.recentItems).toHaveLength(4);
    expect(model.recentItems.every((item) => item.detail === "Module marked complete")).toBe(true);
  });

  it("counts lesson records separately and resumes the latest active lesson without repeating it", () => {
    const records = [
      record("module", "M01", "completed", 100),
      record("activity", "A01", "needs_review", 200),
      record("lesson", "M01-L01", "completed", 150),
      record("lesson", "M01-L02", "in_progress", 300),
    ];
    const model = buildDashboardModel(modules, activities, majorProjectSummaries, smallProjectSummaries, records);

    expect(model.currentLesson).toMatchObject({ id: "M01-L02", moduleId: 1 });
    expect(model.currentLessonStatus).toBe("in_progress");
    expect(model.currentModuleStatus).toBe("completed");
    expect(model.currentActivity).toBeUndefined();
    expect(model.currentActivityStatus).toBeUndefined();
    expect(model.completedLessons).toBe(1);
    expect(model.totalLessons).toBe(modules.reduce((count, module) => count + module.lessons.length, 0));
    expect(model.lessonProgressByModule.get("M01")).toMatchObject({ completed: 1, total: modules[0].lessons.length });
    expect(model.nextItems[0]).toMatchObject({ id: "M01-L03", href: "/modules/01/lessons/m01-l03" });
    expect(model.recentItems.some((item) => item.title === "From program to process" && item.href === "/modules/01/lessons/m01-l01")).toBe(true);
    expect(model.recentItems.some((item) => item.href === "/activities/A01" && item.detail === "Activity marked for review")).toBe(true);
  });
});
