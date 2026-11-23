import { readFileSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const origin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

async function refetchSession(page: Page) {
  // Better Auth listens for this storage event when the session changes in another tab.
  await page.evaluate(() => window.dispatchEvent(new StorageEvent("storage", {
    key: "better-auth.message",
    newValue: JSON.stringify({ event: "session", data: { trigger: "signIn" } }),
  })));
}

function sessionCookies(path: string | undefined) {
  if (!path) throw new Error("The isolated Playwright session was not prepared.");
  return (JSON.parse(readFileSync(path, "utf8")) as {
    cookies: Parameters<BrowserContext["addCookies"]>[0];
  }).cookies;
}

async function useSession(page: Page, path: string | undefined) {
  await page.context().clearCookies();
  await page.context().addCookies(sessionCookies(path));
  await refetchSession(page);
}

test("an outage after sign-in hides account notes and recovers the original draft", async ({ page }) => {
  let unavailable = false;
  await page.route("**/api/auth/get-session", (route) => unavailable
    ? route.fulfill({ status: 503, json: { message: "Synthetic session outage" } })
    : route.continue());

  await page.goto("/projects/S03#project-build");
  const editor = page.locator("#progress-editor-S03");
  const note = editor.getByLabel("Checkpoint note · S03.1");
  const draft = "Draft survives an unavailable account service.";
  await expect(note).toBeEnabled();
  await note.fill(draft);

  unavailable = true;
  await refetchSession(page);
  await expect(page.getByText("Your account could not be checked.", { exact: false })).toBeVisible();
  await expect(note).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  unavailable = false;
  await page.getByRole("button", { name: "Retry account check", exact: true }).click();
  await expect(note).toBeEnabled();
  await expect(note).toHaveValue(draft);
});

test("switching accounts during a save keeps the original draft private", async ({ page }) => {
  const oldDraft = "This draft belongs only to the original synthetic learner.";
  let reachedSave = false;
  let releaseSave = () => {};
  const saveGate = new Promise<void>((resolve) => { releaseSave = resolve; });
  await page.route("**/api/progress", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    const request = route.request().postDataJSON() as { record: Record<string, unknown> };
    reachedSave = true;
    await saveGate;
    await route.fulfill({ json: { ...request.record, revision: 1, updatedAt: Date.now() } }).catch(() => {});
  });

  await page.goto("/projects/S08#project-build");
  const editor = page.locator("#progress-editor-S08");
  const note = editor.getByLabel("Checkpoint note", { exact: false });
  await expect(note).toBeEnabled();
  await note.fill(oldDraft);
  await editor.getByRole("button", { name: "Save project notebook" }).click();
  try {
    await expect.poll(() => reachedSave).toBe(true);
    await useSession(page, process.env.FIELDNOTES_E2E_OTHER_STATE);
    await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
    await expect(note).toBeEnabled();
    await expect(note).toHaveValue("");
    releaseSave();
    await page.getByRole("tab", { name: "Review" }).click();
    await expect(page.getByText("No project record has been saved yet.", { exact: false })).toBeVisible();
    await expect(page.getByText(oldDraft)).toHaveCount(0);

    await useSession(page, process.env.FIELDNOTES_E2E_OWNER_STATE);
    await page.getByRole("tab", { name: "Build" }).click();
    await expect(note).toHaveValue(oldDraft);
  } finally {
    releaseSave();
  }
});

test("a late project GET cannot replace the current account’s snapshot", async ({ page }) => {
  const oldNotes = "Private project notes from the initial synthetic account.";
  let firstAccount: string | undefined;
  let releaseRead = () => {};
  const readGate = new Promise<void>((resolve) => { releaseRead = resolve; });
  await page.route("**/api/progress?itemType=small_project&itemId=S07", async (route) => {
    const account = route.request().headers()["x-fieldnotes-account"];
    firstAccount ??= account;
    if (account !== firstAccount) return route.continue();
    await readGate;
    await route.fulfill({ json: [{
      itemType: "small_project", itemId: "S07", status: "in_progress", comfort: null,
      notes: oldNotes, evidence: "", repositoryUrl: "", revision: 1, updatedAt: Date.now(),
    }] }).catch(() => {});
  });

  try {
    await page.goto("/projects/S07#project-review");
    await expect.poll(() => Boolean(firstAccount)).toBe(true);
    await useSession(page, process.env.FIELDNOTES_E2E_OTHER_STATE);
    await expect(page.getByText("No project record has been saved yet.", { exact: false })).toBeVisible();
    releaseRead();
    await page.getByRole("tab", { name: "Build" }).click();
    await expect(page.getByRole("button", { name: "Save project notebook" })).toBeEnabled();
    await page.getByRole("tab", { name: "Review" }).click();
    await expect(page.getByText(oldNotes)).toHaveCount(0);
  } finally {
    releaseRead();
  }
});

test("restoring a project invalidates an open Review snapshot", async ({ page }) => {
  const restoredNotes = "Synthetic restored engineering notes.";
  await page.goto("/projects/S06#project-review");
  await expect(page.getByText("No project record has been saved yet.", { exact: false })).toBeVisible();
  const restored = await page.request.post("/api/progress", {
    headers: { Origin: origin },
    data: {
      version: 3,
      exportedAt: new Date().toISOString(),
      records: [{
        itemType: "small_project", itemId: "S06", status: "in_progress", comfort: null,
        notes: restoredNotes, evidence: "", repositoryUrl: "", updatedAt: Date.now(),
      }],
    },
  });
  expect(restored.ok()).toBeTruthy();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("progress-updated", { detail: { source: "restore" } })));
  await expect(page.locator(".project-record-review-fields").getByText(restoredNotes)).toBeVisible();
});

test("A01 can edit and clear a URL-only legacy record and locks editing during save", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: origin,
    storageState: process.env.FIELDNOTES_E2E_OTHER_STATE,
  });
  let releaseSave = () => {};
  const saveGate = new Promise<void>((resolve) => { releaseSave = resolve; });
  try {
    const page = await context.newPage();
    const firstUrl = "https://example.test/legacy-a01";
    const nextUrl = "https://example.test/legacy-a01-updated";
    const imported = await page.request.post("/api/progress", {
      headers: { Origin: origin },
      data: {
        version: 1,
        exportedAt: new Date().toISOString(),
        records: [{
          itemType: "activity", itemId: "A01", status: "in_progress", comfort: null,
          notes: "", evidence: "", repositoryUrl: firstUrl, updatedAt: Date.now(),
        }],
      },
    });
    expect(imported.ok()).toBeTruthy();
    await page.goto("/activities/A01");
    const editor = page.locator("#progress-editor-A01");
    const legacy = editor.getByRole("button", { name: /Earlier unassigned note/ });
    const url = editor.getByLabel("Earlier reference link");
    await legacy.click();
    await expect(url).toHaveValue(firstUrl);
    await url.fill(nextUrl);
    await editor.getByRole("button", { name: "Save observations" }).click();
    await expect(page.getByRole("link", { name: "Open earlier reference link" })).toHaveAttribute("href", nextUrl);

    let reachedSave = false;
    await page.route("**/api/progress", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      reachedSave = true;
      await saveGate;
      await route.continue();
    });
    await url.fill("");
    await expect(url).toBeVisible();
    await editor.getByRole("button", { name: "Save observations" }).click();
    await expect.poll(() => reachedSave).toBe(true);
    await expect(url).toBeDisabled();
    releaseSave();
    await expect(editor.getByText("Draft saved to your account.")).toBeVisible();
    await expect(legacy).toHaveCount(0);
    const saved = await page.request.get("/api/progress?itemType=activity&itemId=A01");
    expect(await saved.json()).toMatchObject([{ notes: "", evidence: "", repositoryUrl: "" }]);
  } finally {
    releaseSave();
    await context.close();
  }
});
