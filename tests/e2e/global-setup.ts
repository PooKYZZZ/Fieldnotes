import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import Database from "better-sqlite3";
import { request } from "@playwright/test";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;
const serverPidFile = process.env.FIELDNOTES_E2E_SERVER_PID_FILE;
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
  if (!password || !serverPidFile || users.some(({ state }) => !state)) {
    throw new Error("Playwright test authentication is not configured.");
  }

  const nextEntry = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const port = process.env.PLAYWRIGHT_PORT ?? "3000";
  const server = spawn(process.execPath, [nextEntry, "dev", "--hostname", "127.0.0.1", "--port", port], {
    cwd: process.cwd(),
    env: process.env,
    detached: process.platform !== "win32",
    stdio: "ignore",
    windowsHide: true,
  });
  if (!server.pid) throw new Error("Could not start the isolated Fieldnotes test server.");
  writeFileSync(serverPidFile, String(server.pid), { flag: "w" });

  try {
    let serverError: Error | undefined;
    server.once("error", (error) => { serverError = error; });
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (serverError) throw serverError;
      if (server.exitCode !== null) throw new Error(`The isolated Fieldnotes test server exited with code ${server.exitCode}.`);
      try {
        const health = await fetch(`${testOrigin}/api/health`, { signal: AbortSignal.timeout(1_000) });
        if (health.ok) {
          ready = true;
          break;
        }
      } catch {
        // The server may still be compiling its first request.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("The isolated Fieldnotes test server did not become ready within 60 seconds.");
  } catch (error) {
    if (process.platform === "win32") {
      const { spawnSync } = await import("node:child_process");
      spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true, timeout: 15_000 });
    } else {
      try { process.kill(-server.pid, "SIGTERM"); } catch { /* The server may already have exited. */ }
    }
    throw error;
  }

  for (const user of users) {
    const statePath = user.state!;
    mkdirSync(path.dirname(statePath), { recursive: true });
    const context = await request.newContext({ baseURL: testOrigin });
    try {
      const response = await context.post("/api/auth/sign-up/email", {
        data: { name: user.name, email: user.email, password },
      });
      if (!response.ok()) {
        const body = await response.text().catch(() => "");
        throw new Error(`Could not create the isolated ${user.name} test session (HTTP ${response.status()}). ${body.slice(0, 240)}`);
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
    const dashboard = await warmup.get("/");
    if (!dashboard.ok()) throw new Error(`Could not warm the dashboard route (HTTP ${dashboard.status()}).`);
    const progress = await warmup.get("/api/progress");
    if (!progress.ok()) throw new Error(`Could not warm the private progress route (HTTP ${progress.status()}).`);
  } finally {
    await warmup.dispose();
  }

  // Once setup is complete, the test runner must not keep the Next.js child
  // attached to its event loop. globalTeardown owns stopping it by PID.
  server.unref();
}
