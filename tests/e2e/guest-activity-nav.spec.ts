import { expect, test } from "@playwright/test";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

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
      await expect(page.getByRole("link", { name: "Sign in in a new tab" })).toBeVisible();
      await expect(page.locator("#activity-steps")).toBeVisible();
      await expect(page.locator("#activity-steps").locator("summary").first()).toBeVisible();
      await expect(page.locator(`#progress-editor-${activityId}`).getByRole("textbox").first()).toBeDisabled();
      await expect(page.locator(`#progress-editor-${activityId}`).getByRole("button", { name: "Save draft" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Mark activity complete" })).toBeDisabled();
      await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(0);
      expect(writes).toBe(0);
    }
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
    await guestPage.getByRole("button", { name: "Open navigation menu" }).click();
    const guestDrawer = guestPage.getByRole("complementary", { name: "Main navigation" });
    await expect(guestDrawer).toHaveClass(/open/);
    await guestDrawer.getByRole("link", { name: "Sign in" }).click();
    await expect(guestPage).toHaveURL(/\/sign-in\?returnTo=%2Faccount/);
    await expect(guestPage.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "false");
    await expect(guestPage.getByRole("heading", { name: "Keep your engineering notes together." })).toBeVisible();
  } finally {
    await anonymous.close();
  }

  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const drawer = page.getByRole("complementary", { name: "Main navigation" });
  await expect(drawer.getByRole("link", { name: "Account for owner@fieldnotes.test" })).toBeVisible();
  await drawer.getByRole("link", { name: "Account for owner@fieldnotes.test" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
});
