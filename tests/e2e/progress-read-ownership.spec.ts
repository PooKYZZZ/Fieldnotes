import { expect, test, type Browser, type Page } from "@playwright/test";

const baseURL = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

type ProgressTraffic = { started: string[]; completed: string[] };

function watchProgress(page: Page): ProgressTraffic {
  const traffic: ProgressTraffic = { started: [], completed: [] };
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/progress" && request.method() === "GET") traffic.started.push(url.search || "(all records)");
  });
  page.on("response", (response) => {
    const request = response.request();
    const url = new URL(response.url());
    if (url.pathname === "/api/progress" && request.method() === "GET") traffic.completed.push(`${url.search || "(all records)"} -> ${response.status()}`);
  });
  return traffic;
}

async function waitForRoute(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await expect(page.locator("main")).toBeVisible();
  await page.waitForTimeout(750);
}

async function captureGuestFlow(browser: Browser): Promise<ProgressTraffic[]> {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  const traffic = watchProgress(page);
  const byStage: ProgressTraffic[] = [];
  let requestCursor = 0;
  let responseCursor = 0;
  const recordStage = () => {
    byStage.push({
      started: traffic.started.slice(requestCursor),
      completed: traffic.completed.slice(responseCursor),
    });
    requestCursor = traffic.started.length;
    responseCursor = traffic.completed.length;
  };
  await waitForRoute(page, "/");
  recordStage();
  await waitForRoute(page, "/modules/01/lessons/m01-l01");
  recordStage();
  await waitForRoute(page, "/progress");
  recordStage();
  await waitForRoute(page, "/projects/P1#project-build");
  await expect(page.getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Review your saved project notes" })).toBeVisible();
  await page.waitForTimeout(750);
  recordStage();
  await waitForRoute(page, "/activities/A01");
  recordStage();
  await context.close();
  return byStage;
}

test("known guests skip private reads across the learner workflow", async ({ browser }) => {
  const stages = await captureGuestFlow(browser);
  const started = stages.reduce((total, stage) => total + stage.started.length, 0);
  const completed = stages.reduce((total, stage) => total + stage.completed.length, 0);
  expect({ started, completed }).toEqual({ started: 0, completed: 0 });
  console.log("GUEST_PROGRESS_READ_COMPARISON", JSON.stringify({ before: { started: 6, completed: 5 }, after: { started, completed }, stages }));
});

test("Build and Review share one saved project detail read", async ({ page }) => {
  const traffic = watchProgress(page);
  await waitForRoute(page, "/projects/P1#project-build");
  await expect(page.getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Review your saved project notes" })).toBeVisible();
  await page.waitForTimeout(750);
  const projectDetailStarts = traffic.started.filter((query) => query.includes("itemType=project") && query.includes("itemId=P1"));
  const projectDetailResponses = traffic.completed.filter((result) => result.startsWith("?itemType=project&itemId=P1 ->"));
  expect(projectDetailStarts).toHaveLength(1);
  expect(projectDetailResponses).toHaveLength(1);
  expect(traffic.completed.some((result) => result === "?summary=true -> 200")).toBe(true);
  console.log("SIGNED_IN_PROJECT_READ_COMPARISON", JSON.stringify({ before: { started: 6, completed: 3 }, after: traffic }));
});

test("project overview and Plan do not read private details before Build or Review opens", async ({ page }) => {
  const traffic = watchProgress(page);
  await waitForRoute(page, "/projects/P1");
  await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  expect(traffic.started).toHaveLength(0);
  await page.getByRole("tab", { name: "Plan" }).click();
  await expect(page.getByRole("tab", { name: "Plan" })).toHaveAttribute("aria-selected", "true");
  expect(traffic.started).toHaveLength(0);
  await page.getByRole("tab", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Review your saved project notes" })).toBeVisible();
  await expect.poll(() => traffic.completed.some((result) => result.startsWith("?itemType=project&itemId=P1 ->"))).toBe(true);
  expect(traffic.started.filter((query) => query.includes("itemType=project") && query.includes("itemId=P1"))).toHaveLength(1);
});

test("auth outage keeps project content public and offers a working retry", async ({ page }) => {
  let unavailable = true;
  let sessionReads = 0;
  await page.route("**/api/auth/get-session", async (route) => {
    sessionReads += 1;
    if (unavailable) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Session service unavailable" }) });
    else await route.continue();
  });
  const traffic = watchProgress(page);
  await page.goto("/projects/P1#project-build");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/account could not be checked/i).first()).toBeVisible();
  expect(traffic.started).toHaveLength(0);
  unavailable = false;
  const readsBeforeRetry = sessionReads;
  await page.getByRole("button", { name: "Retry account check" }).last().click();
  await page.getByText("Project-wide notes and final evidence", { exact: false }).click();
  await expect(page.getByLabel("Engineering log")).toBeVisible();
  expect(sessionReads - readsBeforeRetry).toBe(1);
  expect(traffic.started.filter((query) => query.includes("itemType=project") && query.includes("itemId=P1"))).toHaveLength(1);
});

test("Review shows persisted project notes while an unsaved Build draft remains local", async ({ page }) => {
  const notes = page.getByLabel("Engineering log");
  await page.goto("/projects/P1#project-build");
  await page.getByText("Project-wide notes and final evidence", { exact: false }).click();
  await expect(notes).toBeVisible();
  await notes.fill("Unsaved project draft stays out of Review");
  await page.getByRole("tab", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Review your saved project notes" })).toBeVisible();
  const reviewedDraft = page.locator(".project-record-review-fields").getByText("Unsaved project draft stays out of Review");
  await expect(reviewedDraft).toHaveCount(0);
  await page.getByRole("tab", { name: "Build" }).click();
  await expect(notes).toHaveValue("Unsaved project draft stays out of Review");
  await page.getByRole("button", { name: "Save project notebook" }).click();
  await expect(page.getByText("Saved to your account.")).toBeVisible();
  await page.getByRole("tab", { name: "Review" }).click();
  await expect(page.locator(".project-record-review-fields").getByText("Unsaved project draft stays out of Review")).toBeVisible();
});

test("failed project detail GET retries from the Build notebook", async ({ page }) => {
  let failedOnce = false;
  await page.route("**/api/progress?itemType=project&itemId=P1", async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Temporary read failure" }) });
    } else {
      await route.continue();
    }
  });
  await page.goto("/projects/P1#project-build");
  await expect(page.getByText("The saved project record could not be loaded. Retry before editing to avoid overwriting existing notes.")).toBeVisible();
  await page.getByRole("button", { name: "Retry loading" }).click();
  await expect(page.getByRole("button", { name: "Save project notebook" })).toBeEnabled();
  expect(failedOnce).toBe(true);
});

test("notebook hides private rows and asks to reopen after an account-change 409", async ({ page }) => {
  await page.route("**/api/progress", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ code: "ACCOUNT_CHANGED", error: "The signed-in account changed." }),
      });
      return;
    }
    await route.continue();
  });
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "The signed-in account changed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload this page" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved learning record" })).toHaveCount(0);
});
