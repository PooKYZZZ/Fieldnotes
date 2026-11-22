import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { request } from "@playwright/test";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;
const runId = process.env.FIELDNOTES_E2E_RUN_ID;
const users = [
  {
    name: "Fieldnotes E2E owner",
    email: "owner@fieldnotes.test",
    state: process.env.FIELDNOTES_E2E_OWNER_STATE,
  },
  {
    name: "Fieldnotes E2E learner",
    email: "learner@fieldnotes.test",
    state: process.env.FIELDNOTES_E2E_OTHER_STATE,
  },
  {
    name: "Fieldnotes stale-session learner",
    email: "stale-session@fieldnotes.test",
    state: process.env.FIELDNOTES_E2E_STALE_STATE,
  },
];

export default async function globalSetup(): Promise<void> {
  const password = process.env.FIELDNOTES_E2E_PASSWORD;
  if (!password || !runId || !/^[a-f0-9]{32}$/.test(runId) || users.some(({ state }) => !state)) {
    throw new Error("Playwright test authentication is not configured.");
  }

  for (const user of users) {
    const statePath = user.state!;
    mkdirSync(path.dirname(statePath), { recursive: true });
    const context = await request.newContext({ baseURL: testOrigin });
    try {
      const response = await context.post("/api/auth/sign-up/email", {
        data: { name: user.name, email: user.email, password },
        timeout: 90_000,
      });
      if (!response.ok()) {
        throw new Error(`Could not create the isolated ${user.name} test session (HTTP ${response.status()}).`);
      }
      await context.storageState({ path: statePath });
    } finally {
      await context.dispose();
    }
  }

  const databasePath = process.env.FIELDNOTES_E2E_DATABASE_PATH;
  if (!databasePath) throw new Error("The isolated E2E database path is not configured.");
  const sqlite = new Database(databasePath);
  try {
    const update = sqlite.prepare('UPDATE session SET created_at = ? WHERE user_id = (SELECT id FROM "user" WHERE email = ?)')
      .run(Date.now() - 11 * 60 * 1000, "stale-session@fieldnotes.test");
    if (update.changes !== 1) throw new Error("Could not prepare the isolated stale-session browser test.");
  } finally {
    sqlite.close();
  }

  const ownerState = users[0].state!;
  const warmup = await request.newContext({ baseURL: testOrigin, storageState: ownerState });
  try {
    const dashboard = await warmup.get("/", { timeout: 90_000 });
    if (!dashboard.ok()) throw new Error(`Could not warm the dashboard route (HTTP ${dashboard.status()}).`);
    const progress = await warmup.get("/api/progress");
    if (!progress.ok()) throw new Error(`Could not warm the private progress route (HTTP ${progress.status()}).`);
  } finally {
    await warmup.dispose();
  }
}
