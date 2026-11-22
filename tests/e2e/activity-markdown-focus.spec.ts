import { expect, test } from "@playwright/test";

test("A01 keeps task guidance mounted while the learner edits", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/activities/A01");
  const observation = page.getByRole("textbox", { name: "Task observation" });
  await expect(observation).toBeEnabled();

  const task = page.locator('#activity-steps [data-task-id="compare-proc"]');
  const help = task.locator("details.activity-task-help");
  await expect(help.locator("summary")).toHaveText("Command notes and troubleshooting");
  await help.evaluate((element) => { element.setAttribute("data-regression-identity", "original"); });
  await help.locator("summary").click();
  await expect(help).toHaveAttribute("open", "");

  await expect(page.locator(".activity-a01-instructions .module-diagram figcaption"))
    .toHaveText("Conceptual example of a file request crossing into kernel services");
  const copy = page.locator("#activity-steps .copy-code-button").first();
  await copy.click();
  await expect(copy).toHaveText("Copied");

  await observation.fill("The same help disclosure should remain open while I type.");
  await expect(observation).toBeFocused();
  await expect(help).toHaveAttribute("open", "");
  await expect(help).toHaveAttribute("data-regression-identity", "original");
  await expect(page.locator("#activity-steps [data-task-id]")).toHaveCount(5);

  await page.setViewportSize({ width: 390, height: 844 });
  const opener = task.getByRole("button", { name: "Record Task 3 in the investigation notebook" });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(observation).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();

  await opener.click();
  await expect(observation).toBeFocused();
  await page.getByRole("button", { name: "Close notebook" }).click();
  await expect(opener).toBeFocused();
});

test("generic activity notebook keeps its selected note and returns focus to its task opener", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseProgress!: () => void;
  const progressGate = new Promise<void>((resolve) => { releaseProgress = resolve; });
  await page.route("**/api/progress?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("itemId") === "A02") await progressGate;
    await route.continue();
  });

  await page.goto("/activities/A02");
  const opener = page.getByRole("button", { name: "Record Task 2 in the investigation notebook" });
  await expect(opener).toBeDisabled();
  releaseProgress();
  await expect(opener).toBeEnabled();
  await expect(page.locator("#activity-steps [data-task-id]")).toHaveCount(7);

  await opener.click();
  const observation = page.getByRole("textbox", { name: "Task observation" });
  await expect(observation).toBeFocused();
  await observation.fill("The generic activity keeps this note in the selected task.");
  await expect(observation).toHaveValue("The generic activity keeps this note in the selected task.");
  await expect(observation).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();

  const pointerOpener = page.getByRole("button", { name: "Record Task 3 in the investigation notebook" });
  await pointerOpener.click();
  await expect(observation).toBeFocused();
  await page.getByRole("button", { name: "Close notebook" }).click();
  await expect(pointerOpener).toBeFocused();

  await pointerOpener.click();
  await expect(observation).toBeFocused();
  await page.locator(".activity-a01-notebook-backdrop").click({ position: { x: 8, y: 8 } });
  await expect(pointerOpener).toBeFocused();
});

test("public module Markdown remains in the server response", async ({ page }) => {
  const response = await page.request.get("/modules/01");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('class="article-copy"');
  expect(html).toContain("How computers and operating systems work");
});
