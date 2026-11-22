import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import Database from "better-sqlite3";
import { createProgressDatabase } from "../src/features/progress/storage/database";
import { authUser } from "../src/features/auth/storage/schema";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = path.resolve(root, "tmp");
const drillDirectory = path.join(tempRoot, `sqlite-restore-${randomUUID()}`);
const sourcePath = path.join(drillDirectory, "source.sqlite");
const snapshotPath = path.join(drillDirectory, "snapshot.sqlite");
const restoredPath = path.join(drillDirectory, "restored.sqlite");
const ownerId = `synthetic-restore-${randomUUID()}`;
const ownerEmail = `${ownerId}@example.test`;
const note = `synthetic WAL restore marker ${randomUUID()}`;
const syntheticSecret = "synthetic-restore-secret-never-used-for-sign-in-32-bytes";
const migrationDirectory = path.join(root, "migrations");
const expectedMigrations = readdirSync(migrationDirectory)
  .filter((filename) => /^\d+_[a-z0-9_]+\.sql$/.test(filename))
  .sort();
let sourceStore: ReturnType<typeof createProgressDatabase> | undefined;
let liveSource: Database.Database | undefined;
let snapshot: Database.Database | undefined;
let child: ChildProcess | undefined;
let childOutput = "";

function childHasExited(processToCheck: ChildProcess): boolean {
  return processToCheck.exitCode !== null || processToCheck.signalCode !== null;
}

async function waitForExit(processToWait: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (childHasExited(processToWait)) return true;
  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      processToWait.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    processToWait.once("exit", onExit);
  });
}

async function availablePort(): Promise<number> {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function startRestoredApp(databasePath: string): Promise<void> {
  const port = await availablePort();
  child = spawn(process.execPath, [path.join(root, "scripts", "start-local.mjs")], {
    cwd: root,
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      DATABASE_PATH: databasePath,
      BETTER_AUTH_SECRET: syntheticSecret,
      BETTER_AUTH_URL: "https://restore-drill.example.test",
      FIELDNOTES_PUBLIC_URL: "https://restore-drill.example.test",
      FIELDNOTES_OWNER_EMAIL: ownerEmail,
      GOOGLE_CLIENT_ID: "synthetic-restore-client-id",
      GOOGLE_CLIENT_SECRET: "synthetic-restore-provider-secret",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk: Buffer) => { childOutput = `${childOutput}${chunk.toString()}`.slice(-4000); });
  child.stderr?.on("data", (chunk: Buffer) => { childOutput = `${childOutput}${chunk.toString()}`.slice(-4000); });

  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (childHasExited(child)) throw new Error("Restored app exited before readiness.");
    try {
      const response = await fetch(`${origin}/api/ready`, { signal: AbortSignal.timeout(2000) });
      if (response.status === 200) {
        const body = await response.json();
        if (body.status === "ready" && body.checks.database === "ok" && body.checks.authentication === "ready") {
          console.log("PASS restored app readiness with synthetic auth configuration");
          return;
        }
      }
    } catch {
      // The standalone process may still be starting.
    }
    await delay(300);
  }
  throw new Error("Restored app did not become ready within 60 seconds.");
}

async function stopRestoredApp(): Promise<void> {
  if (!child || childHasExited(child)) return;
  child.kill("SIGTERM");
  if (!(await waitForExit(child, 5000))) {
    child.kill("SIGKILL");
    if (!(await waitForExit(child, 5000))) throw new Error("Restored app did not stop after SIGKILL.");
  }
}

async function main(): Promise<void> {
  assert.ok(drillDirectory.startsWith(`${tempRoot}${path.sep}`), "The test files must stay under this checkout's tmp directory.");
  mkdirSync(drillDirectory, { recursive: true });
  sourceStore = createProgressDatabase(sourcePath, migrationDirectory);
  sourceStore.orm.insert(authUser).values({
    id: ownerId,
    name: "Synthetic Restore Owner",
    email: ownerEmail,
    emailVerified: true,
    image: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).run();
  sourceStore.save(ownerId, {
    itemType: "module",
    itemId: "M01",
    status: "completed",
    comfort: "independent",
    notes: note,
    evidence: "synthetic WAL restore drill",
    repositoryUrl: "",
  });

  liveSource = new Database(sourcePath, { readonly: true, fileMustExist: true });
  assert.equal(liveSource.pragma("journal_mode", { simple: true }), "wal");
  const walPath = `${sourcePath}-wal`;
  assert.ok(existsSync(walPath) && statSync(walPath).size > 0, "The synthetic source must have live WAL data before backup.");
  await liveSource.backup(snapshotPath);
  liveSource.close();
  liveSource = undefined;
  sourceStore.close();
  sourceStore = undefined;
  console.log("PASS live WAL snapshot created through better-sqlite3 backup API");

  snapshot = new Database(snapshotPath, { readonly: true, fileMustExist: true });
  const integrity = snapshot.pragma("integrity_check") as Array<{ integrity_check: string }>;
  assert.deepEqual(integrity, [{ integrity_check: "ok" }]);
  assert.equal((snapshot.pragma("foreign_key_check") as unknown[]).length, 0);
  assert.deepEqual(
    (snapshot.prepare("SELECT filename FROM schema_migrations ORDER BY filename").all() as Array<{ filename: string }>).map((row) => row.filename),
    expectedMigrations,
  );
  const checksum = createHash("sha256").update(readFileSync(snapshotPath)).digest("hex");
  await snapshot.backup(restoredPath);
  snapshot.close();
  snapshot = undefined;

  const restored = new Database(restoredPath, { readonly: true, fileMustExist: true });
  try {
    assert.deepEqual(restored.pragma("integrity_check"), [{ integrity_check: "ok" }]);
    assert.equal((restored.pragma("foreign_key_check") as unknown[]).length, 0);
  } finally {
    restored.close();
  }
  console.log("PASS restored snapshot integrity, foreign keys, and source migration ledger");

  await startRestoredApp(restoredPath);
  const restoredStore = createProgressDatabase(restoredPath, migrationDirectory);
  try {
    assert.equal(restoredStore.find(ownerId, "module", "M01")?.notes, note);
    assert.equal(restoredStore.find("synthetic-other-account", "module", "M01"), undefined);
  } finally {
    restoredStore.close();
  }
  console.log("PASS restored private progress reads for its synthetic owner only");
  if (process.argv.includes("--signal-restored-app")) {
    assert.ok(child);
    child.kill("SIGTERM");
    assert.ok(await waitForExit(child, 5000), "The deliberately signaled app must exit within five seconds.");
    assert.equal(child.exitCode, null);
    assert.equal(child.signalCode, "SIGTERM");
    console.log("PASS deliberate SIGTERM is detected before cleanup");
  }
  assert.equal(checksum.length, 64);
  console.log("PASS synthetic snapshot checksum computed (value withheld)");
}

void (async () => {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore rehearsal failed.";
    console.error(message);
    const safeOutput = childOutput.replaceAll(syntheticSecret, "[redacted]").replaceAll("synthetic-restore-provider-secret", "[redacted]");
    if (safeOutput) console.error(safeOutput);
    process.exitCode = 1;
  } finally {
    try {
      if (snapshot?.open) snapshot.close();
      if (liveSource?.open) liveSource.close();
      if (sourceStore) sourceStore.close();
    } finally {
      try {
        await stopRestoredApp();
      } finally {
        if (drillDirectory.startsWith(`${tempRoot}${path.sep}`)) rmSync(drillDirectory, { recursive: true, force: true });
      }
    }
  }
})();
