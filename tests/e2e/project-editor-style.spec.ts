import { expect, test } from "@playwright/test";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

test("project editor modifier selects its desktop and compact notebook rules", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects/S02#project-build");
  const editor = page.locator("#progress-editor-S02");
  await expect(editor).toHaveClass(/progress-editor--project-workbench/);
  await expect(editor).toHaveCSS("border-top-width", "1px");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("button", { name: /Open project notebook for this checkpoint/ }).click();
    const dialogEditor = page.getByRole("dialog", { name: "Project notebook" }).locator("#progress-editor-S02");
    await expect(dialogEditor).toHaveClass(/progress-editor--project-workbench/);
    await expect(dialogEditor).toHaveCSS("border-top-width", "0px");
    await expect(dialogEditor.getByLabel("Engineering log")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.keyboard.press("Escape");
  }
});

test("guest project guidance remains public while the private notebook asks for sign-in", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const page = await context.newPage();
    await page.goto(`${testOrigin}/projects/S02#project-build`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#progress-editor-S02").getByRole("link", { name: "Sign in in a new tab" })).toBeVisible();
    await expect(page.locator("#project-build")).toContainText("Build");
  } finally {
    await context.close();
  }
});
