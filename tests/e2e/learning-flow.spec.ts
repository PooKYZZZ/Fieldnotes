import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const testPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testOrigin = `http://127.0.0.1:${testPort}`;
const screenshotDirectory = path.join(process.cwd(), "test-results", "fieldnotes-ui-review");
mkdirSync(screenshotDirectory, { recursive: true });

function progressRecord(itemType: string, itemId: string, status: string, notes = "") {
  return { itemType, itemId, status, comfort: null, notes, evidence: "", repositoryUrl: "" };
}

test("dashboard handles day-one state, working filters, and responsive layouts", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const homeResponse = await page.goto("/");
  expect(homeResponse?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(homeResponse?.headers()["x-frame-options"]).toBe("DENY");
  await expect(page.getByRole("heading", { level: 1, name: "My learning" })).toBeVisible();
  await expect(page.getByText("Start your learning journey")).toBeVisible();
  await expect(page.getByText("Pick up where you left off")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recent work" })).toBeVisible();
  await expect(page.getByText("Your notes and completed work will appear here after you save a record.")).toBeVisible();
  await expect(page.getByRole("link", { name: /View all 24/ })).toBeVisible();
  await expect(page.getByText("Start with the lesson in Continue learning.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /A01/ })).toHaveCount(0);
  await expect(page.getByText("0 of 2 records · 0%").first()).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "dashboard-desktop-day-one.png") });

  await page.getByRole("button", { name: /Completed/ }).click();
  await expect(page.getByText("No modules match this filter yet.")).toBeVisible();
  await page.getByRole("button", { name: /Needs review/ }).click();
  await expect(page.getByText("Modules marked for review will appear here.")).toBeVisible();
  await page.getByRole("button", { name: /All modules/ }).click();
  await expect(page.locator(".dashboard-module-grid .module-card")).toHaveCount(6);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("heading", { name: "My learning" })).toBeVisible();
  await page.waitForFunction(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
  });
  await page.screenshot({ path: path.join(screenshotDirectory, "dashboard-tablet-day-one.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    return Boolean(sidebar && sidebar.getBoundingClientRect().right <= 0);
  });
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
  await page.screenshot({ path: path.join(screenshotDirectory, "dashboard-mobile-day-one.png"), fullPage: true });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Learning pages" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("navigation", { name: "Learning pages" }).getByRole("link", { name: "Activities" }).click();
  await expect(page.getByRole("heading", { name: "Activities & labs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/roadmap");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(24);
  await expect(page.getByText("MODULE 24")).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDirectory, "roadmap-desktop.png") });
  await page.locator("#roadmap-phase-filter").selectOption("Infrastructure & Cloud");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(8);
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
  await page.goto("/modules/01");
  await expect(page.getByRole("heading", { name: /Module 01: How computers and operating systems work/ })).toBeVisible();
  await page.getByLabel("Status").selectOption("in_progress");
  await page.getByLabel("Learning note").fill("I can describe the user-space and kernel boundary.");
  await page.getByLabel("Evidence or verification").fill("Repeated the process check in a disposable VM.");
  await page.getByRole("button", { name: "Save learning record" }).click();
  await expect(page.getByText("Saved on this device.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Status")).toHaveValue("in_progress");
  await expect(page.getByLabel("Learning note")).toHaveValue("I can describe the user-space and kernel boundary.");
  await expect(page.getByLabel("Evidence or verification")).toHaveValue("Repeated the process check in a disposable VM.");
  await page.goto("/progress");
  const savedModuleRecord = page.locator(".progress-record").filter({ hasText: "Module 01 · How computers and operating systems work" });
  await expect(savedModuleRecord).toContainText("I can describe the user-space and kernel boundary.");
  await expect(savedModuleRecord.getByRole("link", { name: "Edit learning record" })).toHaveAttribute("href", "/modules/01#progress-editor-M01");
  await savedModuleRecord.getByRole("link", { name: "Edit learning record" }).click();
  await expect(page).toHaveURL(/\/modules\/01#progress-editor-M01$/);
  await expect(page.locator("#progress-editor-M01")).toBeInViewport();
  await page.goto("/");
  await expect(page.getByText("Pick up where you left off")).toBeVisible();
  await expect(page.getByRole("button", { name: /In progress 1/ })).toBeVisible();
  await page.getByRole("button", { name: /In progress 1/ }).click();
  await expect(page.locator(".dashboard-module-grid .module-card")).toHaveCount(1);
  await page.goto("/roadmap");
  await page.locator("#roadmap-progress-filter").selectOption("in_progress");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(1);
  await expect(page.locator(".module-grid .module-card").first()).toContainText("0 of 2 records · 0%");
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
  expect(exported.version).toBe(1);
  expect(exported.records).toHaveLength(rows.length);

  await page.goto("/");
  await expect(page.getByText("Pick up where you left off")).toBeVisible();
  await expect(page.getByRole("button", { name: /Needs review 1/ })).toBeVisible();
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
  await expect(page.getByRole("searchbox", { name: "Search activities or skills" })).toBeVisible();
  await expect(page.locator(".continue-practice-card")).toContainText("Linux users, processes and service management");
  await expect(page.locator(".continue-practice-card").getByRole("link", { name: "Continue activity" })).toHaveAttribute("href", "/activities/A03");
  await expect(page.getByRole("link", { name: /Troubleshooting scenarios 12/ })).toHaveAttribute("href", "#troubleshooting");
  await page.getByRole("button", { name: /Foundations/ }).click();
  await page.getByLabel("Saved progress").selectOption("in_progress");
  await page.getByRole("searchbox", { name: "Search activities or skills" }).fill("systemd");
  await expect(page.locator(".practice-card")).toHaveCount(1);
  await expect(page.locator(".practice-card").first()).toContainText("A03");
  await page.getByRole("searchbox", { name: "Search activities or skills" }).fill("nothing matches this phrase");
  await expect(page.getByText("No activities match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".practice-card")).toHaveCount(24);
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
  await expect(page.getByRole("link", { name: /Source PDF/ })).toHaveAttribute("href", "/library/04_Activities_and_Practice.pdf");
  const response = await page.request.get("/library/04_Activities_and_Practice.pdf");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("module learning flow links directly to practice and readable activity evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/modules/01");
  await expect(page.getByRole("heading", { level: 1, name: /Module 01: How computers and operating systems work/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "From program to process" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "User space and the kernel" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Processes versus threads" })).toHaveAttribute("href", "#module-01-from-program-to-process");
  await expect(page.getByRole("link", { name: "Boot sequence and filesystems" })).toHaveAttribute("href", "#module-01-boot-and-filesystems");
  await expect(page.getByRole("heading", { name: "Boot and filesystems" })).toBeVisible();
  const processDiagram = page.locator(".lesson-diagram").filter({ hasText: "User-space process" });
  await expect(processDiagram).toContainText("Program file on disk");
  await expect(processDiagram).toContainText("system call (checked request)");
  await expect(processDiagram).toContainText("Kernel");
  await expect(page.getByRole("link", { name: "Start guided practice" })).toHaveAttribute("href", "#guided-practice");
  await expect(page.getByRole("link", { name: "Record learning" })).toHaveAttribute("href", "#progress-editor-M01");
  await expect(page.locator("#guided-practice").getByRole("link", { name: "Open Activity A01" })).toHaveAttribute("href", "/activities/A01");
  await expect(page.locator("#guided-practice").getByRole("heading", { name: "Watch for these mistakes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open source PDF" })).toHaveCount(1);
  const technicalReferences = page.locator(".module-references");
  await technicalReferences.locator("summary").click();
  await expect(technicalReferences.getByRole("link", { name: "Browse the resource library" })).toHaveAttribute("href", "/resources#official-references");
  await expect(page.getByText("Matching practice", { exact: false })).toHaveCount(0);
  const recordBeforeContinuation = await page.evaluate(() => {
    const record = document.querySelector(".learning-record-section");
    const continuation = document.querySelector(".module-pagination");
    return Boolean(record && continuation
      && (record.compareDocumentPosition(continuation) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(recordBeforeContinuation).toBe(true);

  const recallPrompt = page.locator(".recall-prompt");
  await expect(recallPrompt).toHaveJSProperty("open", false);
  await page.locator(".recall-prompt > summary").click();
  await expect(recallPrompt.getByRole("heading", { level: 3 })).toContainText("waiting for a file read");
  const modelExplanation = recallPrompt.locator(".recall-answer");
  await expect(modelExplanation).toHaveJSProperty("open", false);
  await page.locator(".recall-answer > summary").click();
  await expect(modelExplanation).toContainText("The kernel checks access");
  await expect(page.locator("#progress-editor-M01")).toBeVisible();
  await expect(page.getByLabel("How independently can you do this?")).toBeVisible();
  const moduleTextareaHeight = await page.getByLabel("Learning note").evaluate((element) => element.getBoundingClientRect().height);
  expect(moduleTextareaHeight).toBeGreaterThanOrEqual(150);
  await page.getByRole("link", { name: "Record learning" }).click();
  await expect(page.locator("#progress-editor-M01")).toBeInViewport();
  await page.getByRole("link", { name: "Start guided practice" }).click();
  await expect(page.locator("#guided-practice")).toBeInViewport();
  await page.screenshot({ path: path.join(screenshotDirectory, "module-01-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "module-01-tablet.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "module-01-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/activities/A01");
  await expect(page.getByRole("heading", { level: 1, name: "How computers and operating systems work" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start this activity" })).toHaveAttribute("href", "#activity-steps");
  await expect(page.getByRole("heading", { name: "Practice steps" })).toBeVisible();
  await expect(page.locator("#activity-steps ol > li")).toHaveCount(4);
  await expect(page.locator(".evidence-prompts svg")).toHaveCount(4);
  await expect(page.getByText(/Use a disposable Ubuntu virtual machine/)).toBeVisible();
  const hints = page.locator(".optional-hints");
  await expect(hints).toHaveJSProperty("open", false);
  await hints.locator("summary").click();
  await expect(page.getByText("ps -eo pid,ppid,comm,rss --sort=-rss | head")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verify your result" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "If something goes wrong" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "When you finish" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Review Module 01/ })).toHaveCount(1);
  await expect(page.getByLabel("How independently can you do this?")).toBeVisible();
  await page.getByRole("link", { name: "Record your work" }).click();
  await expect(page.locator("#progress-editor-A01")).toBeInViewport();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: path.join(screenshotDirectory, "activity-a01-mobile.png"), fullPage: true });
});

test("all module and activity pages render their complete learning sequence", async ({ page }) => {
  for (let number = 1; number <= 24; number += 1) {
    const moduleId = String(number).padStart(2, "0");
    const activityId = `A${moduleId}`;

    await page.goto(`/modules/${moduleId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`Module ${moduleId}:`);
    await expect(page.getByRole("heading", { name: "Concept lessons" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Guided practice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Check your understanding" })).toBeVisible();
    await expect(page.locator(`#progress-editor-M${moduleId}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Readiness check" })).toBeVisible();

    const invalidObjectiveLinks = await page.locator(".module-objectives a[href^='#']").evaluateAll((links) =>
      links.some((link) => !document.getElementById((link as HTMLAnchorElement).hash.slice(1))),
    );
    expect(invalidObjectiveLinks, `M${moduleId} objective anchor`).toBe(false);
    const recordBeforeContinuation = await page.evaluate(() => {
      const record = document.querySelector(".learning-record-section");
      const continuation = document.querySelector(".module-pagination");
      return Boolean(record && continuation
        && (record.compareDocumentPosition(continuation) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(recordBeforeContinuation, `M${moduleId} record precedes continuation`).toBe(true);

    const recall = page.locator(".recall-prompt");
    await page.locator(".recall-prompt > summary").click();
    await expect(recall.getByRole("heading", { level: 3 })).toBeVisible();
    const modelExplanation = recall.locator(".recall-answer");
    await page.locator(".recall-answer > summary").click();
    await expect(modelExplanation.locator(".article-copy")).toBeVisible();

    await page.goto(`/activities/${activityId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
    await expect(page.locator(".activity-environment")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your challenge" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Practice steps" })).toBeVisible();
    expect(await page.locator("#activity-steps ol > li").count()).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: "Build outcome" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Verify your result" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What to submit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Self-check" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Work independently" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "When you finish" })).toBeVisible();
    await expect(page.locator(`#progress-editor-${activityId}`)).toBeVisible();
  }
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
