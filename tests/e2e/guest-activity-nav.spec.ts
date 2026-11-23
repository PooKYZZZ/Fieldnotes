import { expect, test } from "@playwright/test";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

test("desktop navigation preserves the visible lesson and remembers the closed state", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 800 });
  await page.goto("/modules/01/lessons/m01-l02");
  const article = page.locator(".learning-lesson-reading");
  const paragraph = article.getByText(/^Inspect the thread count for a process you own/);
  await paragraph.evaluate((paragraph) => {
    window.scrollBy({ top: paragraph.getBoundingClientRect().top - 94, behavior: "instant" });
  });
  const before = await paragraph.evaluate((paragraph) => paragraph.getBoundingClientRect().top);
  const checkGap = () => article.evaluate((element) => {
    const outline = document.querySelector(".lesson-contents-sidebar");
    return outline ? outline.getBoundingClientRect().left - element.getBoundingClientRect().right : Infinity;
  });
  expect(await checkGap()).toBeLessThanOrEqual(56);
  const navigation = page.getByRole("complementary", { name: "Main navigation" });
  await navigation.getByRole("button", { name: "Close navigation", exact: true }).click();
  await expect(navigation).toBeHidden();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  expect(await checkGap()).toBeLessThanOrEqual(56);
  expect(Math.abs(await paragraph.evaluate((paragraph) => paragraph.getBoundingClientRect().top) - before)).toBeLessThan(4);
  await page.reload();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(navigation.getByRole("button", { name: "Close navigation", exact: true })).toBeFocused();
});

test("guest activity records stay read-only while public guidance remains usable", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const page = await context.newPage();
    let writes = 0;
    page.on("request", (request) => {
      if (request.method() === "PUT" && request.url().startsWith(`${testOrigin}/api/progress`)) writes++;
    });

    for (const activityId of ["A01", "A02"]) {
      await page.goto(`${testOrigin}/activities/${activityId}`);
      await expect(page.getByRole("link", { name: "Sign in to save (opens in a new tab)" })).toBeVisible();
      await expect(page.locator("#activity-steps")).toBeVisible();
      await expect(page.locator("#activity-steps").locator("summary").first()).toBeVisible();
      await expect(page.locator(`#progress-editor-${activityId}`).getByRole("textbox")).toHaveCount(0);
      await expect(page.locator(`#progress-editor-${activityId}`).getByRole("button", { name: "Save observations" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Mark activity complete" })).toBeDisabled();
      await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(0);
      expect(writes).toBe(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${testOrigin}/activities/A01`);
    const trigger = page.getByRole("button", { name: /^Open investigation notebook/ });
    await trigger.click();
    const notebook = page.getByRole("dialog", { name: "A01 investigation notebook" });
    await expect(notebook.getByRole("link", { name: "Sign in to save (opens in a new tab)" })).toBeVisible();
    const size = await notebook.boundingBox();
    expect(size?.height).toBeLessThan(844 / 2);
    await page.keyboard.press("Escape");
    await expect(notebook).toBeHidden();
    await expect(trigger).toBeFocused();
  } finally {
    await context.close();
  }
});

test("mobile account navigation closes the drawer for guest and signed-in routes", async ({ browser, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const guestPage = await anonymous.newPage();
    await guestPage.setViewportSize({ width: 390, height: 844 });
    await guestPage.goto(`${testOrigin}/`);
    await expect(guestPage.getByRole("heading", { level: 1, name: "Learn DevOps" })).toBeVisible();
    await expect(guestPage.getByRole("link", { name: "Start lesson" })).toBeVisible();
    await expect(guestPage.getByRole("heading", { name: "Curriculum progress" })).toHaveCount(0);
    await guestPage.getByRole("button", { name: "Open navigation" }).click();
    const guestDrawer = guestPage.getByRole("complementary", { name: "Main navigation" });
    await expect(guestDrawer).toHaveClass(/open/);
    await guestDrawer.getByRole("link", { name: "Sign in" }).click();
    await expect(guestPage).toHaveURL(/\/sign-in\?returnTo=%2Faccount/);
    await expect(guestPage.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
    await expect(guestPage.getByRole("heading", { name: "Sign in to Fieldnotes" })).toBeVisible();
  } finally {
    await anonymous.close();
  }

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "My learning" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Curriculum progress" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("complementary", { name: "Main navigation" });
  await expect(drawer.getByRole("link", { name: "Account for owner@fieldnotes.test" })).toBeVisible();
  await drawer.getByRole("link", { name: "Account for owner@fieldnotes.test" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
});
