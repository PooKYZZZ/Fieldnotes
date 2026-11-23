import { expect, test } from "@playwright/test";

test("review checkpoint links select the URL checkpoint without replacing its notebook", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let checkpointWrites = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/progress") && request.method() === "PUT") checkpointWrites += 1;
  });

  await page.goto("/projects/S02");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Build" }).click();
  await page.getByText(/^Checkpoint map/).click();
  await expect(page.getByRole("navigation", { name: "Build checkpoints" }).getByRole("button")).toHaveCount(4);
  const editor = await page.locator("#progress-editor-S02").elementHandle();
  expect(editor).not.toBeNull();
  await expect(page.locator("#status-S02")).toBeEnabled();

  for (const id of ["S02.2", "S02.3"]) {
    await page.getByRole("button", { name: new RegExp(`^${id.replace(".", "\\.")} `) }).click();
    const checkpoint = page.locator(`[id="milestone-check-${id}"]`);
    if (!(await checkpoint.isChecked())) await checkpoint.check();
    await expect(page.locator(".project-checkpoint-message")).toHaveText("Checkpoint progress saved.");
  }

  const note = page.locator('[id="checkpoint-observation-S02-S02.3"]');
  const draft = "Synthetic draft remains in the same project notebook.";
  await note.fill(draft);
  await page.getByRole("tab", { name: "Review" }).click();
  const reviewLink = page.locator('.project-checkpoint-review a[href$="#milestone-S02.2"]');
  await expect(reviewLink).toBeVisible();
  await reviewLink.click();

  await expect(page).toHaveURL(/#milestone-S02\.2$/);
  await expect(page.getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /^S02\.2\b/ })).toHaveAttribute("aria-current", "step");
  await expect(page.locator('[id="milestone-title-S02.2"]')).toBeFocused();
  await expect(page.locator(".project-notebook-context")).toContainText("S02.2 ·");
  await expect(page.locator("#progress-editor-S02")).toContainText("Checkpoint note · S02.2");
  await expect(page.locator('[id="milestone-check-S02.2"]')).toBeChecked();
  expect(await editor?.evaluate((element) => element.isConnected)).toBe(true);
  expect(checkpointWrites).toBe(2);

  await page.goBack();
  await expect(page).toHaveURL(/#project-review$/);
  await expect(page.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(page).toHaveURL(/#milestone-S02\.2$/);
  await expect(page.getByRole("button", { name: /^S02\.2\b/ })).toHaveAttribute("aria-current", "step");

  await page.goBack();
  await expect(page.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-selected", "true");
  await page.locator('.project-checkpoint-review a[href$="#milestone-S02.3"]').click();
  await expect(page).toHaveURL(/#milestone-S02\.3$/);
  await expect(page.getByRole("button", { name: /^S02\.3\b/ })).toHaveAttribute("aria-current", "step");
  await expect(page.locator('[id="checkpoint-observation-S02-S02.3"]')).toHaveValue(draft);
  await expect(page.locator('[id="milestone-check-S02.3"]')).toBeChecked();
  expect(await editor?.evaluate((element) => element.isConnected)).toBe(true);
  expect(checkpointWrites).toBe(2);
});

test("direct project checkpoint links win and unknown checkpoints use the next unfinished step", async ({ page }) => {
  await page.goto("/projects/S02#milestone-S02.3");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /^S02\.3\b/ })).toHaveAttribute("aria-current", "step");

  await page.evaluate(() => { window.location.hash = "#milestone-not-a-checkpoint"; });
  await expect(page.getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /^S02\.1\b/ })).toHaveAttribute("aria-current", "step");
});

test("the mobile project notebook traps focus on its visible native disclosure while loading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseRecord = () => {};
  const recordGate = new Promise<void>((resolve) => { releaseRecord = resolve; });
  await page.route("**/api/progress?*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (route.request().method() === "GET" && requestUrl.searchParams.get("itemId") === "S02") {
      // This test covers an empty notebook. Other tests save S02 in the shared test database.
      await recordGate;
      return route.fulfill({ json: [] });
    }
    await route.continue();
  });

  await page.goto("/projects/S02");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Build" }).click();
  const opener = page.getByRole("button", { name: "Open project notebook for this checkpoint" });
  await expect(opener).toBeEnabled();
  await opener.click();
  const notebook = page.getByRole("dialog", { name: "Project notebook" });
  await expect(notebook).toBeVisible();
  const close = notebook.getByRole("button", { name: "Close" });
  const details = notebook.locator(".progress-project-wide-details");
  const summary = details.locator("summary");
  try {
    await expect(close).toBeFocused();
    await expect(notebook.getByLabel("Status")).toBeDisabled();
    await page.keyboard.press("Tab");
    await expect(summary).toBeFocused();
  } finally {
    releaseRecord();
  }

  const status = notebook.getByLabel("Status");
  const save = notebook.getByRole("button", { name: "Save project notebook" });
  await expect(status).toBeEnabled();
  await expect(details).toHaveJSProperty("open", false);
  await summary.focus();
  await page.keyboard.press("Tab");
  await expect(save).toBeFocused();
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(save).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
});
