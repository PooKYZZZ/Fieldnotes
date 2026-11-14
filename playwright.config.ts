import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { defineConfig, devices } from "@playwright/test";

const testDataDirectory = mkdtempSync(path.join(tmpdir(), "devops-fieldnotes-playwright-"));
const testDatabase = path.join(testDataDirectory, "progress.sqlite");
const testPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testOrigin = `http://127.0.0.1:${testPort}`;
process.on("exit", () => rmSync(testDataDirectory, { recursive: true, force: true }));

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results/e2e-artifacts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: testOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "node .next/standalone/server.js",
    url: `${testOrigin}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_PATH: testDatabase,
      HOSTNAME: "127.0.0.1",
      PORT: testPort,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
