import Database from "better-sqlite3";
import { expect, test, type BrowserContext } from "@playwright/test";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;
const ownerState = process.env.FIELDNOTES_E2E_OWNER_STATE;
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const sessionUpdateAgeMs = 24 * 60 * 60 * 1000;

function setOwnerSessionExpiry(expiresAt: number): void {
  const databasePath = process.env.FIELDNOTES_E2E_DATABASE_PATH;
  if (!databasePath) throw new Error("The isolated E2E database path is not configured.");
  const sqlite = new Database(databasePath);
  try {
    const update = sqlite.prepare('UPDATE session SET expires_at = ? WHERE user_id = (SELECT id FROM "user" WHERE email = ?)')
      .run(expiresAt, "owner@fieldnotes.test");
    if (update.changes !== 1) throw new Error("Could not age the isolated owner session.");
  } finally {
    sqlite.close();
  }
}

function ownerSessionExpiry(): number {
  const databasePath = process.env.FIELDNOTES_E2E_DATABASE_PATH;
  if (!databasePath) throw new Error("The isolated E2E database path is not configured.");
  const sqlite = new Database(databasePath);
  try {
    const row = sqlite.prepare('SELECT expires_at FROM session WHERE user_id = (SELECT id FROM "user" WHERE email = ?)')
      .get("owner@fieldnotes.test") as { expires_at: number } | undefined;
    if (!row) throw new Error("The isolated owner session is missing.");
    return row.expires_at;
  } finally {
    sqlite.close();
  }
}

async function ownerCookieExpiry(context: BrowserContext): Promise<number> {
  const cookie = (await context.cookies(testOrigin)).find(({ name }) => name.endsWith("session_token"));
  if (!cookie) throw new Error("The isolated browser session cookie is missing.");
  return cookie.expires;
}

test("a server-rendered session read leaves browser renewal available", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: testOrigin, storageState: ownerState });
  const originalDatabaseExpiry = ownerSessionExpiry();
  let releaseSessionRead = () => {};
  const sessionReadGate = new Promise<void>((resolve) => { releaseSessionRead = resolve; });
  try {
    const now = Date.now();
    setOwnerSessionExpiry(now + sessionLifetimeMs - sessionUpdateAgeMs - 60_000);
    const initialCookieExpiry = await ownerCookieExpiry(context);
    const initialDatabaseExpiry = ownerSessionExpiry();
    const page = await context.newPage();
    let sessionReadStarted = false;
    let sessionReadStatus: number | undefined;
    await page.route("**/api/auth/get-session", async (route) => {
      sessionReadStarted = true;
      await sessionReadGate;
      await route.continue();
    });
    page.on("response", (response) => {
      if (response.url().endsWith("/api/auth/get-session")) sessionReadStatus = response.status();
    });

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Your Fieldnotes account" })).toBeVisible();
    await expect.poll(() => sessionReadStarted).toBe(true);
    expect(ownerSessionExpiry()).toBe(initialDatabaseExpiry);
    expect(await ownerCookieExpiry(context)).toBe(initialCookieExpiry);

    releaseSessionRead();
    await expect.poll(() => sessionReadStatus).toBe(200);
    await expect.poll(ownerSessionExpiry).toBeGreaterThan(initialDatabaseExpiry);
    await expect.poll(() => ownerCookieExpiry(context)).toBeGreaterThan(initialCookieExpiry);
  } finally {
    releaseSessionRead();
    await context.close();
    setOwnerSessionExpiry(originalDatabaseExpiry);
  }
});

test("a session outside the refresh window keeps its expiry and cookie", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: testOrigin, storageState: ownerState });
  const originalDatabaseExpiry = ownerSessionExpiry();
  try {
    const now = Date.now();
    const expiry = now + sessionLifetimeMs - sessionUpdateAgeMs + 60_000;
    setOwnerSessionExpiry(expiry);
    const initialCookieExpiry = await ownerCookieExpiry(context);
    const page = await context.newPage();

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Your Fieldnotes account" })).toBeVisible();
    expect(ownerSessionExpiry()).toBe(expiry);
    const browserRead = await page.evaluate(async () => (await fetch("/api/auth/get-session")).status);
    expect(browserRead).toBe(200);
    expect(ownerSessionExpiry()).toBe(expiry);
    expect(await ownerCookieExpiry(context)).toBe(initialCookieExpiry);
  } finally {
    await context.close();
    setOwnerSessionExpiry(originalDatabaseExpiry);
  }
});
