import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { activities, glossary, libraryDocuments, majorProjects, modules, officialResources, projectMilestones, smallProjects, troubleshooting } from "@/content";
import { a01TaskIds } from "@/content/a01-task-ids";

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

    for (const project of [...smallProjects, ...majorProjects]) {
      expect(project.track).toMatch(/^(Focused build|Integrated build|Capstone)$/);
      expect(project.estimatedTime.length).toBeGreaterThan(4);
      expect(project.tools.length).toBeGreaterThanOrEqual(2);
      for (const section of [
        "Scenario",
        "Why this matters",
        "Learning objectives",
        "Prerequisites and setup",
        "Requirements and boundaries",
        "Architecture and decisions",
        "Build milestones",
        "Verification plan",
        "Acceptance criteria",
        "Troubleshooting",
        "Portfolio deliverables",
        "Stretch goals",
        "Technical references",
      ]) {
        expect(project.details[section], `${project.id} has ${section}`).toBeTruthy();
      }
    }

    const logExplorerImplementation = projectMilestones.find((milestone) => milestone.id === "S01.2");
    expect(logExplorerImplementation?.hints.map(({ title }) => title)).toEqual([
      "Start with the smallest useful boundary",
      "Treat time as an instant",
      "Keep memory tied to the report, not the file",
    ]);
    expect(logExplorerImplementation?.hints[0]?.content).toContain("Make the parser accept one line");
    expect(logExplorerImplementation?.hints[1]?.content).toContain("timezone");
    expect(logExplorerImplementation?.hints[2]?.content).toContain("iterator over input lines");
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
      scenario: expect.stringContaining("cannot tell you about the application"),
      environment: expect.stringContaining("disposable VM"),
      steps: expect.stringContaining("ps -u \"$(id -u)\" -o pid,ppid,euid,stat,rss,comm"),
      expectedObservations: expect.stringContaining("a scope"),
      verification: expect.stringContaining("does not inspect your VM"),
      cleanup: expect.stringContaining("shut down the disposable VM"),
    });
    expect(Object.keys(activity?.taskHints ?? {}).sort()).toEqual([...a01TaskIds].sort());
    expect(activity?.taskHints?.["compare-proc"]).toContain("without `sudo`");
    expect(Object.keys(activity?.taskDetails ?? {}).sort()).toEqual(["check-systemd", "choose-process", "compare-proc"]);
    expect(activity?.taskDetails?.["compare-proc"]).toContain("separate snapshots");
    expect(activity?.steps).toContain('systemctl status "$PID" --no-pager');
    expect(activity?.steps).toContain("A01 does **not** trace that path");
    expect(activity?.independencePrompt).toContain("what would you check next");
    for (const item of activities) {
      expect(item.scenario, item.id).toBeTruthy();
      expect(item.objectives, item.id).toMatch(/^- /m);
      expect(item.environment, item.id).toBeTruthy();
      expect(item.steps, item.id).toBeTruthy();
      expect(item.expectedObservations, item.id).toBeTruthy();
      expect(item.submit, item.id).not.toContain("One short readme/note containing expected result");
      expect(item.id === "A01" ? Object.keys(item.taskHints ?? {}).length : item.hints, item.id).toBeTruthy();
      expect(item.verification, item.id).toBeTruthy();
      if (item.id !== "A01") expect(item.troubleshooting, item.id).toBeTruthy();
      expect(item.cleanup, item.id).toBeTruthy();
    }
    expect(troubleshooting).toHaveLength(12);
    for (const item of troubleshooting) {
      expect(item.investigation, item.id).toMatch(/^1\./);
      expect(item.investigation, item.id).toContain("2.");
      expect(item.completion, item.id).toBeTruthy();
    }
  });

  it("links every practical step to one stable activity-specific notebook entry", () => {
    for (const activity of activities) {
      if (activity.id === "A01") continue;
      const taskIds = activity.investigationTasks?.map(({ id }) => id) ?? [];
      const taskTitles = activity.investigationTasks?.map(({ title }) => title) ?? [];
      const stepCount = (activity.steps?.match(/^\d+\.\s+/gm) ?? []).length;
      expect(taskIds.length, `${activity.id} notebook entries`).toBe(stepCount);
      expect(new Set(taskIds).size, `${activity.id} stable IDs`).toBe(taskIds.length);
      expect(taskIds.every((id) => id.startsWith(`${activity.id.toLowerCase()}-`)), `${activity.id} task ownership`).toBe(true);
      expect(taskTitles.every((title) => title.trim().length > 0), `${activity.id} task labels`).toBe(true);
    }
  });

  it("grounds each activity in technical references and keeps cross-activity claims aligned", () => {
    const byId = new Map(activities.map((activity) => [activity.id, activity]));
    for (const activity of activities) {
      expect(activity.prerequisite, `${activity.id} technical references`).toMatch(/https:\/\/[^\s)]+/);
    }

    expect(byId.get("A07")?.challenge).toContain("optional extension");
    expect(byId.get("A11")?.expectedObservations).toContain("mutable name");
    expect(byId.get("A12")?.expectedObservations).toContain("notification threshold");
    expect(byId.get("A08")?.steps).toContain("status-api:dev");
    expect(byId.get("A18")?.steps).toContain("status-api:dev");
    expect(byId.get("A18")?.steps).toContain("Do not push an image");
    expect(byId.get("A23")?.environment).toContain("Do not stop or modify Fieldnotes");
    expect(byId.get("A23")?.verification).toContain("full service recovery test");
    expect(byId.get("A24")?.expectedObservations).toContain("partial/unknown");
  });

  it("gives every module valid lesson links, selected local figures, and an interactive practice check", () => {
    const knowledgeCheckIds = new Set<string>();
    const module01FigureLessons = new Set(["M01-L01", "M01-L02", "M01-L03", "M01-L04", "M01-L06"]);
    for (const learningModule of modules) {
      expect(learningModule.learningQuestion.trim(), "M" + learningModule.id).not.toBe("");
      expect(learningModule.recallQuestion.trim(), "M" + learningModule.id).not.toBe("");
      expect(learningModule.recallAnswer.trim(), "M" + learningModule.id).not.toBe("");

      const expectedLessons = new Map(learningModule.lessons.map((lesson) => [lesson.id, lesson.title]));
      for (const objective of learningModule.concepts) {
        if (objective.href) {
          expect(expectedLessons.has(objective.href.slice("#lesson-".length).toUpperCase()), "M" + learningModule.id + ": " + objective.label).toBe(true);
        }
      }

      const moduleDirectory = path.join(process.cwd(), "src", "content", "curriculum", "modules", String(learningModule.id).padStart(2, "0"), "lessons");
      expect(existsSync(moduleDirectory), "M" + learningModule.id + " lesson directory").toBe(true);
      const lessonFiles = readdirSync(moduleDirectory).filter((file) => file.endsWith(".mdx"));
      expect(lessonFiles, "M" + learningModule.id + " MDX content count").toHaveLength(learningModule.lessons.length + Number(Boolean(learningModule.moduleReview)));
      const foundLessonIds = new Set<string>();
      const foundReviewIds = new Set<string>();
      const moduleKnowledgeCheckIds: string[] = [];
      for (const file of lessonFiles) {
        const source = readFileSync(path.join(moduleDirectory, file), "utf8");
        const lessonId = source.match(/^export const lessonId = "([^"]+)";$/m)?.[1];
        const lessonTitle = source.match(/^export const lessonTitle = "([^"]+)";$/m)?.[1];
        const reviewId = source.match(/^export const reviewId = "([^"]+)";$/m)?.[1];
        const reviewTitle = source.match(/^export const reviewTitle = "([^"]+)";$/m)?.[1];
        expect(Boolean(lessonId), file).not.toBe(Boolean(reviewId));
        if (lessonId && lessonTitle) {
          expect(foundLessonIds.has(lessonId), file).toBe(false);
          foundLessonIds.add(lessonId);
          expect(expectedLessons.get(lessonId), file).toBe(lessonTitle);
          expect(source, file + " must not repeat the shared lesson title").not.toContain(`<h4>${lessonTitle}</h4>`);
        } else {
          expect(reviewId, file).toBe(learningModule.moduleReview?.id);
          expect(reviewTitle, file).toBe(learningModule.moduleReview?.title);
          expect(foundReviewIds.has(reviewId!), file).toBe(false);
          foundReviewIds.add(reviewId!);
        }
        expect(source, file).toContain("<ConceptSection");
        const figureBlocks = [...source.matchAll(/<TechnicalFigure\b[\s\S]*?\/>/g)].map((match) => match[0]);
        const expectedFigureCount = reviewId ? 0 : learningModule.id === 1 ? Number(module01FigureLessons.has(lessonId!)) : 1;
        expect(figureBlocks, file + " figures").toHaveLength(expectedFigureCount);
        for (const figureBlock of figureBlocks) {
          const diagramSource = figureBlock.match(/\bsrc="(\/diagrams\/[^"]+)"/)?.[1] ?? "";
          expect(diagramSource, file + " local figure source").toBeTruthy();
          expect(diagramSource.startsWith(`/diagrams/module${String(learningModule.id).padStart(2, "0")}/`), file).toBe(true);
          expect(existsSync(path.join(process.cwd(), "public", diagramSource.slice(1))), diagramSource).toBe(true);
          if (learningModule.id === 1) {
            expect(figureBlock, file + " source attribution").toContain("source={{");
            expect(figureBlock, file + " sequential caption").toMatch(/caption="Figure [1-5]\./);
          }
        }
        const knowledgeChecks = [...source.matchAll(/<KnowledgeCheck\b[\s\S]*?\/>/g)].map((match) => match[0]);
        for (const block of knowledgeChecks) {
          const checkId = block.match(/\bid="([^"]+)"/)?.[1];
          expect(checkId, file).toBeTruthy();
          moduleKnowledgeCheckIds.push(checkId!);
          expect([...block.matchAll(/\bprompt:/g)], file + " question count").toHaveLength(3);
          expect([...block.matchAll(/\boptions:/g)], file + " option sets").toHaveLength(3);
          expect([...block.matchAll(/\bcorrectIndex:/g)], file + " answer keys").toHaveLength(3);
          expect([...block.matchAll(/\bexplanation:/g)], file + " rationales").toHaveLength(3);
        }
      }
      expect(foundLessonIds, "M" + learningModule.id + " lesson IDs").toEqual(new Set(expectedLessons.keys()));
      expect(foundReviewIds, "M" + learningModule.id + " review IDs").toEqual(new Set(learningModule.moduleReview ? [learningModule.moduleReview.id] : []));
      expect(moduleKnowledgeCheckIds, "M" + learningModule.id + " practice check").toHaveLength(1);
      expect(knowledgeCheckIds.has(moduleKnowledgeCheckIds[0]), "knowledge check IDs must be unique").toBe(false);
      knowledgeCheckIds.add(moduleKnowledgeCheckIds[0]);
    }
    expect(existsSync(path.join(process.cwd(), "public", "diagrams", "module01", "ATTRIBUTION.md"))).toBe(true);
    expect(knowledgeCheckIds.size).toBe(modules.length);
  });

  it("validates Module 23 typed metadata against its MDX lessons and recovery activity", () => {
    const learningModule = modules.find((item) => item.id === 23);
    const activity = activities.find((item) => item.id === "A23");
    expect(learningModule).toMatchObject({ id: 23, activityId: "A23" });
    expect(learningModule?.overview).toContain("An incident response begins with establishing user impact");
    expect(learningModule?.lessons.map(({ id }) => id)).toEqual(["M23-L01", "M23-L02", "M23-L03"]);
    expect(learningModule?.lessons.map(({ title }) => title)).toEqual(learningModule?.concepts.map(({ label }) => label));
    expect(activity?.title).toContain("Recovery drill");
    expect(activity?.environment).toContain("Do not stop or modify Fieldnotes");
    expect(activity?.steps).toContain("RESTORE_START");
    expect(activity?.verification).toContain("full service recovery test");
  });

  it("keeps the Module 01 lesson explanation in a scannable concept sequence", () => {
    const learningModule = modules.find((item) => item.id === 1);
    expect(learningModule?.lessons).toHaveLength(6);
    expect(learningModule?.moduleReview).toEqual({ id: "M01-R01", title: "Trace one simple failure" });
    expect(learningModule?.lessons.map((lesson) => lesson.title)).toContain("From program to process");
    expect(learningModule?.lessons.map((lesson) => lesson.title)).toContain("User space and the kernel");
    expect(learningModule?.lessons.map((lesson) => lesson.title)).toContain("Memory, storage, and failures");
    expect(learningModule?.lessons.map((lesson) => lesson.title)).toContain("Virtual machines and containers");
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

  it("derives detailed, uniquely identified checkpoints for all projects", () => {
    const projects = [...smallProjects, ...majorProjects];
    expect(projectMilestones.length).toBeGreaterThan(40);
    expect(new Set(projectMilestones.map((item) => item.id)).size).toBe(projectMilestones.length);
    expect(projectMilestones.every((item) => projects.some((project) => project.id === item.projectId))).toBe(true);
    expect(projects.every((project) => projectMilestones.filter((item) => item.projectId === project.id).length >= 4)).toBe(true);
    expect(projectMilestones.every((item) => item.guidance.includes("**Purpose:**") && item.acceptance && item.guidance.includes("**Evidence:**"))).toBe(true);
    expect(projectMilestones.filter((item) => item.projectId === "P1").map((item) => item.id)).toEqual(["P1.1", "P1.2", "P1.3", "P1.4", "P1.5", "P1.6", "P1.7", "P1.8"]);
    expect(projectMilestones.filter((item) => item.projectId === "P2").map((item) => item.id)).toEqual(["P2.1", "P2.2", "P2.3", "P2.4", "P2.5", "P2.6", "P2.7"]);
    expect(projectMilestones.filter((item) => item.projectId === "P3").map((item) => item.id)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]);
  });
});
