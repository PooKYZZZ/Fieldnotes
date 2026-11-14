import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { activities, glossary, libraryDocuments, majorProjects, modules, officialResources, projectMilestones, smallProjects, troubleshooting } from "@/content";

describe("learning content integrity", () => {
  it("contains the complete course and project catalog with unique identifiers", () => {
    expect(modules).toHaveLength(24);
    expect(activities).toHaveLength(24);
    expect(troubleshooting).toHaveLength(12);
    expect(smallProjects).toHaveLength(8);
    expect(majorProjects).toHaveLength(3);

    for (const ids of [
      modules.map((item) => item.id),
      activities.map((item) => item.id),
      troubleshooting.map((item) => item.id),
      smallProjects.map((item) => item.id),
      majorProjects.map((item) => item.id),
    ]) {
      expect(new Set<string | number>(ids).size).toBe(ids.length);
    }
  });

  it("keeps every module paired with its matching activity and module", () => {
    for (const learningModule of modules) {
      const activity = activities.find((item) => item.id === learningModule.activityId);
      expect(activity?.moduleId).toBe(learningModule.id);
    }
    for (const activity of activities) {
      expect(modules.some((item) => item.id === activity.moduleId)).toBe(true);
    }
  });

  it("provides concrete, safe, verifiable practice guidance for every activity", () => {
    const activity = activities.find((item) => item.id === "A01");
    expect(activity).toMatchObject({
      environment: expect.stringContaining("disposable Ubuntu virtual machine"),
      hints: expect.stringContaining("ps -eo pid,ppid,comm,rss --sort=-rss | head"),
      verification: expect.stringContaining("live PID"),
      troubleshooting: expect.stringContaining("do not use `sudo`"),
      cleanup: expect.stringContaining("Shut down the disposable VM"),
    });
    for (const item of activities) {
      expect(item.environment, item.id).toBeTruthy();
      expect(item.steps, item.id).toBeTruthy();
      expect(item.hints, item.id).toBeTruthy();
      expect(item.verification, item.id).toBeTruthy();
      expect(item.troubleshooting, item.id).toBeTruthy();
      expect(item.cleanup, item.id).toBeTruthy();
    }
  });

  it("gives every module a question, recall explanation, and valid objective anchors", () => {
    for (const learningModule of modules) {
      expect(learningModule.learningQuestion.trim(), "M" + learningModule.id).not.toBe("");
      expect(learningModule.recallQuestion.trim(), "M" + learningModule.id).not.toBe("");
      expect(learningModule.recallAnswer.trim(), "M" + learningModule.id).not.toBe("");

      const prefix = "#module-" + String(learningModule.id).padStart(2, "0") + "-";
      const sectionIds = new Set(
        learningModule.explanation
          .split(/\r?\n/)
          .filter((line) => line.startsWith("### "))
          .map((line) => prefix + line.slice(4).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
      );
      for (const objective of learningModule.concepts) {
        if (objective.href) expect(sectionIds.has(objective.href), "M" + learningModule.id + ": " + objective.label).toBe(true);
      }
    }
  });

  it("keeps the Module 01 lesson explanation in a scannable concept sequence", () => {
    const lesson = modules.find((item) => item.id === 1)?.explanation ?? "";
    expect(lesson).toContain("### From program to process");
    expect(lesson).toContain("### User space and the kernel");
    expect(lesson).toContain("### Memory, storage, and failures");
    expect(lesson).toContain("### Virtual machines and containers");
  });

  it("ships every referenced source PDF and uses secure official links", () => {
    expect(libraryDocuments).toHaveLength(8);
    for (const document of libraryDocuments) {
      expect(existsSync(path.join(process.cwd(), "public", "library", document.file))).toBe(true);
    }
    for (const resource of officialResources) {
      expect(new URL(resource.url).protocol).toBe("https:");
    }
  });

  it("keeps glossary terms unique", () => {
    const terms = glossary.map(([term]) => term);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("derives unique milestones only for listed major projects", () => {
    expect(projectMilestones.length).toBeGreaterThan(0);
    expect(new Set(projectMilestones.map((item) => item.id)).size).toBe(projectMilestones.length);
    expect(projectMilestones.every((item) => majorProjects.some((project) => project.id === item.projectId))).toBe(true);
  });
});
