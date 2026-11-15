import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const testPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testOrigin = `http://127.0.0.1:${testPort}`;
const screenshotDirectory = process.env.FIELDNOTES_SCREENSHOT_DIR ?? path.join(process.cwd(), "test-results", "fieldnotes-ui-review");
mkdirSync(screenshotDirectory, { recursive: true });

function progressRecord(itemType: string, itemId: string, status: string, notes = "") {
  return { itemType, itemId, status, comfort: null, notes, evidence: "", repositoryUrl: "" };
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
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Learning pages" })).toBeVisible();
  await expect(page.getByRole("link", { name: "DevOps Fieldnotes home" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("link", { name: "Guide" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "DevOps Fieldnotes home" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("navigation", { name: "Learning pages" }).getByRole("link", { name: "Activities" }).click();
  await expect(page.getByRole("heading", { name: "Activities & labs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
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

test("progress edits save to SQLite and survive a page reload", async ({ page }) => {
  const seededModule = await page.request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: { ...progressRecord("module", "M01", "not_started", "Older module note."), comfort: "guided", evidence: "Existing evidence stays attached to the module record.", repositoryUrl: "https://example.com/old-module-record" },
  });
  expect(seededModule.ok()).toBeTruthy();

  await page.goto("/modules/01");
  await expect(page.getByRole("heading", { name: /Module 01 — How computers and operating systems work/ })).toBeVisible();
  await page.getByLabel("Status").selectOption("in_progress");
  await page.locator("#notes-M01").fill("I can describe the user-space and kernel boundary.");
  await expect(page.getByLabel("Evidence or verification")).toHaveCount(0);
  await expect(page.getByLabel("How independently can you do this?")).toHaveCount(0);
  await page.getByRole("button", { name: "Save module progress" }).click();
  await expect(page.getByText("Saved on this device.")).toBeVisible();
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
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await page.getByRole("button", { name: "Save learning record" }).click();
  await expect(page.getByText("Saved on this device.")).toBeVisible();
  const savedLesson = await page.request.get(`${testOrigin}/api/progress?itemType=lesson&itemId=M01-L02`);
  expect(await savedLesson.json()).toMatchObject([{ itemType: "lesson", itemId: "M01-L02", status: "completed" }]);

  await page.goto("/modules/01/lessons/m01-l02");
  await page.locator('.learning-lesson-navigation a[href="/modules/01/lessons/m01-l03"]').click();
  await expect(page).toHaveURL(/\/modules\/01\/lessons\/m01-l03$/);
  const nextLessonProgress = page.locator("#progress-editor-M01-L03");
  await expect(nextLessonProgress.locator(".progress-lesson-status-control .field-hint")).toHaveText("Not started");
  await expect(nextLessonProgress.getByRole("button", { name: "Mark lesson complete" })).toBeVisible();
  await nextLessonProgress.getByRole("button", { name: "Mark lesson complete" }).click();
  await nextLessonProgress.getByRole("button", { name: "Save learning record" }).click();
  await expect(nextLessonProgress.getByText("Saved on this device.")).toBeVisible();
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

test("backup import merges records and export downloads the saved data", async ({ page, request }) => {
  const existing = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: progressRecord("module", "M02", "completed", "Existing record remains."),
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
  await expect(page.getByText("1 record was imported. Matching items were updated; other saved records were kept.")).toBeVisible();

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

test("activity directory filters by real phase, search text, and saved status", async ({ page, request }) => {
  const savedActivity = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: progressRecord("activity", "A03", "in_progress", "Temporary E2E activity state."),
  });
  expect(savedActivity.ok()).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/activities");
  await expect(page.getByRole("heading", { name: "Activities & labs" })).toBeVisible();
  const activitySearch = page.getByRole("searchbox", { name: "Search by topic, technology, or skill" });
  await expect(activitySearch).toBeVisible();
  await expect(page.locator(".continue-practice-card")).toContainText("Linux users, processes and service management");
  await expect(page.locator(".continue-practice-card").getByRole("link", { name: "Continue activity" })).toHaveAttribute("href", "/activities/A03");
  await expect(page.getByRole("link", { name: /Troubleshooting scenarios 12/ })).toHaveAttribute("href", "#troubleshooting");
  await page.getByRole("button", { name: /Foundations/ }).click();
  await page.getByLabel("Saved progress").selectOption("in_progress");
  await activitySearch.fill("systemd");
  await expect(page.locator(".practice-card")).toHaveCount(1);
  await expect(page.locator(".practice-card").first()).toContainText("A03");
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
  await expect(troubleshootingRecord.locator(".form-message")).toContainText("Saved on this device.");
  await expect(troubleshootingCard.locator(".practice-status")).toHaveText("In progress");
  await troubleshootingCard.locator("summary.troubleshooting-summary").click();
  await troubleshootingCard.locator("summary.troubleshooting-summary").click();
  await expect(troubleshootingCard.locator("#progress-editor-T03").getByLabel("Learning note")).toHaveValue("Expected a read denial for the service identity; recorded the first failing path.");
  await troubleshootingCard.locator("summary.troubleshooting-summary").click();
  await page.screenshot({ path: path.join(screenshotDirectory, "activities-desktop.png"), fullPage: true });
  await page.getByRole("link", { name: /Troubleshooting scenarios/ }).click();
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
  await page.goto("/projects/P1");
  const projectLearningRecord = page.locator("#progress-editor-P1");
  await expect(projectLearningRecord).toBeVisible();
  expect(await projectLearningRecord.getByLabel("Learning note").evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(150);
  expect(await projectLearningRecord.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(await page.locator(".lesson-aside").evaluate((element) => element.getBoundingClientRect().width));

  await page.goto("/projects");
  await expect(page.locator(".major-build-card")).toHaveCount(3);
  await expect(page.locator(".small-tool-card")).toHaveCount(8);
  await expect(page.locator(".major-build-card").first()).toContainText("0 / 8");
  await page.screenshot({ path: path.join(screenshotDirectory, "projects-desktop.png"), fullPage: true });

  const milestone = await request.put(`${testOrigin}/api/progress`, {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: progressRecord("milestone", "P2.1", "completed"),
  });
  expect(milestone.ok()).toBeTruthy();
  await page.goto("/projects");
  await expect(page.locator(".major-build-card").first()).toHaveAttribute("data-project-id", "P2");
  await expect(page.locator(".major-build-card").first()).toContainText("Next milestone");
  await expect(page.locator(".major-build-card").first()).toContainText("P2.2");
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress notebook" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning overview" })).toBeVisible();
  await expect(page.locator(".progress-stat").filter({ hasText: "Roadmap modules" })).toContainText("24");
  await expect(page.locator(".progress-stat").filter({ hasText: "Modules marked complete" })).toContainText("1");
  await expect(page.locator(".progress-stat").filter({ hasText: "Modules in progress" })).toContainText("1");
  await expect(page.locator(".progress-stat").filter({ hasText: "Modules needing review" })).toContainText("1");
  await expect(page.getByText(/^P2\.1 ·/)).toBeVisible();
  await expect(page.getByText("Records are ordered by their last saved time.")).toBeVisible();
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

test("resource library searches PDFs, official documentation, and glossary terms", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/resources");
  const search = page.getByRole("searchbox", { name: "Search library, documentation, or glossary terms" });
  await expect(search).toBeVisible();
  await expect(page.getByRole("link", { name: /Source PDFs 8/ })).toBeVisible();
  await search.fill("Docker");
  await expect(page.getByText(/matching resources/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your learning library" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Official references" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /No resources match/ })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("heading", { name: "Your learning library" })).toBeVisible();
});

test("career priorities link to the related roadmap, practice, and project work", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.getByRole("heading", { name: "Flexible preparation priorities" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Module 03/ }).first()).toHaveAttribute("href", "/modules/03");
  await expect(page.getByRole("link", { name: /T03/ }).first()).toHaveAttribute("href", "/activities#troubleshooting-t03");
  await expect(page.getByRole("link", { name: /P3/ }).first()).toHaveAttribute("href", "/projects/P3");
});

test("activity brief and source PDFs are available", async ({ page }) => {
  await page.goto("/activities/A08");
  await expect(page.getByRole("heading", { level: 1, name: "Container fundamentals with Docker" })).toBeVisible();
  await expect(page.getByText(/Build an image for your status API/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Activity reference PDF/ })).toHaveAttribute("href", "/library/04_Activities_and_Practice.pdf");
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
  await knowledgeCheck.getByRole("radio").nth(0).check();
  await knowledgeCheck.getByRole("button", { name: "Check answer" }).click();
  await expect(knowledgeCheck.getByText(/Review the distinction/)).toBeVisible();
  await knowledgeCheck.getByRole("button", { name: "Next question" }).click();
  await knowledgeCheck.getByRole("radio").nth(2).check();
  await knowledgeCheck.getByRole("button", { name: "Check answer" }).click();
  await knowledgeCheck.getByRole("button", { name: "See result" }).click();
  await expect(knowledgeCheck.getByText("2 of 3 correct")).toBeVisible();
  await knowledgeCheck.getByRole("button", { name: "Try again" }).click();
  await expect(knowledgeCheck.getByText("Question 1 of 3")).toBeVisible();

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

test("A01 keeps task observations in one notebook through save, review, and reopen", async ({ page, request }) => {
  const legacyA01 = await request.put(testOrigin + "/api/progress", {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: {
      itemType: "activity",
      itemId: "A01",
      status: "in_progress",
      comfort: "familiar",
      notes: "Previously saved A01 finding from the existing notebook.",
      evidence: "Earlier sanitized ps and /proc evidence.",
      repositoryUrl: "https://example.test/a01-notes",
    },
  });
  expect(legacyA01.ok()).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/activities/A01");
  await expect(page.getByRole("heading", { level: 1, name: "Investigate a running Linux process" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review the observations you recorded" })).toBeVisible();
  const beginInvestigation = page.getByRole("link", { name: "Begin investigation" });
  const reviewFindings = page.getByRole("link", { name: "Review findings" });
  await expect(beginInvestigation).toHaveAttribute("href", "#activity-prepare");
  await expect(beginInvestigation).toBeVisible();
  await expect(page.locator(".activity-header-tools")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Review Module 01/ })).toHaveAttribute("href", "/modules/01");
  const overviewLayout = await page.evaluate(() => {
    const copy = document.querySelector(".activity-a01-understand-copy")!.getBoundingClientRect();
    const actions = document.querySelector(".activity-a01-start-panel")!.getBoundingClientRect();
    const primary = document.querySelector<HTMLAnchorElement>(".activity-a01-start-actions .button-primary")!.getBoundingClientRect();
    return { copyRight: copy.right, actionsLeft: actions.left, actionsWidth: actions.width, buttonHeight: primary.height };
  });
  expect(overviewLayout.actionsLeft).toBeGreaterThanOrEqual(overviewLayout.copyRight);
  expect(overviewLayout.actionsWidth).toBeGreaterThan(300);
  expect(overviewLayout.buttonHeight).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-start-1440x900.png") });
  await reviewFindings.click();
  await expect(page).toHaveURL(/#activity-record$/);
  await expect(page.locator("#activity-record")).toBeInViewport();
  await beginInvestigation.click();
  await expect(page).toHaveURL(/#activity-prepare$/);
  await expect(page.locator("#activity-prepare")).toBeInViewport();
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
  await notebook.getByRole("button", { name: "Save draft" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Simulated save failure.");
  await expect(taskObservation).toHaveValue("The numeric UID was 1000; I omitted the account name from my notes.");
  await page.unroute("**/api/progress");

  await notebook.getByRole("button", { name: "Save draft" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Draft saved on this device.");
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
  await notebook.getByRole("button", { name: "Save draft" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Draft saved on this device.");
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
  type A01Rows = Array<{ status: string; taskObservations: Record<string, string> }>;
  let currentRows = await (await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A01")).json() as A01Rows;
  expect(currentRows).toHaveLength(1);
  expect(currentRows[0].status).toBe("completed");
  expect(currentRows[0].taskObservations["choose-process"]).toContain("Prediction:");

  await review.getByRole("button", { name: "Edit Task 2" }).click();
  await expect(notebook.getByRole("button", { name: /Choose a process you own/ })).toHaveAttribute("aria-pressed", "true");
  await taskObservation.fill("Revised after review: RSS can change between snapshots; PID and parent remained stable.");
  await notebook.getByRole("button", { name: "Save draft" }).click();
  await expect(notebook.locator(".form-message")).toContainText("Draft saved. The activity remains marked complete.");
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
        updatedAt: Date.now() - 1000,
      }],
    },
  });
  expect(legacyImport.ok()).toBeTruthy();
  currentRows = await (await request.get(testOrigin + "/api/progress?itemType=activity&itemId=A01")).json() as A01Rows;
  expect(currentRows).toHaveLength(1);
  expect(currentRows[0].taskObservations["choose-process"]).toContain("Revised after review:");
  expect(currentRows[0].taskObservations["compare-proc"]).toContain("Refined:");

  await page.goto("/progress");
  await expect(page.getByText("Revised after review: RSS can change between snapshots", { exact: false })).toBeVisible();
  await expect(page.getByText("Imported older A01 note.")).toBeVisible();
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
  await expect(notebook.getByRole("button", { name: "Save draft" })).toBeInViewport();
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
    if (viewport.width <= 620) {
      await expect(page.locator(".activity-a01-start-actions")).toHaveCSS("display", "grid");
      const actionSizes = await page.locator(".activity-a01-start-actions .button").evaluateAll((buttons) => buttons.map((button) => {
        const { width, height } = button.getBoundingClientRect();
        return { width, height };
      }));
      expect(actionSizes).toHaveLength(2);
      expect(actionSizes[0].height).toBeGreaterThanOrEqual(48);
      expect(actionSizes[1].width).toBe(actionSizes[0].width);
    }
    await page.getByRole("button", { name: /Open investigation notebook/ }).click();
    await expect(taskObservation).toBeVisible();
    const mobileTaskPicker = page.locator(".activity-a01-task-picker-mobile");
    await expect(mobileTaskPicker).toBeVisible();
    await mobileTaskPicker.locator("select").selectOption("explain-boundary");
    await expect(taskObservation).toBeFocused();
    await expect(mobileTaskPicker).toContainText("Editing Task 5 of 5 · Explain what the evidence supports");
    await expect(notebook.getByRole("button", { name: "Save draft" })).toBeVisible();
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
    if (activityId !== "A01") await expect(page.locator(".activity-objectives ul li").first()).toBeVisible();
    if (activityId === "A01") {
      await expect(page.getByRole("heading", { name: "Before you begin" })).toBeVisible();
      await expect(page.locator(".activity-a01-safety-note")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Follow one process across Linux views" })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: "Prepare" })).toBeVisible();
      await expect(page.locator(".activity-environment")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Perform & verify" })).toBeVisible();
    }
    expect(await page.locator("#activity-steps ol > li").count()).toBeGreaterThan(0);
    if (activityId === "A01") {
      await expect(page.getByRole("heading", { name: "Review the observations you recorded" })).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Task observation" })).toBeVisible();
      await expect(page.locator(".activity-a01-task-choice:not(.activity-a01-task-choice--legacy)")).toHaveCount(5);
    } else {
      await expect(page.getByRole("heading", { name: "Expected observations" })).toBeVisible();
      await expect(page.locator(".activity-expected-observations .article-copy")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Check the result" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Record your work" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Evidence to include" })).toBeVisible();
      await expect(page.locator(`#progress-editor-${activityId}`)).toBeVisible();
      await expect(page.locator(`#notes-help-${activityId}`)).toContainText(activityId);
    }
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
});

test("progress API validates IDs, same-origin writes, and payload sizes", async ({ request }) => {
  const invalidLookup = await request.get("/api/progress?itemType=unknown&itemId=M01");
  expect(invalidLookup.status()).toBe(400);
  const unknownItem = await request.get("/api/progress?itemType=module&itemId=M99");
  expect(unknownItem.status()).toBe(400);

  const crossOriginWrite = await request.put("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    data: progressRecord("module", "M01", "completed"),
  });
  expect(crossOriginWrite.status()).toBe(403);

  const oversizedWrite = await request.put("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: `{"notes":"${"x".repeat(64_001)}"}`,
  });
  expect(oversizedWrite.status()).toBe(413);

  const invalidRecord = await request.put("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: testOrigin },
    data: { ...progressRecord("module", "M01", "completed"), repositoryUrl: "javascript:alert(1)" },
  });
  expect(invalidRecord.status()).toBe(400);

  const crossOriginImport = await request.post("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    data: { version: 1, exportedAt: new Date().toISOString(), records: [] },
  });
  expect(crossOriginImport.status()).toBe(403);
});

test("major project milestone state saves and appears in the progress notebook", async ({ page }) => {
  await page.goto("/projects/P1");
  const milestone = page.getByRole("checkbox", { name: /P1\.1/ }).first();
  await expect(milestone).toBeVisible();
  await expect(milestone).toBeEnabled();
  await milestone.click();
  await expect(page.getByText("Milestone progress saved on this device.")).toBeVisible();
  await expect(milestone).toBeChecked();
  await page.goto("/progress");
  await expect(page.getByText(/^P1\.1 ·/).last()).toBeVisible();
});
