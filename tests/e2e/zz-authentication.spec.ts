import { expect, test } from "@playwright/test";

const otherLearnerState = process.env.FIELDNOTES_E2E_OTHER_STATE;
const staleSessionState = process.env.FIELDNOTES_E2E_STALE_STATE;
const ownerState = process.env.FIELDNOTES_E2E_OWNER_STATE;

function progressRecord(notes: string) {
  return {
    itemType: "module",
    itemId: "M24",
    status: "in_progress",
    comfort: null,
    notes,
    evidence: "Account isolation regression test.",
    repositoryUrl: "",
  };
}

test("public curriculum stays open while private progress requires a session", async ({ browser }) => {
  const anonymous = await browser.newContext({
    baseURL: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000"),
    storageState: { cookies: [], origins: [] },
  });
  try {
    const page = await anonymous.newPage();
    await page.goto("/modules/01");
    await expect(page.getByRole("heading", { level: 1, name: /Module 01/ })).toBeVisible();
    await expect(page.getByText("Sign in to view your saved progress.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in in a new tab" })).toBeVisible();
    await expect(page.getByText("Loading saved progress…")).toHaveCount(0);

    await page.goto("/modules/01/lessons/m01-l01");
    await expect(page.getByRole("complementary", { name: "Module lesson navigation" }).getByText("Sign in to view saved progress")).toBeVisible();
    await expect(page.getByText("Progress unavailable")).toHaveCount(0);

    const read = await page.request.get("/api/progress");
    expect(read.status()).toBe(401);
    expect(await read.json()).toMatchObject({ code: "AUTH_REQUIRED" });

    const write = await page.request.put("/api/progress", {
      headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000") },
      data: { record: progressRecord("Anonymous data must not be stored."), expectedRevision: null },
    });
    expect(write.status()).toBe(401);

    await page.goto("/sign-in?returnTo=%2Froadmap");
    await expect(page.getByRole("heading", { name: "Sign in to Fieldnotes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue exploring without signing in" })).toBeVisible();
    await expect(page.getByText("No invitation is needed.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy notice" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms" }).first()).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
  } finally {
    await anonymous.close();
  }
});

test("progress reads and writes are isolated to the signed-in account", async ({ browser, page }) => {
  expect(otherLearnerState, "the isolated second account state is prepared by global setup").toBeTruthy();

  const ownerWrite = await page.request.put("/api/progress", {
    headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000") },
    data: { record: { ...progressRecord("Owner's private project decision."), userId: "learner@fieldnotes.test" }, expectedRevision: null },
  });
  expect(ownerWrite.ok()).toBeTruthy();

  const other = await browser.newContext({
    baseURL: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000"),
    storageState: otherLearnerState,
  });
  try {
    const otherPage = await other.newPage();
    const initialRead = await otherPage.request.get("/api/progress?itemType=module&itemId=M24");
    expect(initialRead.ok()).toBeTruthy();
    expect(await initialRead.json()).toEqual([]);

    const otherWrite = await otherPage.request.put("/api/progress", {
      headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000") },
      data: { record: progressRecord("Second learner's separate note."), expectedRevision: null },
    });
    expect(otherWrite.ok()).toBeTruthy();

    const ownerRead = await page.request.get("/api/progress?itemType=module&itemId=M24");
    expect(await ownerRead.json()).toMatchObject([{ notes: "Owner's private project decision." }]);
    const otherRead = await otherPage.request.get("/api/progress?itemType=module&itemId=M24");
    expect(await otherRead.json()).toMatchObject([{ notes: "Second learner's separate note." }]);

    const ownerSession = await page.request.get("/api/auth/get-session");
    const { user: { id: ownerId } } = await ownerSession.json() as { user: { id: string } };
    const staleAccountWrite = await otherPage.request.put("/api/progress", {
      headers: { Origin: `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`, "X-Fieldnotes-Account": ownerId },
      data: { record: progressRecord("A draft opened under the previous account."), expectedRevision: 1 },
    });
    expect(staleAccountWrite.status()).toBe(409);
    expect(await staleAccountWrite.json()).toMatchObject({ code: "ACCOUNT_CHANGED" });
    const afterSwitch = await otherPage.request.get("/api/progress?itemType=module&itemId=M24");
    expect(await afterSwitch.json()).toMatchObject([{ notes: "Second learner's separate note." }]);
  } finally {
    await other.close();
  }
});

test("an unsafe sign-in return path falls back inside Fieldnotes", async ({ page }) => {
  await page.goto("/sign-in?returnTo=%2F%2Fevil.example%2Ftakeover");
  await expect(page.getByRole("link", { name: "Continue to Fieldnotes" })).toHaveAttribute("href", "/account");
});

test("a provider failure gives a retryable message without exposing provider details", async ({ browser }) => {
  const anonymous = await browser.newContext({
    baseURL: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000"),
    storageState: { cookies: [], origins: [] },
  });
  try {
    const page = await anonymous.newPage();
    await page.goto("/sign-in?returnTo=%2Fprojects%2FP3%23project-review");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    let errorCallbackURL = "";
    await page.route("**/api/auth/sign-in/social", async (route) => {
      errorCallbackURL = route.request().postDataJSON().errorCallbackURL ?? "";
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "PROVIDER_UNAVAILABLE", message: "provider-internal-detail" }),
      });
    });
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect.poll(() => errorCallbackURL).not.toBe("");
    const failedDestination = new URL(errorCallbackURL);
    expect(failedDestination.pathname).toBe("/sign-in");
    expect(failedDestination.searchParams.get("returnTo")).toBe("/projects/P3#project-review");
    await expect(page.getByRole("alert").filter({ hasText: "Sign-in could not start. Check your connection and try again." }))
      .toHaveText("Sign-in could not start. Check your connection and try again.");
    await expect(page.getByText("provider-internal-detail")).toHaveCount(0);
  } finally {
    await anonymous.close();
  }
});

test("sign-in layout stays readable without horizontal scrolling on compact screens", async ({ browser }) => {
  const anonymous = await browser.newContext({
    baseURL: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000"),
    storageState: { cookies: [], origins: [] },
  });
  try {
    const page = await anonymous.newPage();
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/sign-in");
      await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflows, `sign-in page should fit at ${width}px`).toBe(false);
    }
  } finally {
    await anonymous.close();
  }
});

test("signing out revokes access to private progress", async ({ browser }) => {
  expect(ownerState, "global setup creates the owner browser session").toBeTruthy();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000"),
    storageState: ownerState,
  });
  try {
    const page = await context.newPage();
    await page.goto("/account");
    const beforeSignOut = await page.request.get("/api/progress");
    expect(beforeSignOut.ok()).toBeTruthy();

    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL("/");
    const afterSignOut = await page.request.get("/api/progress");
    expect(afterSignOut.status()).toBe(401);
  } finally {
    await context.close();
  }
});

test("account deletion requires an explicit confirmation and removes that learner's records", async ({ browser }) => {
  expect(otherLearnerState, "the isolated second account state is prepared by global setup").toBeTruthy();
  const learner = await browser.newContext({
    baseURL: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000"),
    storageState: otherLearnerState,
  });
  try {
    const page = await learner.newPage();
    const before = await page.request.get("/api/progress?itemType=module&itemId=M24");
    expect(await before.json()).toMatchObject([{ notes: "Second learner's separate note." }]);
    await page.goto("/account");
    await page.getByRole("button", { name: "Delete account and saved work" }).click();
    const confirmation = page.getByLabel("Type DELETE to confirm");
    await expect(page.getByRole("button", { name: "Permanently delete account" })).toBeDisabled();
    await confirmation.fill("DELETE");
    await page.getByRole("button", { name: "Permanently delete account" }).click();
    await expect(page).toHaveURL(/accountDeleted=1/);
    await expect(page.getByRole("status")).toContainText("Your account and saved learning records have been deleted");
    const after = await page.request.get("/api/progress");
    expect(after.status()).toBe(401);

    const retry = await learner.request.post("/api/auth/sign-in/email", {
      data: {
        email: "learner@fieldnotes.test",
        password: process.env.FIELDNOTES_E2E_PASSWORD,
      },
    });
    expect(retry.status()).toBe(401);
  } finally {
    await learner.close();
  }
});

test("deleting from an old session asks the learner to sign in again", async ({ browser }) => {
  expect(staleSessionState, "global setup creates an isolated stale browser session").toBeTruthy();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000"),
    storageState: staleSessionState,
  });
  try {
    const page = await context.newPage();
    await page.goto("/account");
    await page.getByRole("button", { name: "Delete account and saved work" }).click();
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Permanently delete account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "For your security, sign in again before deleting your account." }))
      .toHaveText("For your security, sign in again before deleting your account.");
    await page.getByRole("button", { name: "Sign in again" }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  } finally {
    await context.close();
  }
});
