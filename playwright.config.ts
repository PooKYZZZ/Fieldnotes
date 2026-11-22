import path from "node:path";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { defineConfig, devices } from "@playwright/test";

const testRunId = process.env.FIELDNOTES_E2E_RUN_ID ?? randomBytes(16).toString("hex");
if (!/^[a-f0-9]{32}$/.test(testRunId)) throw new Error("Invalid Fieldnotes browser test run identifier.");
process.env.FIELDNOTES_E2E_RUN_ID = testRunId;
const testDataDirectory = path.join(tmpdir(), `devops-fieldnotes-playwright-${testRunId}`);
const testDatabase = path.join(testDataDirectory, "progress.sqlite");
const ownerStorageState = path.join(testDataDirectory, "owner.json");
const otherStorageState = path.join(testDataDirectory, "other.json");
const staleSessionStorageState = path.join(testDataDirectory, "stale-session.json");
const requestedPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testPort = Number(requestedPort);
if (!/^\d+$/.test(requestedPort) || !Number.isInteger(testPort) || testPort < 1 || testPort > 65_535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer from 1 to 65535.");
}
const testOrigin = `http://127.0.0.1:${testPort}`;
const testSecret = randomBytes(48).toString("base64");
const testPassword = randomBytes(32).toString("base64url");

process.env.FIELDNOTES_E2E_OTHER_STATE = otherStorageState;
process.env.FIELDNOTES_E2E_OWNER_STATE = ownerStorageState;
process.env.FIELDNOTES_E2E_STALE_STATE = staleSessionStorageState;
process.env.FIELDNOTES_E2E_PASSWORD = testPassword;
process.env.FIELDNOTES_E2E_DATABASE_PATH = testDatabase;

Object.assign(process.env, {
  DATABASE_PATH: testDatabase,
  BETTER_AUTH_SECRET: testSecret,
  BETTER_AUTH_URL: testOrigin,
  FIELDNOTES_OWNER_EMAIL: "owner@fieldnotes.test",
  FIELDNOTES_ENABLE_TEST_AUTH: "true",
  FIELDNOTES_E2E_PASSWORD: testPassword,
  GOOGLE_CLIENT_ID: "fieldnotes-e2e-google-client",
  GOOGLE_CLIENT_SECRET: "fieldnotes-e2e-google-secret",
  HOSTNAME: "127.0.0.1",
  PORT: testPort,
  NEXT_TELEMETRY_DISABLED: "1",
  FIELDNOTES_NEXT_DIST_DIR: ".next-playwright",
});
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results/e2e-artifacts",
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["./tests/e2e/run-cleanup-reporter.ts"]],
  use: {
    baseURL: testOrigin,
    storageState: ownerStorageState,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${testPort}`,
    cwd: process.cwd(),
    url: `${testOrigin}/api/health`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
