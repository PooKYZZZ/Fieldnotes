import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import Database from "better-sqlite3";
import type { ProgressInput } from "@/features/progress/model";

const testPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testOrigin = `http://127.0.0.1:${testPort}`;
const screenshotDirectory = process.env.FIELDNOTES_SCREENSHOT_DIR ?? path.join(process.cwd(), "test-results", "fieldnotes-ui-review");
mkdirSync(screenshotDirectory, { recursive: true });

test.afterEach(({}, testInfo) => {
  if (!testInfo.title.startsWith("restore preview is an estimate")
    && !testInfo.title.startsWith("a saved row with an invalid date")) return;
  const databasePath = process.env.FIELDNOTES_E2E_DATABASE_PATH;
  if (!databasePath) return;
  const sqlite = new Database(databasePath);
  try {
    sqlite.prepare(`DELETE FROM learning_progress
      WHERE user_id = (SELECT id FROM "user" WHERE email = ?)
        AND item_type = 'module' AND (
          (item_id = 'M23' AND notes IN (?, ?, ?))
          OR (item_id = 'M24' AND notes IN (?, ?))
        )`).run(
      "owner@fieldnotes.test",
      "Older saved value.", "Backup value.", "Newer edit from a second client.",
      "Synthetic legacy row with an invalid date.", "Recovered the synthetic legacy row; its original note remains.",
    );
  } finally {
    sqlite.close();
  }
});

function progressRecord(itemType: ProgressInput["itemType"], itemId: string, status: ProgressInput["status"], notes = ""): ProgressInput {
  return { itemType, itemId, status, comfort: null, notes, evidence: "", repositoryUrl: "" };
}

async function progressSaveBody(request: APIRequestContext, record: ReturnType<typeof progressRecord>) {
  const response = await request.get(`${testOrigin}/api/progress?itemType=${encodeURIComponent(record.itemType)}&itemId=${encodeURIComponent(record.itemId)}`);
  const rows = response.ok() ? await response.json() as Array<{ revision?: number }> : [];
  return { record, expectedRevision: rows[0]?.revision ?? null };
}

test("dashboard gives a day-one learner one clear starting point and stays responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const homeResponse = await page.goto("/");
  expect(homeResponse?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(homeResponse?.headers()["x-frame-options"]).toBe("DENY");
  await expect(page.getByRole("heading", { level: 1, name: "My learning" })).toBeVisible();
  await expect(page.locator(".continue-panel .continue-kicker")).toContainText("Your next lesson");
  const startLesson = page.getByRole("link", { name: "Start lesson" });
  await expect(startLesson).toHaveAttribute("href", "/modules/01/lessons/m01-l01");
  await expect(page.getByRole("link", { name: "Browse the roadmap" })).toHaveAttribute("href", "/roadmap");
  await expect(page.getByRole("heading", { name: "Up next" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recent work" })).toHaveCount(0);
  await expect(page.locator(".progress-summary-stat").nth(0)).toContainText("0/24");
  await expect(page.locator(".progress-summary-stat").nth(1)).toContainText("0/77");
  await expect(page.locator(".progress-summary-stat").nth(2)).toContainText("0/24");
  await expect(page.locator(".module-card")).toHaveCount(0);
  await page.screenshot({ path: path.join(screenshotDirectory, "dashboard-after-1440.png") });
  await page.getByRole("link", { name: "Infrastructure & Cloud 8 modules" }).click();
  await expect(page.getByLabel("Phase", { exact: true })).toHaveValue("Infrastructure & Cloud");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(8);
  await page.goBack();
  await expect(startLesson).toBeVisible();

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(startLesson).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "dashboard-after-1920.png") });

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("heading", { name: "My learning" })).toBeVisible();
  await page.waitForFunction(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
  });
  await page.screenshot({ path: path.join(screenshotDirectory, "dashboard-after-768.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
  });
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
  await expect(startLesson).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "dashboard-after-390.png"), fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Learning pages" })).toBeVisible();
  const closeNavigation = page.getByRole("button", { name: "Close navigation drawer" });
  await expect(closeNavigation).toBeFocused();
  await expect(closeNavigation).toBeVisible();
  await expect(page.getByRole("link", { name: /Account for/ })).toBeVisible();
  await expect(page.locator('button[aria-controls="main-navigation"]')).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("link", { name: /Account for/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeNavigation).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.setViewportSize({ width: 667, height: 375 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const mobileDrawer = page.locator(".sidebar");
  const drawerSize = await mobileDrawer.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(drawerSize.clientHeight).toBeLessThanOrEqual(375);
  expect(drawerSize.scrollHeight).toBeGreaterThan(drawerSize.clientHeight);
  await expect(page.getByRole("button", { name: "Close navigation drawer" })).toBeFocused();
  await mobileDrawer.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(page.getByRole("link", { name: "Guide" })).toBeInViewport();
  await expect(page.getByRole("link", { name: /Account for/ })).toBeInViewport();
  await page.getByRole("button", { name: "Close navigation drawer" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation", { name: "Learning pages" }).getByRole("link", { name: "Activities" }).click();
  await expect(page.getByRole("heading", { name: "Activities & labs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/roadmap");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(24);
  await expect(page.getByText("MODULE 24")).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "roadmap-desktop.png") });
  await page.getByRole("button", { name: "Collapse all phases" }).click();
  await expect(page.locator(".roadmap-phase-modules:not([hidden])")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".roadmap-phase-modules:not([hidden])")).toHaveCount(0);
  const foundationsToggle = page.getByRole("button", { name: "Expand Foundations modules" });
  await foundationsToggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#phase-foundations-modules")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.locator("#phase-foundations-modules")).toBeHidden();
  await page.getByRole("button", { name: "Expand all phases" }).click();
  await expect(page.locator(".roadmap-phase-modules:not([hidden])")).toHaveCount(await page.locator(".roadmap-phase").count());
  await page.locator("#roadmap-phase-filter").selectOption("Infrastructure & Cloud");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(8);
  await expect(page.locator(".roadmap-phase-toggle").first()).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".roadmap-phase-toggle").first()).toBeDisabled();
  await page.locator("#roadmap-phase-filter").selectOption("all");
  await page.locator("#roadmap-progress-filter").selectOption("completed");
  await expect(page.getByText("No modules match these filters.")).toBeVisible();
  await page.locator(".roadmap-empty").getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("searchbox", { name: "Search modules by title or topic" }).fill("Linux users");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(1);
  await expect(page.getByText("Linux users, processes and service management")).toBeVisible();
  const roadmapSearch = page.getByRole("searchbox", { name: "Search modules by title or topic" });
  await roadmapSearch.fill("Kubernetes");
  await expect(page).toHaveURL(/q=Kubernetes/);
  await expect(page.locator(".module-grid .module-card")).toHaveCount(1);
  await page.locator('.module-card-link[href="/modules/18"]').click();
  await expect(page).toHaveURL(/\/modules\/18$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/roadmap\?q=Kubernetes$/);
  await expect(page.getByRole("searchbox", { name: "Search modules by title or topic" })).toHaveValue("Kubernetes");
  await page.getByRole("searchbox", { name: "Search modules by title or topic" }).fill("no module has this phrase");
  await expect(page.getByText("No modules match these filters.")).toBeVisible();
  await page.locator(".roadmap-empty").getByRole("button", { name: "Clear filters" }).click();
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "roadmap-tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "roadmap-mobile.png"), fullPage: true });
});

test("the revised lesson and activity journey resumes a saved task on mobile", async ({ browser }) => {
  const context = await browser.newContext({ storageState: process.env.FIELDNOTES_E2E_OTHER_STATE });
  try {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${testOrigin}/modules/01/lessons/m01-l01`);
    const figure = page.locator("#process-lifecycle");
    const reference = page.getByRole("link", { name: "Figure 1", exact: true });
    await expect(figure).toBeVisible();
    await expect(reference).toBeVisible();
    expect((await figure.boundingBox())?.x ?? 0).toBeGreaterThan((await reference.boundingBox())?.x ?? Infinity);
    await page.screenshot({ path: path.join(screenshotDirectory, "review-process-lesson-desktop.png"), caret: "initial" });

    await page.setViewportSize({ width: 390, height: 844 });
    await reference.click();
    await expect(page).toHaveURL(/#process-lifecycle$/);
    await expect(figure).toBeInViewport();
    await expect(page.getByRole("heading", { name: "Trace a parent process in your VM" })).toBeAttached();
    await page.getByRole("link", { name: "Practice in A01" }).click();
    await expect(page.getByText(/^A teammate reports/)).toBeVisible();
    const task = page.getByRole("button", { name: "Record Task 1 in the investigation notebook" });
    await task.click();
    const notebook = page.getByRole("dialog", { name: "A01 investigation notebook" });
    await expect(notebook.getByText(/^Example: I expected a regular account/)).toBeVisible();
    await notebook.getByRole("textbox", { name: "Task observation" }).fill("The synthetic learner observed UID 1000 and will use it to scope the search.");
    await notebook.getByRole("button", { name: "Save observations" }).click();
    await expect(notebook.getByText(/Last saved/)).toBeVisible();

    await page.goto(testOrigin);
    const resume = page.getByRole("link", { name: "Resume activity" });
    await expect(resume).toHaveAttribute("href", "/activities/A01#activity-task-choose-process");
    const notebookLink = page.getByRole("link", { name: "Open progress notebook" });
    await expect(notebookLink).toBeInViewport();
    await page.screenshot({ path: path.join(screenshotDirectory, "review-resume-activity-mobile.png"), caret: "initial" });
    await resume.click();
    await expect(page).toHaveURL(/#activity-task-choose-process$/);
    await expect(page.locator(".activity-a01-task-picker-mobile select")).toHaveValue("choose-process");
    await page.goto(`${testOrigin}/progress`);
    await expect(page.getByRole("link", { name: "Confirm your account", exact: true })).toHaveAttribute("href", "/activities/A01#activity-task-confirm-account");
  } finally {
    await context.close();
  }
});

test("progress edits save to SQLite and survive a page reload", async ({ page }) => {
  const seededModule = await page.request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(page.request, { ...progressRecord("module", "M01", "not_started", "Older module note."), comfort: "guided", evidence: "Existing evidence stays attached to the module record.", repositoryUrl: "https://example.com/old-module-record" }),
  });
  expect(seededModule.ok()).toBeTruthy();

  await page.goto("/modules/01");
  await expect(page.getByRole("heading", { name: /Module 01 — How computers and operating systems work/ })).toBeVisible();
  await page.getByLabel("Status").selectOption("in_progress");
  await page.locator("#notes-M01").fill("I can describe the user-space and kernel boundary.");
  await expect(page.getByLabel("Evidence or verification")).toHaveCount(0);
  await expect(page.getByLabel("How independently can you do this?")).toHaveCount(0);
  await page.getByRole("button", { name: "Save module progress" }).click();
  await expect(page.getByText("Saved to your account.")).toBeVisible();
  const savedModule = await page.request.get(`${testOrigin}/api/progress?itemType=module&itemId=M01`);
  expect(await savedModule.json()).toMatchObject([{ status: "in_progress", comfort: "guided", notes: "I can describe the user-space and kernel boundary.", evidence: "Existing evidence stays attached to the module record.", repositoryUrl: "https://example.com/old-module-record" }]);

  await page.reload();
  await expect(page.getByLabel("Status")).toHaveValue("in_progress");
  await expect(page.locator("#notes-M01")).toHaveValue("I can describe the user-space and kernel boundary.");
  await page.goto("/progress");
  const savedModuleRecord = page.locator(".progress-record").filter({ hasText: "Module 01 · How computers and operating systems work" });
  await expect(savedModuleRecord).toContainText("I can describe the user-space and kernel boundary.");
  await expect(savedModuleRecord.getByRole("link", { name: "Edit learning record" })).toHaveAttribute("href", "/modules/01#progress-editor-M01");
  await savedModuleRecord.getByRole("link", { name: "Edit learning record" }).click();
  await expect(page).toHaveURL(/\/modules\/01#progress-editor-M01$/);
  await expect(page.locator("#progress-editor-M01")).toBeInViewport();

  await page.goto("/modules/01/lessons/m01-l02");
  await expect(page.getByRole("heading", { level: 1, name: "Processes and threads" })).toBeVisible();
  await page.getByRole("button", { name: "Set draft to complete" }).click();
  await page.getByRole("button", { name: "Save learning record" }).click();
  await expect(page.getByText("Saved to your account.")).toBeVisible();
  const savedLesson = await page.request.get(`${testOrigin}/api/progress?itemType=lesson&itemId=M01-L02`);
  expect(await savedLesson.json()).toMatchObject([{ itemType: "lesson", itemId: "M01-L02", status: "completed" }]);

  await page.goto("/modules/01/lessons/m01-l02");
  await page.locator('.learning-lesson-navigation a[href="/modules/01/lessons/m01-l03"]').click();
  await expect(page).toHaveURL(/\/modules\/01\/lessons\/m01-l03$/);
  const nextLessonProgress = page.locator("#progress-editor-M01-L03");
  await expect(nextLessonProgress.locator(".progress-lesson-status-control .field-hint")).toHaveText("Draft status: Not started");
  await expect(nextLessonProgress.getByRole("button", { name: "Set draft to complete" })).toBeVisible();
  await nextLessonProgress.getByRole("button", { name: "Set draft to complete" }).click();
  await nextLessonProgress.getByRole("button", { name: "Save learning record" }).click();
  await expect(nextLessonProgress.getByText("Saved to your account.")).toBeVisible();
  const savedNextLesson = await page.request.get(`${testOrigin}/api/progress?itemType=lesson&itemId=M01-L03`);
  expect(await savedNextLesson.json()).toMatchObject([{ itemType: "lesson", itemId: "M01-L03", status: "completed" }]);
  const preservedLesson = await page.request.get(`${testOrigin}/api/progress?itemType=lesson&itemId=M01-L02`);
  expect(await preservedLesson.json()).toMatchObject([{ itemType: "lesson", itemId: "M01-L02", status: "completed" }]);

  await page.goto("/modules/01");
  await expect(page.locator(".module-lesson-progress-label")).toContainText("2 of 6 marked complete");
  await page.goto("/");
  await expect(page.locator(".continue-panel .continue-kicker")).toContainText("Your next lesson");
  await expect(page.getByRole("link", { name: "Start lesson" })).toHaveAttribute("href", "/modules/01/lessons/m01-l01");
  await expect(page.getByRole("heading", { name: "Up next" })).toBeVisible();
  await expect(page.locator(".next-item")).toHaveCount(1);
  await expect(page.locator(".next-item")).toHaveAttribute("href", "/modules/01/lessons/m01-l04");
  await expect(page.locator(".progress-summary-stat").nth(1)).toContainText("2/77");
  await page.goto("/roadmap");
  await page.locator("#roadmap-progress-filter").selectOption("in_progress");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(1);
  await expect(page.locator(".module-grid .module-card").first().locator(".module-lesson-card-progress-label")).toContainText("2 of 6");
  await expect(page.locator(".module-grid .module-card").first().locator(".module-card-activity-status")).toContainText("Not started");
});

test("unsaved editor drafts survive scenario collapse and browser Back", async ({ page }) => {
  await page.goto("/activities");
  const scenario = page.locator("#troubleshooting-t01");
  await scenario.locator("summary.troubleshooting-summary").click();
  const scenarioEditor = scenario.locator("#progress-editor-T01");
  await scenarioEditor.getByLabel("Learning note").fill("Draft survives closing this scenario.");
  await scenario.locator("summary.troubleshooting-summary").click();
  await scenario.locator("summary.troubleshooting-summary").click();
  await expect(scenarioEditor.getByLabel("Learning note")).toHaveValue("Draft survives closing this scenario.");

  await page.goto("/");
  await page.getByRole("link", { name: "Start lesson" }).click();
  const lessonEditor = page.locator(".progress-editor--lesson-status");
  await lessonEditor.getByRole("button", { name: "Set draft to complete" }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "My learning" })).toBeVisible();
  await page.goForward();
  await expect(lessonEditor.locator(".progress-lesson-status-control .field-hint")).toHaveText("Draft status: Completed");

  await page.goto("/activities");
  await page.locator('a[href="/activities/A02"]').first().click();
  const observation = page.getByRole("textbox", { name: "Task observation" });
  await expect(observation).toBeEnabled();
  await observation.fill("Activity draft survives browser Back.");
  await page.goBack();
  await expect(page).toHaveURL(/\/activities$/);
  await page.goForward();
  await expect(observation).toHaveValue("Activity draft survives browser Back.");
});

test("a stale draft can be compared and deliberately saved against the latest revision", async ({ page }) => {
  await page.goto("/activities#troubleshooting-t12");
  const editor = page.locator("#progress-editor-T12");
  const note = editor.getByRole("textbox", { name: "Learning note" });
  await expect(note).toBeEnabled();
  await note.fill("A draft written before the other save.");

  const newerRecord = progressRecord("troubleshooting", "T12", "in_progress", "A newer note saved elsewhere.");
  const newerSave = await page.request.put("/api/progress", {
    headers: { Origin: testOrigin },
    data: await progressSaveBody(page.request, newerRecord),
  });
  expect(newerSave.ok()).toBeTruthy();

  const save = editor.getByRole("button", { name: "Save learning record" });
  await save.click();
  await expect(save).toBeDisabled();
  await editor.getByText("Compare saved version", { exact: true }).click();
  await expect(editor.getByText("A newer note saved elsewhere.", { exact: false })).toBeVisible();
  await expect(note).toHaveValue("A draft written before the other save.");
  await editor.getByRole("button", { name: "Keep my draft" }).click();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(editor.getByText("Saved to your account.", { exact: true })).toBeVisible();

  const saved = await page.request.get("/api/progress?itemType=troubleshooting&itemId=T12");
  expect(await saved.json()).toMatchObject([{ notes: "A draft written before the other save." }]);
});

test("backup import merges records and export downloads the saved data", async ({ page, request }) => {
  const existing = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, progressRecord("module", "M02", "completed", "Existing record remains.")),
  });
  expect(existing.ok()).toBeTruthy();

  await page.goto("/progress");
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    records: [{ ...progressRecord("module", "M03", "needs_review", "Imported note."), updatedAt: Date.now() - 1000 }],
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: "fieldnotes-progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("heading", { name: "Restore preview" })).toBeVisible();
  await expect(page.getByText(/1 records? in the backup/)).toBeVisible();
  await page.getByRole("button", { name: "Apply merge" }).click();
  await expect(page.getByText("1 record was restored; 0 equal or newer saved records were kept.")).toBeVisible();

  const response = await request.get(`${testOrigin}/api/progress`);
  const rows = await response.json() as { itemId: string; status: string; notes: string }[];
  expect(rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ itemId: "M02", status: "completed", notes: "Existing record remains." }),
    expect.objectContaining({ itemId: "M03", status: "needs_review", notes: "Imported note." }),
  ]));

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const exported = JSON.parse(await (await import("node:fs/promises")).readFile(downloadPath!, "utf8")) as { version: number; records: unknown[] };
  expect(exported.version).toBe(3);
  expect(exported.records).toHaveLength(rows.length);

  await page.goto("/");
  await expect(page.locator(".continue-panel .continue-kicker")).toContainText("Your next lesson");
  await expect(page.getByRole("link", { name: "Start lesson" })).toHaveAttribute("href", "/modules/03/lessons/m03-l01");
  await expect(page.getByRole("heading", { name: "Up next" })).toBeVisible();
  await expect(page.locator(".next-item").first()).toHaveAttribute("href", "/modules/03/lessons/m03-l02");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(screenshotDirectory, "dashboard-desktop-in-progress.png") });
});

test("restore preview is an estimate and apply keeps a newer edit from another client", async ({ page, request }) => {
  const itemType = "module" as const;
  const itemId = "M23";
  const existing = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, progressRecord(itemType, itemId, "in_progress", "Older saved value.")),
  });
  expect(existing.ok()).toBeTruthy();

  const sqlite = new Database(process.env.FIELDNOTES_E2E_DATABASE_PATH!);
  try {
    sqlite.prepare("UPDATE learning_progress SET updated_at = ? WHERE user_id = (SELECT id FROM \"user\" WHERE email = ?) AND item_type = ? AND item_id = ?")
      .run(Date.now() - 2_000, "owner@fieldnotes.test", itemType, itemId);
  } finally {
    sqlite.close();
  }

  await page.goto("/progress");
  const backup = {
    version: 3,
    exportedAt: new Date().toISOString(),
    records: [{ ...progressRecord(itemType, itemId, "needs_review", "Backup value."), updatedAt: Date.now() - 1_000 }],
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: "fieldnotes-progress-preview.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("heading", { name: "Restore preview" })).toBeVisible();
  await expect(page.getByText(/Estimates at preview time: 1 records in the backup/)).toBeVisible();
  await expect(page.getByText("replace with the newer backup record")).toBeVisible();

  const secondClientSave = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, progressRecord(itemType, itemId, "in_progress", "Newer edit from a second client.")),
  });
  expect(secondClientSave.ok()).toBeTruthy();

  await page.getByRole("button", { name: "Apply merge" }).click();
  await expect(page.getByText("0 records were restored; 1 equal or newer saved record was kept.")).toBeVisible();
  const saved = await request.get(`${testOrigin}/api/progress?itemType=${itemType}&itemId=${itemId}`);
  expect(await saved.json()).toMatchObject([{ notes: "Newer edit from a second client." }]);
});

test("a saved row with an invalid date stays visible and can be recovered through its revision", async ({ page, request }) => {
  const record = progressRecord("module", "M24", "completed", "Synthetic legacy row with an invalid date.");
  const save = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, record),
  });
  expect(save.ok()).toBeTruthy();
  const initial = await save.json() as { revision: number };

  const sqlite = new Database(process.env.FIELDNOTES_E2E_DATABASE_PATH!);
  try {
    sqlite.prepare("UPDATE learning_progress SET updated_at = ? WHERE user_id = (SELECT id FROM \"user\" WHERE email = ?) AND item_type = ? AND item_id = ?")
      .run(8.64e15 + 1, "owner@fieldnotes.test", record.itemType, record.itemId);
  } finally {
    sqlite.close();
  }

  await page.goto("/");
  await expect(page.getByText("Saved date unavailable")).toBeVisible();
  await page.goto("/progress");
  const savedRow = page.locator(".progress-record").filter({ hasText: "Synthetic legacy row with an invalid date." });
  await expect(savedRow.getByText("Saved date unavailable")).toBeVisible();
  await expect(savedRow.getByText("Synthetic legacy row with an invalid date.")).toBeVisible();
  await expect(savedRow.getByRole("link", { name: "Edit learning record" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();

  await page.goto("/modules/24#progress-editor-M24");
  const editor = page.locator("#progress-editor-M24");
  const note = editor.getByRole("textbox", { name: "Reflection (optional)" });
  await expect(editor.getByText("Saved date unavailable")).toBeVisible();
  await expect(note).toHaveValue(record.notes);
  await note.fill("Recovered the synthetic legacy row; its original note remains.");
  await editor.getByRole("button", { name: "Save module progress" }).click();
  await expect(editor.getByText("Saved to your account.", { exact: true })).toBeVisible();

  const recovered = await request.get(`${testOrigin}/api/progress?itemType=module&itemId=M24`);
  expect(await recovered.json()).toMatchObject([{
    notes: "Recovered the synthetic legacy row; its original note remains.",
    updatedAt: expect.any(Number),
    revision: initial.revision + 1,
  }]);
});

test("activity directory filters by real phase, search text, and saved status", async ({ page, request }) => {
  const savedActivity = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, progressRecord("activity", "A03", "in_progress", "Temporary E2E activity state.")),
  });
  expect(savedActivity.ok()).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/activities");
  await expect(page.getByRole("heading", { name: "Activities & labs" })).toBeVisible();
  const activitySearch = page.getByRole("searchbox", { name: "Search by topic, technology, or skill" });
  await expect(activitySearch).toBeVisible();
  await expect(page.locator(".continue-practice-card")).toContainText("Linux users, processes and service management");
  await expect(page.locator(".continue-practice-card").getByRole("link", { name: "Continue activity" })).toHaveAttribute("href", "/activities/A03");
  await expect(page.getByRole("link", { name: /Troubleshooting 12/ })).toHaveAttribute("href", "#troubleshooting");
  await page.getByRole("button", { name: /Foundations/ }).click();
  await page.getByLabel("Saved progress").selectOption("in_progress");
  await activitySearch.fill("systemd");
  await expect(page.locator(".practice-card")).toHaveCount(1);
  await expect(page.locator(".practice-card").first()).toContainText("A03");
  await expect(page.locator(".practice-card").first()).toContainText("Open activity");
  await activitySearch.fill("permission denied");
  await expect(page.locator(".practice-card")).toHaveCount(0);
  await expect(page.locator("#troubleshooting .troubleshooting-card")).toHaveCount(1);
  await expect(page.locator("#troubleshooting .troubleshooting-card").first()).toContainText("T03");
  await activitySearch.fill("nothing matches this phrase");
  await expect(page.getByText("No activities match these filters.")).toBeVisible();
  await expect(page.getByText("No troubleshooting scenarios match this search.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".practice-card")).toHaveCount(24);
  const troubleshootingCard = page.locator("#troubleshooting-t03");
  await expect(troubleshootingCard.locator(".practice-status")).toHaveText("Not started");
  await troubleshootingCard.locator("summary.troubleshooting-summary").click();
  await expect(troubleshootingCard.locator(".troubleshooting-hint")).toHaveJSProperty("open", false);
  await expect(troubleshootingCard.getByRole("heading", { name: "T03 learning record" })).toBeVisible();
  const troubleshootingRecord = troubleshootingCard.locator("#progress-editor-T03");
  await troubleshootingRecord.getByLabel("Status").selectOption("in_progress");
  await troubleshootingRecord.getByLabel("Learning note").fill("Expected a read denial for the service identity; recorded the first failing path.");
  await troubleshootingRecord.getByLabel("Evidence or verification").fill("Compared the unit identity, directory permissions, and the matching journal entry.");
  await troubleshootingRecord.getByRole("button", { name: "Save learning record" }).click();
  await expect(troubleshootingRecord.locator(".form-message")).toContainText("Saved to your account.");
  await expect(troubleshootingCard.locator(".practice-status")).toHaveText("In progress");
  await troubleshootingCard.locator("summary.troubleshooting-summary").click();
  await troubleshootingCard.locator("summary.troubleshooting-summary").click();
  await expect(troubleshootingCard.locator("#progress-editor-T03").getByLabel("Learning note")).toHaveValue("Expected a read denial for the service identity; recorded the first failing path.");
  await troubleshootingCard.locator("summary.troubleshooting-summary").click();
  await page.goto("/progress");
  await page.getByRole("button", { name: "Troubleshooting" }).click();
  const savedTroubleshooting = page.locator(".progress-record").filter({ hasText: "T03 ·" });
  await expect(savedTroubleshooting).toContainText("Expected a read denial for the service identity");
  await savedTroubleshooting.getByRole("link", { name: "Open scenario" }).click();
  await expect(page).toHaveURL(/\/activities#troubleshooting-t03$/);
  await expect(page.locator("#troubleshooting-t03")).toHaveJSProperty("open", true);
  await expect(page.locator("#progress-editor-T03")).toBeVisible();
  await page.goto("/activities");
  await page.screenshot({ path: path.join(screenshotDirectory, "activities-desktop.png"), fullPage: true });
  await page.getByRole("link", { name: /Troubleshooting 12/ }).click();
  await expect(page).toHaveURL(/#troubleshooting$/);
  await expect(page.locator("#troubleshooting")).toBeInViewport();

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForFunction(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
  });
  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(tabletOverflow).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "activities-tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
  });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(mobileOverflow).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "activities-mobile.png"), fullPage: true });
});

test("projects and progress notebook reflect saved milestone evidence", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects/P1#project-build");
  const projectLearningRecord = page.locator("#progress-editor-P1");
  await expect(projectLearningRecord).toBeVisible();
  expect(await projectLearningRecord.getByLabel("Engineering log").evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(95);
  expect(await page.locator(".project-build-main").evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(await page.locator(".project-notebook").evaluate((element) => element.getBoundingClientRect().width));

  await page.goto("/projects");
  await expect(page.locator(".major-build-card")).toHaveCount(3);
  await expect(page.locator(".small-tool-card")).toHaveCount(8);
  const firstProjectProgress = page.locator(".major-build-card").first().getByRole("progressbar");
  await expect(firstProjectProgress).toHaveAttribute("aria-valuenow", "0");
  await expect(firstProjectProgress).toHaveAttribute("aria-valuemax", "8");
  await page.screenshot({ path: path.join(screenshotDirectory, "projects-desktop.png"), fullPage: true });

  const milestone = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, progressRecord("milestone", "P2.1", "completed")),
  });
  expect(milestone.ok()).toBeTruthy();
  await page.goto("/projects");
  await expect(page.locator(".major-build-card").first()).toHaveAttribute("data-project-id", "P2");
  await expect(page.locator(".major-build-card").first()).toContainText("Next checkpoint");
  await expect(page.locator(".major-build-card").first()).toContainText("P2.2");
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress notebook" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved learning record" })).toBeVisible();
  await expect(page.locator(".progress-stat").filter({ hasText: "Roadmap modules" })).toContainText("24");
  await expect(page.locator(".progress-stat").filter({ hasText: "Marked complete" })).toContainText("1");
  await expect(page.locator(".progress-stat").filter({ hasText: "In progress" })).toContainText("1");
  await expect(page.locator(".progress-stat").filter({ hasText: "Needs review" })).toContainText("1");
  await page.goto("/projects/P3#project-review");
  await page.locator(".project-record-review").getByRole("link", { name: "Progress notebook" }).click();
  await expect(page).toHaveURL(/\/progress\?type=project$/);
  await expect(page.getByRole("button", { name: "Projects" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/progress");
  await expect(page.getByText(/^P2\.1 ·/)).toBeVisible();
  await expect(page.locator(".progress-record").first()).toContainText(/^P2\.1/);
  await page.getByRole("searchbox", { name: "Search saved learning records" }).fill("P2.1");
  await expect(page.locator(".progress-record")).toHaveCount(1);
  await page.getByRole("button", { name: "Milestones" }).click();
  await expect(page.locator(".progress-record")).toHaveCount(1);
  await page.screenshot({ path: path.join(screenshotDirectory, "progress-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForFunction(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "progress-tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "progress-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Open milestone" }).click();
  await expect(page).toHaveURL(/\/projects\/P2#milestone-P2\.1$/);
  await expect(page.locator('[id="milestone-P2.1"]')).toBeInViewport();
});

test("focused project checkpoints survive refresh and remain in the progress notebook", async ({ page }) => {
  await page.goto("/projects/S01#project-build");
  await expect(page.getByRole("heading", { name: "Log explorer", level: 1 })).toBeVisible();
  const checkpoint = page.locator('[id="milestone-check-S01.1"]');
  await expect(checkpoint).toBeVisible();
  await expect(checkpoint).toBeEnabled();
  if (await checkpoint.isChecked()) {
    await checkpoint.uncheck();
    await expect(page.getByText("Checkpoint progress saved.")).toBeVisible();
  }
  await checkpoint.check();
  await expect(page.getByText("Checkpoint progress saved.")).toBeVisible();

  await page.reload();
  await page.getByText(/^Checkpoint map/).click();
  await expect(page.getByRole("navigation", { name: "Build checkpoints" }).getByRole("button").first()).toHaveAccessibleName(/Self-reported complete/);
  await expect(page.getByRole("navigation", { name: "Build checkpoints" }).getByRole("button").nth(1)).toHaveAttribute("aria-current", "step");
  await page.goto("/projects");
  const projectCard = page.locator('[data-project-id="S01"]');
  await expect(projectCard).toContainText("Next checkpoint");
  await expect(projectCard).toContainText("S01.2");

  await page.goto("/progress");
  await expect(page.getByText(/^S01\.1 ·/)).toBeVisible();
  await page.getByRole("searchbox", { name: "Search saved learning records" }).fill("S01.1");
  await expect(page.locator(".progress-record")).toHaveCount(1);
});

test("every project follows the four-stage engineering learning flow", async ({ page }) => {
  const projectIds = ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "P1", "P2", "P3"];
  for (const projectId of projectIds) {
    await page.goto(`/projects/${projectId}`);
    await expect(page.locator(".project-detail-header h1")).toBeVisible();
    const tabs = page.getByRole("tablist", { name: "Project stages" }).getByRole("tab");
    await expect(tabs).toHaveCount(4);
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "The engineering assignment" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Understand the assignment" })).toBeVisible();
    await expect(page.locator(".project-stage-panel:not([hidden])")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Prepare and make design decisions" })).toBeHidden();
    await tabs.nth(1).click();
    await expect(page.getByRole("heading", { name: "Prepare and make design decisions" })).toBeVisible();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".project-detail-header h1")).toBeInViewport();
    await expect(page.getByRole("tablist", { name: "Project stages" })).toBeInViewport();
    await tabs.nth(2).click();
    await expect(page.getByRole("heading", { name: "Build in reviewable checkpoints" })).toBeVisible();
    await expect(page.locator(".project-active-milestone").first()).toBeVisible();
    await tabs.nth(3).click();
    await expect(page.getByRole("heading", { name: "Review your work and prepare the handoff" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prove it works" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Definition of done" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review your saved project notes" })).toBeVisible();
    await expect(page.locator(".project-stage-panel:not([hidden])")).toHaveCount(1);
    await expect(page.locator("#project-panel-project-review .project-supporting-details")).toHaveJSProperty("open", false);
    if (projectId === "P3") await expect(page.locator(".project-checkpoint-review")).toHaveCount(0);
  }
});

test("project build instructions and notebook share the workspace across desktop and mobile", async ({ page }) => {
  await page.goto("/projects");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".project-overview-stats")).not.toContainText("Loading saved progress");
  await expect(page.locator('[data-project-id="P1"] .major-build-next')).toContainText("First checkpoint");
  await expect(page.locator('[data-project-id="S02"] .small-project-next')).toContainText("First checkpoint");
  await page.screenshot({ path: path.join(screenshotDirectory, "projects-overview-1440x900.png"), fullPage: true });

  await page.goto("/projects/P3#project-build");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByRole("tab", { name: "03 Build" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#project-panel-project-build")).toBeVisible();
    await expect(page.locator(".project-build-main")).toBeVisible();
    const desktopLayout = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>(".project-build-main")!.getBoundingClientRect();
      const rail = document.querySelector<HTMLElement>(".project-notebook")!.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        mainWidth: main.width,
        railWidth: rail.width,
        railStartsAfterMain: rail.left > main.right,
      };
    });
    expect(desktopLayout.documentWidth).toBeLessThanOrEqual(desktopLayout.viewportWidth);
    expect(desktopLayout.mainWidth).toBeGreaterThan(600);
    expect(desktopLayout.railWidth).toBeGreaterThanOrEqual(320);
    expect(desktopLayout.railStartsAfterMain).toBe(true);
    await page.screenshot({ path: path.join(screenshotDirectory, `project-P3-${viewport.width}x${viewport.height}.png`) });
  }

  await page.goto("/projects/P3");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator(".project-workflow-nav").getByRole("tab", { name: "Build" }).click();
    await expect(page).toHaveURL(/#project-build$/);
    await expect(page.locator("#project-panel-project-build")).toBeVisible();
    await expect(page.locator(".project-workflow-nav").getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".project-active-milestone")).toBeVisible();
    await expect(page.locator("#progress-editor-P3")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDirectory, `project-P3-build-${viewport.width}x${viewport.height}.png`) });
  }

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 780 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/projects/P3#project-build");
    await expect(page.locator(".project-active-milestone")).toBeVisible();
    await expect(page.locator(".project-workflow-nav").getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileLayout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      railWidth: document.querySelector<HTMLElement>(".project-notebook")!.getBoundingClientRect().width,
      mainWidth: document.querySelector<HTMLElement>(".project-build-main")!.getBoundingClientRect().width,
    }));
    expect(mobileLayout.documentWidth).toBeLessThanOrEqual(mobileLayout.viewportWidth);
    expect(mobileLayout.railWidth).toBe(0);
    expect(mobileLayout.mainWidth).toBeGreaterThan(250);
    await expect(page.locator(".project-notebook-content")).toBeHidden();
    await page.screenshot({ path: path.join(screenshotDirectory, `project-P3-${viewport.width}x${viewport.height}.png`), fullPage: true });
    if (viewport.width === 390) {
      await page.locator(".project-workflow-nav").getByRole("tab", { name: "Build" }).click();
      await page.getByRole("button", { name: /Open project notebook for this checkpoint/ }).click();
      await expect(page.getByRole("dialog", { name: "Project notebook" })).toBeVisible();
      await page.screenshot({ path: path.join(screenshotDirectory, "project-P3-notebook-390x844.png") });
      await page.getByRole("button", { name: "Close", exact: true }).click();
    }
  }
});

test("project notebook saves once, survives refresh, and appears in final review", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects/S02#project-build");
  await page.getByText(/^Checkpoint map/).click();
  const checkpoints = page.getByRole("navigation", { name: "Build checkpoints" }).getByRole("button");
  await expect(checkpoints).toHaveCount(4);
  await checkpoints.nth(0).click();
  const activeTitle = await page.locator(".project-active-milestone h3").textContent();
  await expect(page.locator(".project-active-milestone")).toContainText(activeTitle ?? "");
  await expect(page.locator(".project-notebook-context")).toContainText(activeTitle ?? "");
  const notebook = page.locator("#progress-editor-S02");
  const firstNote = notebook.getByLabel("Checkpoint note · S02.1");
  await firstNote.fill("Unsaved checkpoint note stays in the shared record while I switch steps.");
  await checkpoints.nth(1).click();
  const secondNote = notebook.getByLabel("Checkpoint note · S02.2");
  await expect(secondNote).toHaveValue("");
  await secondNote.fill("The second checkpoint captured its own network test and result.");
  await expect(page.locator(".project-notebook-context")).toContainText(await page.locator(".project-active-milestone h3").textContent() ?? "");
  await checkpoints.nth(0).click();
  await expect(firstNote).toHaveValue("Unsaved checkpoint note stays in the shared record while I switch steps.");
  await checkpoints.nth(1).click();
  await expect(secondNote).toHaveValue("The second checkpoint captured its own network test and result.");
  await page.getByRole("tab", { name: "Plan" }).click();
  await expect(firstNote).toBeHidden();
  await page.getByRole("tab", { name: "Build" }).click();
  await checkpoints.nth(0).click();
  await expect(firstNote).toHaveValue("Unsaved checkpoint note stays in the shared record while I switch steps.");

  await notebook.getByLabel("Status").selectOption("in_progress");
  await notebook.getByText("Project-wide notes and final evidence").click();
  await notebook.getByLabel("Engineering log").fill("Chose a small service boundary and recorded the reason for the trade-off.");
  await notebook.getByLabel("Final verification summary").fill("The focused test passed; the integration check still needs to run.");
  await notebook.getByRole("button", { name: "Save project notebook" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Saved to your account.");
  const savedRows = await page.request.get("/api/progress?itemType=small_project&itemId=S02");
  const savedRecord = await savedRows.json() as Array<{ taskObservations: Record<string, string> }>;
  expect(savedRecord[0].taskObservations).toMatchObject({
    "S02.1": "Unsaved checkpoint note stays in the shared record while I switch steps.",
    "S02.2": "The second checkpoint captured its own network test and result.",
  });

  await page.reload();
  await expect(page.locator("#progress-editor-S02").getByLabel("Engineering log")).toHaveValue("Chose a small service boundary and recorded the reason for the trade-off.");
  await page.getByRole("tab", { name: "Review" }).click();
  const review = page.locator(".project-record-review");
  await expect(review).toContainText("In progress");
  await expect(review.getByRole("heading", { name: "Checkpoint evidence" })).toBeVisible();
  await expect(review).toContainText("Chose a small service boundary and recorded the reason for the trade-off.");
  await expect(review).toContainText("The focused test passed; the integration check still needs to run.");
  await expect(review).toContainText("Unsaved checkpoint note stays in the shared record while I switch steps.");
  await expect(review).toContainText("The second checkpoint captured its own network test and result.");
  await review.getByRole("link", { name: "Review checkpoint" }).nth(1).click();
  await page.getByText(/^Checkpoint map/).click();
  await expect(page.getByRole("navigation", { name: "Build checkpoints" }).getByRole("button").nth(1)).toHaveAttribute("aria-current", "step");
  await page.getByRole("tab", { name: "Review" }).click();
  await review.getByRole("link", { name: "Edit in the build notebook" }).click();
  await expect(page.locator("#project-panel-project-build")).toBeVisible();
  await expect(page.locator("#progress-editor-S02").getByLabel("Final verification summary")).toHaveValue("The focused test passed; the integration check still needs to run.");

  await page.goto("/progress");
  await page.getByRole("searchbox", { name: "Search saved learning records" }).fill("The second checkpoint captured its own network test");
  const savedNotebookRecord = page.locator(".progress-record");
  await expect(savedNotebookRecord).toContainText("S02.2 · Implement the layered probes");
  await expect(savedNotebookRecord).toContainText("The second checkpoint captured its own network test and result.");
});

test("edits made during an outstanding project save remain visibly unsaved", async ({ page }) => {
  let requestSaveStarted!: () => void;
  let releaseSave!: () => void;
  const saveStarted = new Promise<void>((resolve) => { requestSaveStarted = resolve; });
  const saveGate = new Promise<void>((resolve) => { releaseSave = resolve; });
  let submittedBody: { record: ProgressInput; expectedRevision: number | null } | undefined;

  await page.route("**/api/progress", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }
    submittedBody = route.request().postDataJSON() as typeof submittedBody;
    requestSaveStarted();
    await saveGate;
    await route.continue();
  });

  await page.goto("/projects/S02#project-build");
  const notebook = page.locator("#progress-editor-S02");
  const note = notebook.getByLabel("Checkpoint note · S02.1");
  await expect(note).toBeEnabled();
  await note.fill("First revision submitted to the server.");
  const firstSave = page.waitForResponse((response) => response.request().method() === "PUT" && response.url().endsWith("/api/progress"));
  await notebook.getByRole("button", { name: "Save project notebook" }).click();
  await saveStarted;
  try {
    await note.fill("Newer revision typed while the first save is pending.");
    expect(submittedBody?.record.taskObservations?.["S02.1"]).toBe("First revision submitted to the server.");
  } finally {
    releaseSave();
  }

  await expect(note).toHaveValue("Newer revision typed while the first save is pending.");
  await expect(notebook.locator(".form-footer .field-hint")).toContainText("Unsaved changes");
  await expect(notebook.locator(".form-message")).toContainText("Newer edits still need saving");
  const firstSaved = await (await firstSave).json() as { revision: number };
  await notebook.getByRole("button", { name: "Save project notebook" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Saved to your account.");
  expect(submittedBody?.expectedRevision).toBe(firstSaved.revision);
  const saved = await page.request.get("/api/progress?itemType=small_project&itemId=S02");
  expect(await saved.json()).toMatchObject([{
    revision: firstSaved.revision + 1,
    taskObservations: { "S02.1": "Newer revision typed while the first save is pending." },
  }]);
});

test("saved progress fields stay unavailable until the existing record finishes loading", async ({ page, request }) => {
  const savedProject = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, {
      ...progressRecord("small_project", "S02", "in_progress", "Existing project-wide note."),
      taskObservations: { "S02.1": "Existing checkpoint evidence must load first." },
    }),
  });
  expect(savedProject.ok()).toBeTruthy();

  let releaseLoad!: () => void;
  let startLoad!: () => void;
  const loadStarted = new Promise<void>((resolve) => { startLoad = resolve; });
  const loadGate = new Promise<void>((resolve) => { releaseLoad = resolve; });
  await page.route("**/api/progress?**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET" || url.searchParams.get("itemId") !== "S02") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    startLoad();
    await loadGate;
    await route.fulfill({ response });
  });

  await page.goto("/projects/S02#project-build");
  const notebook = page.locator("#progress-editor-S02");
  const checkpointNote = notebook.getByLabel("Checkpoint note · S02.1");
  await loadStarted;
  await expect(checkpointNote).toBeDisabled();
  releaseLoad();
  await expect(notebook.getByLabel("Engineering log")).toHaveValue("Existing project-wide note.");
  await expect(checkpointNote).toBeEnabled();
  await expect(checkpointNote).toHaveValue("Existing checkpoint evidence must load first.");
});

test("dirty project notes warn before route navigation and can be kept or discarded deliberately", async ({ page }) => {
  await page.goto("/projects/S02#project-build");
  const note = page.locator("#progress-editor-S02").getByLabel("Checkpoint note · S02.1");
  await expect(note).toBeEnabled();
  const savedNote = await note.inputValue();
  await note.fill("Keep this note if I cancel navigation.");

  let firstDialogType = "";
  page.once("dialog", async (dialog) => {
    firstDialogType = dialog.type();
    await dialog.dismiss();
  });
  await page.getByRole("navigation", { name: "Learning pages" }).getByRole("link", { name: "Activities" }).click();
  expect(firstDialogType).toBe("confirm");
  await expect(page).toHaveURL(/\/projects\/S02/);
  await expect(note).toHaveValue("Keep this note if I cancel navigation.");

  let secondDialogType = "";
  page.once("dialog", async (dialog) => {
    secondDialogType = dialog.type();
    await dialog.accept();
  });
  await page.getByRole("navigation", { name: "Learning pages" }).getByRole("link", { name: "Activities" }).click();
  expect(secondDialogType).toBe("confirm");
  await expect(page).toHaveURL(/\/activities/);

  await page.goto("/projects/S02#project-build");
  await expect(note).toBeEnabled();
  await expect(note).toHaveValue(savedNote);
});

test("dirty project notes warn before a full-page navigation such as refresh", async ({ page }) => {
  await page.goto("/projects/S02#project-build");
  const note = page.locator("#progress-editor-S02").getByLabel("Checkpoint note · S02.1");
  await expect(note).toBeEnabled();
  await note.fill("Keep this note if I cancel a full-page navigation.");

  let dialogType = "";
  const dialogPromise = page.waitForEvent("dialog", { timeout: 5_000 });
  const reload = page.evaluate(() => window.location.reload()).catch(() => undefined);
  const dialog = await dialogPromise;
  dialogType = dialog.type();
  await dialog.dismiss();
  await reload;

  expect(dialogType).toBe("beforeunload");
  await expect(page).toHaveURL(/\/projects\/S02/);
  await expect(note).toHaveValue("Keep this note if I cancel a full-page navigation.");
});

test("unsaved lesson status and investigation notes are protected across the learning journey", async ({ page }) => {
  await page.goto("/modules/01/lessons/m01-l01");
  await page.getByRole("button", { name: "Set draft to complete" }).click();
  let lessonDialogType = "";
  page.once("dialog", async (dialog) => {
    lessonDialogType = dialog.type();
    await dialog.accept();
  });
  await page.getByRole("link", { name: "Fieldnotes DevOps curriculum home" }).click();
  expect(lessonDialogType).toBe("confirm");
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);

  for (const activityId of ["A01", "A02"]) {
    await page.goto(`/activities/${activityId}#activity-perform`);
    const observation = page.getByRole("textbox", { name: "Task observation" });
    const note = `Unsaved ${activityId} investigation evidence.`;
    await expect(observation).toBeVisible();
    await observation.fill(note);

    const stages = page.locator(".activity-workflow-nav a");
    await stages.nth(3).click();
    await expect(page).toHaveURL(new RegExp(`#activity-record$`));
    await stages.nth(2).click();
    await expect(observation).toHaveValue(note);

    let activityDialogType = "";
    page.once("dialog", async (dialog) => {
      activityDialogType = dialog.type();
      await dialog.accept();
    });
    await page.getByRole("link", { name: "Fieldnotes DevOps curriculum home" }).click();
    expect(activityDialogType).toBe("confirm");
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  }
});

test("project cards distinguish saved checkpoint work from an explicitly started project", async ({ page, request }) => {
  const project = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, progressRecord("small_project", "S01", "not_started")),
  });
  expect(project.ok()).toBeTruthy();
  const checkpoint = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, progressRecord("milestone", "S01.1", "completed")),
  });
  expect(checkpoint.ok()).toBeTruthy();

  await page.goto("/projects");
  const card = page.locator('[data-project-id="S01"]');
  await expect(page.getByText("active or saved projects", { exact: true })).toBeVisible();
  await expect(card.locator(".status-pill, .project-state-badge")).toHaveText("Checkpoint progress saved");
  await expect(card).toContainText("1 of 4 checkpoints self-reported");
  const savedProject = await request.get(`${testOrigin}/api/progress?itemType=small_project&itemId=S01`);
  await expect(savedProject).toBeOK();
  expect(await savedProject.json()).toMatchObject([{ status: "not_started" }]);

  await page.goto("/projects/S01#project-review");
  const review = page.locator(".project-record-review");
  await expect(review.locator(".project-record-review-state")).toContainText("Overall project status · self-reported");
  await expect(review.locator(".project-record-review-state")).toContainText("Not started");
  await expect(review).toContainText("S01.1 · Define the event contract and fixtures");
  await expect(review).toContainText("Self-reported complete");
});

test("dashboard resumes a saved project draft at its next unfinished checkpoint", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const savedProject = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, {
      ...progressRecord("small_project", "S01", "not_started"),
      taskObservations: { "S01.1": "The synthetic event contract and expected counts are recorded." },
    }),
  });
  expect(savedProject.ok()).toBeTruthy();

  const firstCheckpoint = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, progressRecord("milestone", "S01.1", "completed")),
  });
  expect(firstCheckpoint.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log explorer" })).toBeVisible();
  const resume = page.locator(".continue-panel").getByRole("link", { name: "Resume project" });
  await expect(resume).toHaveAttribute("href", "/projects/S01#milestone-S01.2");
  await resume.click();
  await expect(page).toHaveURL(/\/projects\/S01#milestone-S01\.2$/);
  await expect(page.locator(".project-active-milestone h3")).toHaveText("Implement parsing, filters, and summaries");
  await page.getByText(/^Checkpoint map/).click();
  await expect(page.getByRole("navigation", { name: "Build checkpoints" }).getByRole("button").nth(1)).toHaveAttribute("aria-current", "step");
  await expect(page.getByLabel("Checkpoint note · S01.2")).toHaveValue("");
  await expect(page.getByLabel("Status")).toHaveValue("not_started");
  const hintList = page.locator(".project-milestone-hints");
  await hintList.locator(":scope > summary").click();
  await hintList.locator(".project-milestone-hint").first().locator("summary").click();
  await expect(hintList.locator(".project-milestone-hint-copy").first()).toContainText("Make the parser accept one line");
  await page.screenshot({ path: path.join(screenshotDirectory, "log-explorer-resume-1440x900.png") });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator(".project-active-milestone")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1920);
  await page.screenshot({ path: path.join(screenshotDirectory, "log-explorer-resume-1920x1080.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const notebookButton = page.getByRole("button", { name: /Open project notebook for this checkpoint/ });
  await notebookButton.click();
  await expect(page.getByRole("dialog", { name: "Project notebook" })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "log-explorer-resume-mobile-390x844.png") });

  await page.goto("/projects");
  const logExplorer = page.locator('[data-project-id="S01"]');
  await expect(logExplorer).toContainText("Checkpoint progress saved");
  const resumeCheckpoint = logExplorer.getByRole("link", { name: "Resume S01.2" });
  await expect(resumeCheckpoint).toHaveAttribute("href", "/projects/S01#milestone-S01.2");
  await resumeCheckpoint.click();
  await expect(page).toHaveURL(/\/projects\/S01#milestone-S01\.2$/);
  await expect(page.locator(".project-active-milestone h3")).toHaveText("Implement parsing, filters, and summaries");

  const reviewState = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, {
      ...progressRecord("small_project", "S01", "needs_review"),
      taskObservations: { "S01.1": "The synthetic event contract and expected counts are recorded." },
    }),
  });
  expect(reviewState.ok()).toBeTruthy();
  await page.goto("/");
  const reviewProject = page.locator(".continue-panel").getByRole("link", { name: "Review project" });
  await expect(reviewProject).toHaveAttribute("href", "/projects/S01#project-review");
  await reviewProject.click();
  await expect(page.locator(".project-workflow-nav").getByRole("tab", { name: "Review" })).toHaveAttribute("aria-selected", "true");

  await page.goto("/projects");
  const reviewHandoff = page.locator('[data-project-id="S01"] .small-tool-footer').getByRole("link", { name: "Review handoff" });
  await expect(reviewHandoff).toHaveAttribute("href", "/projects/S01#project-review");
});

test("mobile project notebook opens as an accessible drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects/S03");
  await expect(page.getByRole("button", { name: /Open project notebook/ })).toBeHidden();
  await page.locator(".project-workflow-nav").getByRole("tab", { name: "Build" }).click();
  const openNotebook = page.getByRole("button", { name: /Open project notebook for this checkpoint/ });
  await expect(openNotebook).toBeVisible();
  await expect(page.locator(".project-notebook-content")).toBeHidden();
  await expect(page.locator(".project-notebook-mobile-head")).toBeHidden();
  expect(await openNotebook.evaluate((button) => button.getBoundingClientRect().width)).toBeGreaterThan(300);
  const triggerPosition = await openNotebook.boundingBox();
  const taskPosition = await page.locator(".project-active-milestone-guidance").boundingBox();
  expect(triggerPosition && taskPosition && triggerPosition.y).toBeGreaterThanOrEqual((taskPosition?.y ?? 0) + (taskPosition?.height ?? 0));
  await openNotebook.click();
  const dialog = page.getByRole("dialog", { name: "Project notebook" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".project-notebook-mobile-head")).toBeVisible();
  await expect(dialog.locator(".project-notebook-content")).toBeVisible();
  await expect(dialog.getByLabel("Checkpoint note · S03.1")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(openNotebook).toBeFocused();
  await page.locator(".project-workflow-nav").getByRole("tab", { name: "Review" }).click();
  await expect(openNotebook).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
});

test("resource library searches PDFs, official documentation, and glossary terms", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/resources");
  const search = page.getByRole("searchbox", { name: "Search library, documentation, or glossary terms" });
  await expect(search).toBeVisible();
  await expect(page.getByRole("link", { name: "Source PDFs", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source PDFs 8", exact: true })).toBeVisible();
  await search.fill("Docker");
  await expect(page.getByText(/matching resources/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Source PDFs/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Official references/ })).toBeVisible();
  await expect(page.locator(".glossary-term").filter({ hasText: "Docker Compose" })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "resources-search-docker-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "resources-tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "resources-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "resources-small-mobile.png"), fullPage: true });

  await search.fill("no resource has this name");
  await expect(page.getByRole("status").filter({ hasText: "0 matching resources" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /No resources match/ })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("heading", { name: /^Source PDFs/ })).toBeVisible();
});

test("career priorities link to the related roadmap, practice, and project work", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.getByRole("heading", { name: "Flexible preparation priorities" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Module 03/ }).first()).toHaveAttribute("href", "/modules/03");
  await expect(page.getByRole("link", { name: /T03/ }).first()).toHaveAttribute("href", "/activities#troubleshooting-t03");
  await expect(page.getByRole("link", { name: /P3/ }).first()).toHaveAttribute("href", "/projects/P3");
});

test("activity brief and source PDFs are available", async ({ page }) => {
  await page.goto("/activities/A02");
  const prerequisite = page.locator(".activity-a01-prerequisite");
  const bashReference = prerequisite.getByRole("link", { name: "GNU Bash pipelines" });
  await expect(bashReference).toHaveAttribute("href", "https://www.gnu.org/software/bash/manual/html_node/Pipelines.html");
  await expect(prerequisite).not.toContainText("https://");

  await page.goto("/activities/A08");
  await expect(page.getByRole("heading", { level: 1, name: "Container fundamentals with Docker" })).toBeVisible();
  await page.getByText("Scenario and learning objectives", { exact: true }).click();
  await expect(page.getByText(/Build the A05 Status API image/)).toBeVisible();
  await expect(page.locator(".activity-resource-links")).toHaveCount(0);
  const response = await page.request.get("/library/04_Activities_and_Practice.pdf");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("Module 23 recovery lesson renders its knowledge check and A23 practice evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/modules/23/lessons/m23-l03");
  await expect(page.getByRole("heading", { level: 1, name: "Restore into isolation and verify recovery" })).toBeVisible();
  await expect(page.locator(".learning-lesson-reading .module-lesson")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Triage incidents and preserve useful evidence" })).toHaveAttribute("href", "/modules/23/lessons/m23-l01");
  await expect(page.locator(".learning-figure")).toHaveCount(1);
  for (const figure of await page.locator(".learning-figure img").all()) {
    await expect.poll(() => figure.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }

  const knowledgeCheck = page.locator('[data-knowledge-check="module-23-recovery-check"]');
  await expect(knowledgeCheck.getByRole("heading", { name: "Check your recovery reasoning" })).toBeVisible();
  await expect(knowledgeCheck.getByRole("button", { name: "Check answer" })).toBeDisabled();
  await knowledgeCheck.getByRole("radio").nth(0).check();
  await knowledgeCheck.getByRole("button", { name: "Check answer" }).click();
  await expect(knowledgeCheck.getByText("That is correct.")).toBeVisible();
  await knowledgeCheck.getByRole("button", { name: "Next question" }).click();
  await expect(knowledgeCheck.locator("legend")).toBeFocused();
  await knowledgeCheck.getByRole("radio").nth(0).check();
  await knowledgeCheck.getByRole("button", { name: "Check answer" }).click();
  await expect(knowledgeCheck.getByText(/Review the distinction/)).toBeVisible();
  await knowledgeCheck.getByRole("button", { name: "Next question" }).click();
  await expect(knowledgeCheck.locator("legend")).toBeFocused();
  await knowledgeCheck.getByRole("radio").nth(2).check();
  await knowledgeCheck.getByRole("button", { name: "Check answer" }).click();
  await knowledgeCheck.getByRole("button", { name: "See result" }).click();
  await expect(knowledgeCheck.getByText("2 of 3 correct")).toBeVisible();
  await expect(knowledgeCheck.getByRole("heading", { name: "2 of 3 correct" })).toBeFocused();
  await knowledgeCheck.getByRole("button", { name: "Try again" }).click();
  await expect(knowledgeCheck.getByText("Question 1 of 3")).toBeVisible();
  await expect(knowledgeCheck.locator("legend")).toBeFocused();

  const lessonScreenshots = [
    { width: 1920, height: 1080, name: "1920" },
    { width: 1440, height: 900, name: "1440" },
    { width: 1100, height: 900, name: "1100" },
    { width: 768, height: 1024, name: "768" },
    { width: 390, height: 844, name: "390" },
    { width: 320, height: 780, name: "320" },
  ];
  for (const viewport of lessonScreenshots) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    if (viewport.width <= 860) {
      await page.waitForFunction(() => {
        const sidebar = document.querySelector<HTMLElement>(".sidebar");
        return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
      });
    }
    const { documentWidth, viewportWidth } = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(documentWidth, `Module 23 lesson at ${viewport.width}px must not overflow`).toBeLessThanOrEqual(viewportWidth);
    await page.screenshot({ path: path.join(screenshotDirectory, `lesson-23-03-${viewport.name}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/activities/A23");
  await expect(page.getByRole("heading", { level: 1, name: "Recovery drill: restore and verify synthetic data" })).toBeVisible();
  await expect(page.locator("#activity-steps ol > li")).toHaveCount(5);
  await expect(page.getByText(/Do not stop or modify Fieldnotes, Docker Compose/)).toBeVisible();
  await expect(page.getByText(/database-only drill/).first()).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a23-1440.png"), fullPage: true });
  for (const viewport of [{ width: 390, height: 844, name: "390" }, { width: 320, height: 780, name: "320" }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForFunction(() => {
      const sidebar = document.querySelector<HTMLElement>(".sidebar");
      return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
    });
    const { documentWidth, viewportWidth } = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(documentWidth, `Activity A23 at ${viewport.width}px must not overflow`).toBeLessThanOrEqual(viewportWidth);
    await page.screenshot({ path: path.join(screenshotDirectory, `activity-a23-${viewport.name}.png`), fullPage: true });
  }
});

test("module learning flow links directly to practice and readable activity evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/modules/01");
  await expect(page.getByRole("heading", { level: 1, name: /Module 01.*How computers and operating systems work/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Module contents" }).first()).toBeVisible();
  await expect(page.locator(".module-outline-list a[href='/modules/01/lessons/m01-l02']")).toContainText("Processes and threads");
  await expect(page.locator(".module-lesson, .learning-figure")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start with Lesson 01.1" })).toHaveAttribute("href", "/modules/01/lessons/m01-l01");
  await expect(page.getByRole("link", { name: "Return to Lesson 01.1" })).toHaveAttribute("href", "/modules/01/lessons/m01-l01");
  await expect(page.getByRole("link", { name: "Continue to Module 02" })).toHaveAttribute("href", "/modules/02");
  await expect(page.locator(".module-common-mistakes .practice-safety-note")).toContainText("Use a disposable lab");
  await expect(page.getByRole("link", { name: "Open source PDF" })).toHaveCount(1);
  await page.screenshot({ path: path.join(screenshotDirectory, "module-01-desktop.png"), fullPage: true });

  const figureLessons = [
    { id: "m01-l01", title: "From program to process", number: 1, alt: /process lifecycle/i },
    { id: "m01-l02", title: "Processes and threads", number: 2, alt: /single-threaded process/i },
    { id: "m01-l03", title: "User space and the kernel", number: 3, alt: /three system layers/i },
    { id: "m01-l04", title: "Memory, storage, and failures", number: 4, alt: /virtual address space/i },
    { id: "m01-l06", title: "Virtual machines and containers", number: 5, alt: /guest operating systems above a hypervisor/i },
  ];
  const figureNumbers: string[] = [];
  for (const lesson of figureLessons) {
    await page.goto(`/modules/01/lessons/${lesson.id}`);
    await expect(page.getByRole("heading", { level: 1, name: lesson.title })).toBeVisible();
    await expect(page.locator(".learning-lesson-reading .learning-figure")).toHaveCount(1);
    const figure = page.locator(".learning-lesson-reading .learning-figure");
    await figure.scrollIntoViewIfNeeded();
    await expect.poll(() => figure.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(figure.getByRole("img")).toHaveAttribute("alt", lesson.alt);
    const caption = figure.locator(".learning-figure-caption-text");
    await expect(caption).toContainText(`Figure ${lesson.number}.`);
    figureNumbers.push((await caption.textContent()) ?? "");
    await expect(figure.locator(".learning-figure-attribution a")).toHaveCount(2);
    await expect(figure.locator(".learning-figure-attribution a").first()).toHaveAttribute("href", /^https:\/\//);
    await expect(figure.locator(".learning-figure-attribution a").nth(1)).toHaveAttribute("href", /^https:\/\//);
  }
  expect(figureNumbers.map((caption) => caption.match(/Figure (\d+)\./)?.[1])).toEqual(["1", "2", "3", "4", "5"]);
  const vmDiagram = page.locator('.learning-figure:has(img[src="/diagrams/module01/vm-vs-container-wikimedia.jpg"])');
  await expect(vmDiagram.getByRole("img")).toHaveAttribute("alt", /guest operating systems above a hypervisor/i);
  const vmDiagramResponse = await page.request.get("/diagrams/module01/vm-vs-container-wikimedia.jpg");
  expect(vmDiagramResponse.ok()).toBeTruthy();
  expect(vmDiagramResponse.headers()["content-type"]).toContain("image/jpeg");

  await page.goto("/modules/01");
  const technicalReferences = page.locator(".module-references");
  await technicalReferences.locator("summary").click();
  await expect(technicalReferences.getByRole("link", { name: "Browse the resource library" })).toHaveAttribute("href", "/resources#official-references");
  await expect(page.getByText("Matching practice", { exact: false })).toHaveCount(0);
  const recordBeforeContinuation = await page.evaluate(() => {
    const record = document.querySelector(".module-overview-progress");
    const continuation = document.querySelector(".module-pagination");
    return Boolean(record && continuation
      && (record.compareDocumentPosition(continuation) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(recordBeforeContinuation).toBe(true);

  const recallPrompt = page.locator(".recall-prompt");
  await expect(recallPrompt).toHaveJSProperty("open", false);
  await page.locator(".recall-prompt > summary").click();
  await expect(recallPrompt.locator(".recall-prompt-content > h3").first()).toContainText("waiting for a file read");
  const modelExplanation = recallPrompt.locator(".recall-answer");
  await expect(modelExplanation).toHaveJSProperty("open", false);
  await page.locator(".recall-answer > summary").click();
  await expect(modelExplanation).toContainText("The kernel checks the request");
  await expect(page.locator("#progress-editor-M01")).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
  await expect(page.getByLabel(/Reflection/)).toBeVisible();
  await expect(page.getByLabel("How independently can you do this?")).toHaveCount(0);
  await expect(page.getByLabel("Evidence or verification")).toHaveCount(0);
  const moduleTextareaHeight = await page.getByLabel(/Reflection/).evaluate((element) => element.getBoundingClientRect().height);
  expect(moduleTextareaHeight).toBeGreaterThanOrEqual(90);
  await modelExplanation.locator("summary").click();
  await recallPrompt.locator(":scope > summary").click();
  await technicalReferences.locator("summary").click();
  await page.locator("#progress-editor-M01").scrollIntoViewIfNeeded();
  await expect(page.locator("#progress-editor-M01")).toBeInViewport();
  await page.locator(".module-activity-overview").scrollIntoViewIfNeeded();
  await expect(page.locator(".module-activity-overview").getByRole("link", { name: "Prepare and open Activity A01" })).toHaveAttribute("href", "/activities/A01");
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "module-01-tablet.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "module-01-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "module-01-small-mobile.png"), fullPage: true });

  });

test("other activities link each practical step to one shared saved notebook", async ({ page, request }) => {
  const legacyA02 = await request.put(testOrigin + "/api/progress", {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, {
      itemType: "activity",
      itemId: "A02",
      status: "in_progress",
      comfort: "guided",
      notes: "Earlier A02 reflection remains unassigned.",
      evidence: "Earlier inventory evidence remains attached.",
      repositoryUrl: "https://example.test/a02-notes",
    }),
  });
  expect(legacyA02.ok()).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/activities/A02");
  await expect(page.getByRole("heading", { level: 1, name: "Linux command line and filesystems" })).toBeVisible();
  const steps = page.locator("#activity-steps [data-task-id]");
  const notebook = page.locator(".activity-a01-notebook");
  const observation = page.getByRole("textbox", { name: "Task observation" });
  const review = page.locator("#activity-record");
  await expect(steps).toHaveCount(7);
  await expect(notebook).toBeVisible();
  await expect(observation).toBeVisible();
  await expect(steps.nth(0)).toHaveAttribute("data-task-id", "a02-predict-the-inventory");
  await expect(steps.nth(0)).toContainText("Predict the inventory");
  await expect(steps.nth(1)).toContainText("Create a bounded fixture");
  await expect(page.getByRole("button", { name: /Earlier saved note/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review the work you recorded" })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a02-1440-top.png") });
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a02-1440-full.png"), fullPage: true });

  const layout = await page.evaluate(() => {
    const instructions = document.querySelector(".activity-a01-instructions")!.getBoundingClientRect();
    const notebookPanel = document.querySelector(".activity-a01-notebook-panel")!.getBoundingClientRect();
    return { instructionWidth: instructions.width, notebookWidth: notebookPanel.width, gap: notebookPanel.left - instructions.right };
  });
  expect(layout.instructionWidth).toBeGreaterThan(500);
  expect(layout.notebookWidth).toBeGreaterThanOrEqual(340);
  expect(layout.gap).toBeGreaterThan(0);
  expect(layout.gap).toBeLessThan(60);

  await observation.fill("Prediction: three files; the empty file should be zero bytes.");
  await steps.nth(1).getByRole("button", { name: "Record Task 2 in the investigation notebook" }).click();
  await expect(observation).toBeFocused();
  await observation.fill("Created two text files, one empty file, and one nested directory in a fresh temporary folder.");
  await notebook.getByRole("button", { name: /Predict the inventory/ }).click();
  await expect(observation).toHaveValue("Prediction: three files; the empty file should be zero bytes.");
  await steps.nth(2).getByRole("button", { name: "Record Task 3 in the investigation notebook" }).click();
  await expect(notebook.getByRole("button", { name: /Build the inventory/ })).toHaveAttribute("aria-pressed", "true");
  await observation.fill("The sorted report listed three files with relative paths, file type, byte size, and owner.");
  await notebook.getByRole("button", { name: /Earlier saved note/ }).click();
  await expect(page.getByLabel("Earlier notes")).toHaveValue("Earlier A02 reflection remains unassigned.");
  await expect(page.getByLabel("Earlier evidence")).toHaveValue("Earlier inventory evidence remains attached.");
  await expect(page.getByLabel("Earlier reference link")).toHaveValue("https://example.test/a02-notes");

  await steps.nth(2).getByRole("button", { name: "Record Task 3 in the investigation notebook" }).click();
  await notebook.getByRole("button", { name: "Save observations" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Draft saved to your account.");
  type ActivityRows = Array<{ status: string; notes: string; evidence: string; repositoryUrl: string; taskObservations: Record<string, string> }>;
  let rows = await (await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A02")).json() as ActivityRows;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    status: "in_progress",
    notes: "Earlier A02 reflection remains unassigned.",
    evidence: "Earlier inventory evidence remains attached.",
    repositoryUrl: "https://example.test/a02-notes",
    taskObservations: {
      "a02-predict-the-inventory": "Prediction: three files; the empty file should be zero bytes.",
      "a02-create-a-bounded-fixture": "Created two text files, one empty file, and one nested directory in a fresh temporary folder.",
      "a02-build-the-inventory": "The sorted report listed three files with relative paths, file type, byte size, and owner.",
    },
  });

  await page.reload();
  await expect(observation).toHaveValue("Prediction: three files; the empty file should be zero bytes.");
  await steps.nth(2).getByRole("button", { name: "Record Task 3 in the investigation notebook" }).click();
  await expect(observation).toHaveValue("The sorted report listed three files with relative paths, file type, byte size, and owner.");
  await page.locator(".activity-workflow-nav a").nth(3).click();
  await expect(review.locator(".activity-a01-review-task[data-task-id]")).toHaveCount(7);
  await expect(review.locator(".activity-a01-review-task--legacy")).toHaveCount(1);
  await expect(review).toContainText("Prediction: three files; the empty file should be zero bytes.");
  await expect(review).toContainText("Earlier A02 reflection remains unassigned.");
  await expect(review.getByRole("button", { name: "Edit Task 3" })).toBeVisible();
  await review.getByRole("button", { name: "Edit Task 3" }).click();
  await expect(observation).toBeFocused();
  await expect(observation).toHaveValue("The sorted report listed three files with relative paths, file type, byte size, and owner.");
  await observation.fill("Refined: sorted rows show the expected paths and metadata; the empty fixture has zero bytes.");
  await notebook.getByRole("button", { name: "Save observations" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Draft saved to your account.");
  await page.locator(".activity-workflow-nav a").nth(3).click();
  await expect(review).toContainText("Refined: sorted rows show the expected paths and metadata");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("3 of 7 tasks");
    await dialog.dismiss();
  });
  await review.getByRole("button", { name: "Mark activity complete" }).click();
  await expect(review.locator(".activity-a01-status")).toHaveText("In progress");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("3 of 7 tasks");
    expect(dialog.message()).toContain("self-report");
    await dialog.accept();
  });
  await review.getByRole("button", { name: "Mark activity complete" }).click();
  await expect(review.locator(".activity-a01-status")).toHaveText("Completed");
  rows = await (await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A02")).json() as ActivityRows;
  expect(rows[0].status).toBe("completed");
  expect(rows[0].taskObservations["a02-build-the-inventory"]).toContain("Refined:");

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/activities/A02");
  await expect(notebook).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a02-1920-top.png") });
  await page.locator(".activity-a01-workspace").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a02-1920-workspace.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/activities/A02");
  const mobileStep = page.locator("#activity-steps [data-task-id]").nth(2);
  await mobileStep.getByRole("button", { name: "Record Task 3 in the investigation notebook" }).click();
  await expect(page.locator(".activity-a01-notebook--open")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Task observation" })).toHaveValue("Refined: sorted rows show the expected paths and metadata; the empty fixture has zero bytes.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a02-mobile-viewport.png") });
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a02-mobile-notebook.png"), fullPage: true });
  await page.getByRole("button", { name: "Close notebook" }).click();
  await expect(page.locator(".activity-a01-notebook--closed")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("A01 keeps task observations in one notebook through save, review, and reopen", async ({ page, request }) => {
  const legacyA01 = await request.put(testOrigin + "/api/progress", {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, {
      itemType: "activity",
      itemId: "A01",
      status: "in_progress",
      comfort: "familiar",
      notes: "Previously saved A01 finding from the existing notebook.",
      evidence: "Earlier sanitized ps and /proc evidence.",
      repositoryUrl: "https://example.test/a01-notes",
    }),
  });
  expect(legacyA01.ok()).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/activities/A01");
  await expect(page.getByRole("heading", { level: 1, name: "Investigate a running Linux process" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review the observations you recorded" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Begin investigation" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Review findings" })).toHaveCount(0);
  await expect(page.locator(".activity-header-tools")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Review Module 01 · How computers and operating systems work/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Activity reference PDF" })).toHaveCount(0);
  await expect(page.locator(".activity-a01-start-panel")).toHaveCount(0);
  const workflowNav = page.locator(".activity-workflow-nav a");
  await expect(workflowNav).toHaveCount(4);
  await expect(workflowNav.nth(1)).toHaveAttribute("href", "#activity-prepare");
  await expect(workflowNav.nth(3)).toHaveAttribute("href", "#activity-record");
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-start-1440x900.png") });
  await workflowNav.nth(1).click();
  await expect(page).toHaveURL(/#activity-prepare$/);
  await expect(page.locator("#activity-prepare")).toBeInViewport();
  await workflowNav.nth(3).click();
  await expect(page).toHaveURL(/#activity-record$/);
  await expect(page.locator("#activity-record")).toBeInViewport();
  await workflowNav.nth(2).click();
  await expect(page).toHaveURL(/#activity-perform$/);
  const steps = page.locator("#activity-steps [data-task-id]");
  const review = page.locator("#activity-record");
  await expect(steps).toHaveCount(5);
  await expect(steps.nth(0)).toHaveAttribute("data-task-id", "confirm-account");
  await expect(steps.nth(1)).toHaveAttribute("data-task-id", "choose-process");
  await expect(steps.nth(2)).toHaveAttribute("data-task-id", "compare-proc");
  await expect(review.locator(".activity-a01-review-task[data-task-id]")).toHaveCount(0);
  await expect(review.getByText("No task notes yet.")).toBeVisible();
  await expect(review.getByRole("button", { name: "Open Task 1 · Confirm your account" })).toBeVisible();
  await expect(steps.nth(1)).toContainText("Before looking at the rows, predict");
  await expect(steps.nth(2)).toContainText("Compare that PID with");
  await expect(steps.nth(2)).toContainText("which fields agreed, changed, or were unavailable");
  await expect(steps.nth(2)).toContainText("descriptor's role or resource type");
  const task3Help = page.locator("#activity-steps [data-task-id=compare-proc] .activity-task-help");
  await expect(task3Help.locator("summary")).toHaveText("Command notes and troubleshooting");
  await expect(task3Help).not.toHaveAttribute("open", "");
  await task3Help.locator("summary").click();
  await expect(task3Help).toContainText("commands take separate snapshots");
  await expect(task3Help).toContainText("If your result differs");
  await expect(page.getByRole("link", { name: "Processes and threads in Module 01" })).toHaveAttribute("href", "/modules/01/lessons/m01-l02");
  await expect(page.locator("#activity-steps [data-task-id=explain-boundary]")).toContainText("No new command is needed");
  await expect(page.locator("#activity-steps")).toContainText("A01 does not trace that path");
  const relatedConcept = page.locator(".activity-a01-instructions .module-diagram img");
  await relatedConcept.scrollIntoViewIfNeeded();
  await expect(relatedConcept).toHaveCount(1);
  await expect.poll(() => relatedConcept.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  const notebook = page.locator(".activity-a01-notebook");
  const editor = page.locator("#progress-editor-A01");
  const taskObservation = page.getByRole("textbox", { name: "Task observation" });
  await expect(taskObservation).toBeVisible();
  await expect(taskObservation).toHaveAttribute("placeholder", "Record a short, sanitized observation and what it supports.");
  await expect(page.getByRole("button", { name: /Earlier unassigned note/ })).toBeVisible();
  await page.getByRole("button", { name: /Earlier unassigned note/ }).click();
  await expect(page.getByLabel("Earlier notes")).toHaveValue("Previously saved A01 finding from the existing notebook.");
  await expect(page.getByLabel("Earlier evidence")).toHaveValue("Earlier sanitized ps and /proc evidence.");
  await notebook.getByRole("button", { name: /Confirm your account/ }).click();
  await expect(page.getByRole("button", { name: /Editing · not recorded/ })).toHaveAttribute("aria-pressed", "true");
  await taskObservation.fill("The numeric UID was 1000; I omitted the account name from my notes.");

  const desktopLayout = await page.evaluate(() => {
    const instructions = document.querySelector(".activity-a01-instructions")!.getBoundingClientRect();
    const notebookPanel = document.querySelector(".activity-a01-notebook-panel")!.getBoundingClientRect();
    return { instructionWidth: instructions.width, notebookWidth: notebookPanel.width, gap: notebookPanel.left - instructions.right };
  });
  expect(desktopLayout.instructionWidth).toBeGreaterThan(500);
  expect(desktopLayout.notebookWidth).toBeGreaterThanOrEqual(350);
  expect(desktopLayout.gap).toBeGreaterThan(0);
  expect(desktopLayout.gap).toBeLessThan(60);

  const thirdTask = page.locator("#activity-steps [data-task-id=compare-proc]");
  const secondTask = page.locator("#activity-steps [data-task-id=choose-process]");
  const firstTask = page.locator("#activity-steps [data-task-id=confirm-account]");
  await thirdTask.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 110, behavior: "instant" }));
  await expect(notebook).toBeInViewport();
  await expect(page.locator(".activity-a01-visible-task")).toContainText("Reading Task 3");
  await expect(page.locator(".activity-a01-visible-task")).toContainText("Editing Task 1");
  await expect(page.getByRole("button", { name: /Confirm your account/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".activity-a01-visible-task button")).toHaveText("Edit Task 3");
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-1440.png") });
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-1440-full.png"), fullPage: true });

  const recordTask3 = thirdTask.getByRole("button", { name: "Record Task 3 in the investigation notebook" });
  await recordTask3.focus();
  await expect(recordTask3).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(notebook.getByRole("button", { name: /Compare the process with \/proc/ })).toHaveAttribute("aria-pressed", "true");
  await expect(taskObservation).toBeFocused();
  await taskObservation.fill("The PID and effective UID matched. VmRSS differed slightly, and descriptor 0 was standard input.");

  await secondTask.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 110, behavior: "instant" }));
  await expect(page.locator(".activity-a01-visible-task")).toContainText("Reading Task 2");
  await expect(page.locator(".activity-a01-visible-task")).toContainText("Editing Task 3");
  await expect(notebook.getByRole("button", { name: /Compare the process with \/proc/ })).toHaveAttribute("aria-pressed", "true");
  await secondTask.getByRole("button", { name: "Record Task 2 in the investigation notebook" }).click();
  await expect(notebook.getByRole("button", { name: /Choose a process you own/ })).toHaveAttribute("aria-pressed", "true");
  await taskObservation.fill("Prediction: RSS may change between snapshots. The PID and parent stayed stable while RSS changed slightly.");

  await thirdTask.getByRole("button", { name: "Record Task 3 in the investigation notebook" }).click();
  await expect(taskObservation).toHaveValue("The PID and effective UID matched. VmRSS differed slightly, and descriptor 0 was standard input.");
  await firstTask.getByRole("button", { name: "Record Task 1 in the investigation notebook" }).click();
  await expect(taskObservation).toHaveValue("The numeric UID was 1000; I omitted the account name from my notes.");

  await page.route("**/api/progress", async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Simulated save failure." }) });
      return;
    }
    await route.continue();
  });
  await notebook.getByRole("button", { name: "Save observations" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Simulated save failure.");
  await expect(taskObservation).toHaveValue("The numeric UID was 1000; I omitted the account name from my notes.");
  await page.unroute("**/api/progress");

  await notebook.getByRole("button", { name: "Save observations" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Draft saved to your account.");
  const firstSave = await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A01");
  const firstRows = await firstSave.json() as Array<{ status: string; notes: string; evidence: string; repositoryUrl: string; taskObservations: Record<string, string> }>;
  expect(firstRows).toHaveLength(1);
  expect(firstRows[0]).toMatchObject({
    status: "in_progress",
    notes: "Previously saved A01 finding from the existing notebook.",
    evidence: "Earlier sanitized ps and /proc evidence.",
    repositoryUrl: "https://example.test/a01-notes",
    taskObservations: {
      "confirm-account": "The numeric UID was 1000; I omitted the account name from my notes.",
      "choose-process": "Prediction: RSS may change between snapshots. The PID and parent stayed stable while RSS changed slightly.",
      "compare-proc": "The PID and effective UID matched. VmRSS differed slightly, and descriptor 0 was standard input.",
    },
  });

  await page.reload();
  await expect(taskObservation).toHaveValue("The numeric UID was 1000; I omitted the account name from my notes.");
  await thirdTask.getByRole("button", { name: "Record Task 3 in the investigation notebook" }).click();
  await expect(taskObservation).toHaveValue("The PID and effective UID matched. VmRSS differed slightly, and descriptor 0 was standard input.");
  await notebook.getByRole("button", { name: /Choose a process you own/ }).click();
  await expect(taskObservation).toHaveValue("Prediction: RSS may change between snapshots. The PID and parent stayed stable while RSS changed slightly.");
  await expect(page.getByText("3 of 5 tasks have notes in this investigation.", { exact: false })).toBeVisible();

  await page.locator(".activity-workflow-nav a").nth(3).click();
  await expect(review).toBeInViewport();
  await expect(review.locator(".activity-a01-transfer-prompt")).toContainText("what would you check next");
  await expect(review).toContainText("Fieldnotes does not inspect your VM or verify command output");
  await expect(review.locator(".activity-a01-review-record")).toContainText("The PID and effective UID matched.");
  await expect(review.locator(".activity-a01-review-record")).toContainText("Prediction: RSS may change");
  await expect(review.locator(".activity-a01-review-task[data-task-id]")).toHaveCount(3);
  await expect(review.locator(".activity-a01-review-task[data-task-id=check-systemd]")).toHaveCount(0);
  await expect(review.getByRole("button", { name: "Record Task 4 · Check its systemd unit" })).toBeVisible();
  await expect(review.locator("textarea")).toHaveCount(0);
  await expect(review.getByRole("button", { name: "Edit Task 3" })).toBeVisible();
  await review.getByRole("button", { name: "Edit Task 3" }).click();
  await expect(editor).toBeInViewport();
  await expect(notebook.getByRole("button", { name: /Compare the process with \/proc/ })).toHaveAttribute("aria-pressed", "true");
  await expect(taskObservation).toBeFocused();

  await taskObservation.fill("Refined: the PID and IDs agreed; the small RSS difference is consistent with a changing point-in-time estimate.");
  await notebook.getByRole("button", { name: "Save observations" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Draft saved to your account.");
  await page.locator(".activity-workflow-nav a").nth(3).click();
  await expect(review.locator(".activity-a01-review-record")).toContainText("Refined: the PID and IDs agreed");

  await review.getByLabel(/How independently did this work feel/).selectOption("guided");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("3 of 5 tasks");
    expect(dialog.message()).toContain("You can still mark A01 complete now.");
    await dialog.dismiss();
  });
  await review.getByRole("button", { name: "Mark activity complete" }).click();
  await expect(review.locator(".activity-a01-status")).toHaveText("In progress");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("3 of 5 tasks");
    await dialog.accept();
  });
  await review.getByRole("button", { name: "Mark activity complete" }).click();
  await expect(review.locator(".activity-a01-status")).toHaveText("Completed");
  type A01Rows = Array<{ status: string; updatedAt: number; taskObservations: Record<string, string> }>;
  let currentRows = await (await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A01")).json() as A01Rows;
  expect(currentRows).toHaveLength(1);
  expect(currentRows[0].status).toBe("completed");
  expect(currentRows[0].taskObservations["choose-process"]).toContain("Prediction:");

  await review.getByRole("button", { name: "Edit Task 2" }).click();
  await expect(notebook.getByRole("button", { name: /Choose a process you own/ })).toHaveAttribute("aria-pressed", "true");
  await taskObservation.fill("Revised after review: RSS can change between snapshots; PID and parent remained stable.");
  await notebook.getByRole("button", { name: "Save observations" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Draft saved to your account. The activity remains marked complete.");
  await page.locator(".activity-workflow-nav a").nth(3).click();
  await expect(review.locator(".activity-a01-status")).toHaveText("Completed");
  currentRows = await (await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A01")).json() as Array<{ status: string; taskObservations: Record<string, string> }>;
  expect(currentRows[0].status).toBe("completed");
  expect(currentRows[0].taskObservations["choose-process"]).toContain("Revised after review:");

  await review.getByRole("button", { name: "Reopen as in progress" }).click();
  await expect(review.locator(".activity-a01-status")).toHaveText("In progress");
  currentRows = await (await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A01")).json() as A01Rows;
  expect(currentRows[0].status).toBe("in_progress");

  const legacyImport = await request.post(testOrigin + "/api/progress", {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: {
      version: 2,
      exportedAt: new Date().toISOString(),
      records: [{
        itemType: "activity",
        itemId: "A01",
        status: "in_progress",
        comfort: "guided",
        notes: "Imported older A01 note.",
        evidence: "Imported earlier evidence.",
        repositoryUrl: "",
        updatedAt: currentRows[0].updatedAt - 1,
      }],
    },
  });
  expect(legacyImport.ok()).toBeTruthy();
  expect(await legacyImport.json()).toMatchObject({ preservedCount: 1 });
  currentRows = await (await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A01")).json() as A01Rows;
  expect(currentRows).toHaveLength(1);
  expect(currentRows[0].taskObservations["choose-process"]).toContain("Revised after review:");
  expect(currentRows[0].taskObservations["compare-proc"]).toContain("Refined:");

  await page.goto("/progress");
  await expect(page.getByText("Revised after review: RSS can change between snapshots", { exact: false })).toBeVisible();
  await expect(page.getByText("Previously saved A01 finding from the existing notebook.")).toBeVisible();
  await expect(page.getByText("Imported older A01 note.")).toHaveCount(0);
  const a01BackupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const a01BackupPath = await (await a01BackupDownload).path();
  expect(a01BackupPath).toBeTruthy();
  const a01Backup = JSON.parse(await (await import("node:fs/promises")).readFile(a01BackupPath!, "utf8")) as { version: number; records: Array<{ itemId: string; taskObservations?: Record<string, string> }> };
  expect(a01Backup.version).toBe(3);
  expect(a01Backup.records.find((entry) => entry.itemId === "A01")?.taskObservations?.["choose-process"]).toContain("Revised after review:");

  await page.goto("/activities/A01");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-start-1920x1080.png") });
  await page.locator(".activity-workflow-nav a").nth(2).click();
  await page.locator(".activity-a01-workspace").scrollIntoViewIfNeeded();
  await expect(page.locator(".activity-a01-workspace")).toBeInViewport();
  await expect(page.getByRole("button", { name: /Earlier unassigned note/ })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-1920.png") });
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-1920-full.png"), fullPage: true });

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator(".activity-a01-workspace").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await expect(page.locator(".activity-a01-notebook-panel")).toBeInViewport();
  await expect(notebook.getByRole("button", { name: "Save observations" })).toBeInViewport();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-1366x768.png") });

  // A 720px CSS viewport approximates the effective width of a 1440px desktop at 200% zoom.
  for (const viewport of [
    { width: 768, height: 1024, name: "768" },
    { width: 720, height: 450, name: "zoom-200" },
    { width: 390, height: 844, name: "390" },
    { width: 320, height: 780, name: "320" },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
    await expect(page.locator(".activity-header-tools")).toHaveCount(0);
    await page.getByRole("button", { name: /Open investigation notebook/ }).click();
    await expect(taskObservation).toBeVisible();
    const mobileTaskPicker = page.locator(".activity-a01-task-picker-mobile");
    await expect(mobileTaskPicker).toBeVisible();
    await mobileTaskPicker.locator("select").selectOption("explain-boundary");
    await expect(taskObservation).toBeFocused();
    await expect(mobileTaskPicker).toContainText("Editing Task 5 of 5 · Explain what the evidence supports");
    await expect(notebook.getByRole("button", { name: "Save observations" })).toBeVisible();
    await expect(mobileTaskPicker).toBeInViewport();
    await expect.poll(() => taskObservation.evaluate((element) => {
      const body = element.closest<HTMLElement>(".activity-a01-notebook-body")!;
      const picker = body.querySelector<HTMLElement>(".activity-a01-task-picker-mobile")!;
      const input = element.getBoundingClientRect();
      const viewport = body.getBoundingClientRect();
      return input.top >= picker.getBoundingClientRect().bottom - 2 && input.top < viewport.bottom && input.bottom > viewport.top;
    })).toBe(true);
    await expect(page.getByRole("button", { name: /Close notebook/ })).toHaveAttribute("aria-expanded", "true");
    await page.screenshot({ path: path.join(screenshotDirectory, `activity-a01-${viewport.name}-notebook.png`) });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /Open investigation notebook/ })).toHaveAttribute("aria-expanded", "false");
    await page.screenshot({ path: path.join(screenshotDirectory, `activity-a01-${viewport.name}-full.png`), fullPage: true });
  }
});
test("all module overviews, lessons, and activity pages render", async ({ page }) => {
  test.setTimeout(120_000);
  for (let number = 1; number <= 24; number += 1) {
    const moduleId = String(number).padStart(2, "0");
    const activityId = `A${moduleId}`;

    await page.goto(`/modules/${moduleId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`Module ${moduleId}`);
    await expect(page.getByRole("heading", { level: 2, name: "Module contents" }).first()).toBeVisible();
    await expect(page.locator(`#progress-editor-M${moduleId}`)).toBeVisible();
    const lessonLinks = page.locator(".module-outline-list a");
    const lessonCount = await lessonLinks.count();
    expect(lessonCount, `M${moduleId} must list its lessons`).toBeGreaterThan(0);
    const lessons = await lessonLinks.evaluateAll((links) => links.map((link) => ({
      href: link.getAttribute("href"),
      title: link.querySelector(".module-outline-title")?.textContent?.trim(),
    })));
    expect(lessons.every((lesson) => lesson.title && lesson.href)).toBe(true);
    expect(lessons.every((lesson) => new RegExp(`^/modules/${moduleId}/lessons/m${moduleId}-l\\d{2}$`).test(lesson.href ?? ""))).toBe(true);
    const invalidObjectiveTargets = await page.locator(".module-objectives a").evaluateAll((links) =>
      links.some((link) => !/^\/modules\/\d{2}\/lessons\/m\d{2}-l\d{2}$/.test((link as HTMLAnchorElement).getAttribute("href") ?? "")),
    );
    expect(invalidObjectiveTargets, `M${moduleId} objective lesson links use dedicated lesson routes`).toBe(false);
    const moduleOrder = await page.evaluate(() => {
      const progress = document.querySelector(".module-overview-progress");
      const navigation = document.querySelector(".module-pagination");
      return Boolean(progress && navigation
        && (progress.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(moduleOrder, `M${moduleId} progress precedes module navigation`).toBe(true);

    const recall = page.locator(".recall-prompt");
    await page.locator(".recall-prompt > summary").click();
    await expect(recall.getByRole("heading", { level: 3 }).first()).toBeVisible();
    const modelExplanation = recall.locator(".recall-answer");
    await page.locator(".recall-answer > summary").click();
    await expect(modelExplanation.locator(".article-copy")).toBeVisible();

    for (const lesson of lessons) {
      const lessonHref = lesson.href!;
      const lessonId = lessonHref.split("/").at(-1)!.toUpperCase();
      await page.goto(lessonHref);
      await expect(page.getByRole("heading", { level: 1, name: lesson.title! })).toBeVisible();
      await expect(page.locator(`.learning-lesson-reading #lesson-${lessonId.toLowerCase()}`)).toHaveCount(1);
      await expect(page.locator(`#progress-editor-${lessonId}`)).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Lesson navigation" })).toBeVisible();
      const figures = page.locator(".learning-lesson-reading .learning-figure");
      for (const figure of await figures.all()) {
        await figure.scrollIntoViewIfNeeded();
        await expect.poll(() => figure.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(`/activities/${activityId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#activity-scenario")).toBeVisible();
    if (activityId === "A01") {
      await expect(page.getByRole("heading", { name: "Before you begin" })).toBeVisible();
      await expect(page.locator(".activity-a01-safety-note")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Follow one process across Linux views" })).toBeVisible();
    } else {
      await expect(page.locator(".activity-a01-objectives > summary")).toHaveText("Scenario and learning objectives");
      await expect(page.locator(".activity-a01-notebook")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Work through the lab steps" })).toBeVisible();
    }
    const taskSteps = page.locator("#activity-steps [data-task-id]");
    const taskChoices = page.locator(".activity-a01-task-choice:not(.activity-a01-task-choice--legacy)");
    await expect(taskSteps).toHaveCount(await taskChoices.count());
    expect(await taskSteps.count(), `${activityId} needs task-linked notebook entries`).toBeGreaterThan(0);
    await expect(page.getByRole("textbox", { name: "Task observation" })).toBeVisible();
    await expect(page.locator(`#progress-editor-${activityId}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: activityId === "A01" ? "Review the observations you recorded" : "Review the work you recorded" })).toBeVisible();
    if (activityId === "A01") {
      await expect(page.locator(".activity-a01-task-choice:not(.activity-a01-task-choice--legacy)")).toHaveCount(5);
    } else {
      await expect(page.locator("#activity-record .activity-a01-review-task[data-task-id]")).toHaveCount(await taskSteps.count());
    }
    await expect(page.getByRole("link", { name: "Begin investigation" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Review findings" })).toHaveCount(0);
    await expect(page.locator(".activity-header-tools")).toHaveCount(0);
  }

  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 780 },
  ]) {
    await page.setViewportSize(viewport);
    for (let number = 1; number <= 24; number += 1) {
      const activityId = `A${String(number).padStart(2, "0")}`;
      await page.goto(`/activities/${activityId}`);
      const { documentWidth, viewportWidth } = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(documentWidth, `${activityId} must not overflow at ${viewport.width}px`).toBeLessThanOrEqual(viewportWidth);
    }
  }
});

test("primary pages and a dedicated lesson route reflow at a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const route of ["/", "/roadmap", "/activities", "/modules/01", "/modules/01/lessons/m01-l01", "/activities/A01", "/progress", "/projects", "/resources", "/guide"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const { documentWidth, viewportWidth } = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(documentWidth, `${route} must not overflow a 320px viewport`).toBeLessThanOrEqual(viewportWidth);
    const routeLabel = route.replace(/[^a-z0-9]+/gi, "-").replace(/(^-+|-+$)/g, "") || "home";
    await page.screenshot({ path: path.join(screenshotDirectory, `small-mobile-${routeLabel}.png`), fullPage: true });
  }

  await page.goto("/activities");
  const troubleshootingCard = page.locator("#troubleshooting-t03");
  await troubleshootingCard.locator("summary.troubleshooting-summary").click();
  await expect(troubleshootingCard.locator(".troubleshooting-record")).toBeVisible();
  const troubleshootingWidths = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.querySelector<HTMLElement>("#troubleshooting-t03 .troubleshooting-body")?.clientWidth ?? 0,
    scenarioWidth: document.querySelector<HTMLElement>("#troubleshooting-t03 .troubleshooting-section")?.clientWidth ?? 0,
  }));
  expect(troubleshootingWidths.documentWidth, "expanded troubleshooting must not overflow the viewport").toBeLessThanOrEqual(troubleshootingWidths.viewportWidth);
  expect(troubleshootingWidths.scenarioWidth).toBeLessThanOrEqual(troubleshootingWidths.bodyWidth);
  await page.screenshot({ path: path.join(screenshotDirectory, "small-mobile-troubleshooting-t03.png"), fullPage: true });

  await page.goto("/modules/00");
  await expect(page.getByRole("heading", { level: 1, name: /page.*found|not.*found/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /learning roadmap/i })).toHaveAttribute("href", "/roadmap");
});

test("progress API validates IDs, same-origin writes, and payload sizes", async ({ request }) => {
  const invalidLookup = await request.get("/api/progress?itemType=unknown&itemId=M01");
  expect(invalidLookup.status()).toBe(400);
  const unknownItem = await request.get("/api/progress?itemType=module&itemId=M99");
  expect(unknownItem.status()).toBe(400);

  const crossOriginWrite = await request.put("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    data: await progressSaveBody(request, progressRecord("module", "M01", "completed")),
  });
  expect(crossOriginWrite.status()).toBe(403);

  const oversizedWrite = await request.put("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: `{"notes":"${"x".repeat(64_001)}"}`,
  });
  expect(oversizedWrite.status()).toBe(413);

  const invalidRecord = await request.put("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: await progressSaveBody(request, { ...progressRecord("module", "M01", "completed"), repositoryUrl: "javascript:alert(1)" }),
  });
  expect(invalidRecord.status()).toBe(400);

  const invalidTimestampBackup = {
    version: 3,
    exportedAt: new Date().toISOString(),
    records: [
      { ...progressRecord("module", "M22", "completed", "Must not be partially restored."), updatedAt: Date.now() },
      { ...progressRecord("module", "M21", "completed", "Impossible timestamp."), updatedAt: 8.64e15 + 1 },
    ],
  };
  for (const url of ["/api/progress?preview=true", "/api/progress"]) {
    const invalidImport = await request.post(url, {
      headers: { "Content-Type": "application/json", Origin: testOrigin },
      data: invalidTimestampBackup,
    });
    expect(invalidImport.status()).toBe(400);
  }
  const partialRestore = await request.get("/api/progress?itemType=module&itemId=M22");
  expect((await partialRestore.json() as Array<{ notes: string }>).some(({ notes }) => notes === "Must not be partially restored.")).toBe(false);

  const crossOriginImport = await request.post("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    data: { version: 1, exportedAt: new Date().toISOString(), records: [] },
  });
  expect(crossOriginImport.status()).toBe(403);
});

test("major project milestone state saves and appears in the progress notebook", async ({ page }) => {
  await page.goto("/projects/P1#project-build");
  const milestone = page.locator('[id="milestone-check-P1.1"]');
  await expect(milestone).toBeVisible();
  await expect(milestone).toBeEnabled();
  await milestone.click();
  await expect(page.getByText("Checkpoint progress saved.")).toBeVisible();
  await expect(milestone).toBeChecked();
  await page.goto("/progress");
  await expect(page.getByText(/^P1\.1 ·/).last()).toBeVisible();
});
