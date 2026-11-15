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
  expect(exported.version).toBe(2);
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

test("module learning flow links directly to practice and readable activity evidence", async ({ page, request }) => {
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

  const legacyA01 = await request.put(`${testOrigin}/api/progress`, {
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
  await expect(page.getByRole("link", { name: "Start activity" })).toHaveAttribute("href", "#activity-scenario");
  await expect(page.locator(".activity-workflow-nav a")).toHaveCount(4);
  await expect(page.locator(".activity-workflow-nav a").nth(0)).toHaveAttribute("href", "#activity-scenario");
  await expect(page.locator(".activity-workflow-nav a").nth(1)).toHaveAttribute("href", "#activity-prepare");
  await expect(page.locator(".activity-workflow-nav a").nth(2)).toHaveAttribute("href", "#activity-perform");
  await expect(page.locator(".activity-workflow-nav a").nth(3)).toHaveAttribute("href", "#activity-record");
  await expect(page.getByRole("heading", { name: "What can one process snapshot tell you?" })).toBeVisible();
  await expect(page.locator("#activity-scenario")).toContainText("A technician is learning");
  await expect(page.locator("#activity-scenario")).toContainText("What you will keep");
  await expect(page.getByRole("heading", { name: "Prepare your VM" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow one process from ps to /proc" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review the findings you already recorded" })).toBeVisible();
  await expect(page.locator("#activity-steps ol > li")).toHaveCount(5);
  await expect(page.locator("#activity-steps ol > li").nth(2)).toContainText("Expect:");
  await expect(page.locator("#activity-steps ol > li").nth(2)).toContainText("Meaning:");
  await expect(page.locator("#activity-steps ol > li").nth(2)).toContainText("Record:");
  await expect(page.getByRole("img", { name: /Application code calls a library/ })).toHaveCount(1);
  const processFigure = page.locator(".module-diagram img");
  await expect.poll(() => processFigure.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator(".module-diagram figcaption")).toContainText("Figure 1");
  await expect(page.getByRole("button", { name: "Copy example code" }).first()).toBeVisible();
  await expect(page.getByText(/Use a disposable Ubuntu VM/)).toBeVisible();
  const hints = page.locator(".optional-hints");
  await expect(hints).toHaveJSProperty("open", false);
  const troubleshooting = page.locator(".activity-troubleshooting");
  await expect(troubleshooting).toHaveJSProperty("open", false);
  await expect(troubleshooting.locator("summary")).toContainText("Troubleshoot access or systemd results");
  await expect(page.getByRole("link", { name: /Review Module 01/ })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Next activity.*A02/ })).toHaveAttribute("href", "/activities/A02");
  const notebook = page.locator(".activity-a01-notebook");
  const notes = page.getByLabel("Findings and interpretation");
  const evidence = page.getByLabel("Sanitized commands and evidence");
  await expect(notes).toBeVisible();
  await expect(evidence).toBeVisible();
  await expect(notes).toHaveValue("Previously saved A01 finding from the existing notebook.");
  await expect(evidence).toHaveValue("Earlier sanitized ps and /proc evidence.");
  const desktopLayout = await page.evaluate(() => {
    const instructions = document.querySelector(".activity-a01-instructions")!.getBoundingClientRect();
    const notebook = document.querySelector(".activity-a01-notebook-panel")!.getBoundingClientRect();
    return { instructionWidth: instructions.width, notebookWidth: notebook.width, gap: notebook.left - instructions.right };
  });
  expect(desktopLayout.instructionWidth).toBeGreaterThan(520);
  expect(desktopLayout.notebookWidth).toBeGreaterThanOrEqual(330);
  expect(desktopLayout.gap).toBeGreaterThan(0);
  expect(desktopLayout.gap).toBeLessThan(60);
  const thirdTask = page.locator("#activity-steps ol > li").nth(2);
  await thirdTask.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 110, behavior: "instant" }));
  await expect(notebook).toBeInViewport();
  await expect(page.locator(".activity-a01-current-task")).toContainText("Task 3 of 5");
  await expect(page.locator(".activity-a01-current-task")).toContainText("Compare the process with /proc");
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-1440.png") });

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: testOrigin });
  const copyButton = page.getByRole("button", { name: "Copy example code" }).nth(2);
  await copyButton.click();
  await expect(copyButton).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/proc/$PID/status");

  await hints.locator("summary").click();
  await expect(hints).toContainText("PID disappears");
  await troubleshooting.locator("summary").click();
  await expect(troubleshooting).toContainText("permission");
  await hints.locator("summary").click();
  await troubleshooting.locator("summary").click();
  await notes.fill("The selected process was sleeping when I checked it. That one state value does not tell me whether it is slow.");
  await evidence.fill("ps and /proc/status showed the same PID and effective UID. systemctl identified a session scope; descriptor targets were recorded by type.");
  await expect(page.locator(".activity-a01-save-state")).toContainText("Unsaved changes");
  await notebook.getByRole("button", { name: "Save draft" }).click();
  await expect(notebook.getByRole("status")).toContainText("Draft saved on this device.");
  const firstSavedResponse = await request.get("/api/progress?itemType=activity&itemId=A01");
  const firstSavedRows = await firstSavedResponse.json() as Array<{ status: string; comfort: string | null; notes: string; evidence: string; repositoryUrl: string }>;
  expect(firstSavedRows).toHaveLength(1);
  expect(firstSavedRows[0].status).toBe("in_progress");
  expect(firstSavedRows[0]).toMatchObject({ comfort: "familiar", repositoryUrl: "https://example.test/a01-notes" });

  await page.reload();
  await expect(page.getByLabel("Findings and interpretation")).toHaveValue(/selected process was sleeping/);
  await expect(page.getByLabel("Sanitized commands and evidence")).toHaveValue(/ps and \/proc\/status/);
  await page.locator(".activity-workflow-nav a").nth(3).click();
  const review = page.locator("#activity-record");
  await expect(review).toBeInViewport();
  await expect(review.locator(".activity-a01-review-record")).toContainText("selected process was sleeping");
  await expect(review.locator(".activity-a01-review-record")).toContainText("systemctl identified a session scope");
  await expect(review.locator("textarea")).toHaveCount(0);
  await expect(review.getByRole("link", { name: "Edit in the notebook" })).toBeVisible();
  await review.getByRole("button", { name: "Save draft" }).click();
  await expect(review.getByRole("status")).toContainText("Draft saved on this device.");
  const reviewDraftResponse = await request.get("/api/progress?itemType=activity&itemId=A01");
  const reviewDraftRows = await reviewDraftResponse.json() as Array<{ status: string }>;
  expect(reviewDraftRows).toHaveLength(1);
  expect(reviewDraftRows[0].status).toBe("in_progress");

  await review.getByRole("link", { name: "Edit in the notebook" }).click();
  await expect(notebook).toBeInViewport();
  await notes.fill("Refined: this process was sleeping at the instant I checked it; that alone does not establish whether it is slow.");
  await notebook.getByRole("button", { name: "Save draft" }).click();
  await expect(notebook.getByRole("status")).toContainText("Draft saved on this device.");
  await page.locator(".activity-workflow-nav a").nth(3).click();
  await expect(review.locator(".activity-a01-review-record")).toContainText("Refined: this process was sleeping");
  await review.getByLabel(/How independently did this work feel/).selectOption("guided");
  await review.getByRole("button", { name: "Mark activity complete" }).click();
  await expect(review.locator(".activity-a01-status")).toHaveText("Completed");
  const completedResponse = await request.get("/api/progress?itemType=activity&itemId=A01");
  const completedRows = await completedResponse.json() as Array<{ status: string; comfort: string | null; notes: string; evidence: string }>;
  expect(completedRows).toHaveLength(1);
  expect(completedRows[0]).toMatchObject({ status: "completed", comfort: "guided" });
  expect(completedRows[0].notes).toContain("Refined: this process was sleeping");
  expect(completedRows[0].evidence).toContain("session scope");

  await page.setViewportSize({ width: 1920, height: 1080 });
  await thirdTask.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 110, behavior: "instant" }));
  await expect(page.locator(".activity-a01-current-task")).toContainText("Task 3 of 5");
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-1920.png") });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.locator(".activity-workflow-nav a").nth(2).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await expect(page.getByRole("button", { name: /Open investigation notebook/ })).toBeVisible();
  await page.getByRole("button", { name: /Open investigation notebook/ }).click();
  await expect(page.getByLabel("Findings and interpretation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Open investigation notebook/ })).toHaveAttribute("aria-expanded", "false");
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-tablet.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-mobile.png") });
  await page.getByRole("button", { name: /Open investigation notebook/ }).click();
  await expect(page.getByLabel("Findings and interpretation")).toBeVisible();
  await expect(page.locator(".activity-a01-current-task")).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-mobile-notebook.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Open investigation notebook/ })).toHaveAttribute("aria-expanded", "false");

  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.getByRole("button", { name: /Open investigation notebook/ }).click();
  await expect(page.getByLabel("Findings and interpretation")).toBeVisible();
  await page.locator(".activity-a01-notebook-body").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(evidence).toBeInViewport();
  await expect(notebook.getByRole("button", { name: "Save draft" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-320-evidence.png") });
  await page.keyboard.press("Escape");
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
    await expect(page.getByRole("heading", { name: "Prepare" })).toBeVisible();
    await expect(page.locator(".activity-environment")).toBeVisible();
    if (activityId === "A01") {
      await expect(page.getByRole("heading", { name: /Follow one process from ps to \/proc/ })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: "Perform & verify" })).toBeVisible();
    }
    expect(await page.locator("#activity-steps ol > li").count()).toBeGreaterThan(0);
    if (activityId === "A01") {
      await expect(page.getByRole("heading", { name: "Review the findings you already recorded" })).toBeVisible();
      await expect(page.getByLabel("Findings and interpretation")).toBeVisible();
      await expect(page.getByLabel("Sanitized commands and evidence")).toBeVisible();
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
    data: `{"notes":"${"x".repeat(32_001)}"}`,
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
