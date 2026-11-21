import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

export default async function globalTeardown(): Promise<void> {
  const runId = process.env.FIELDNOTES_E2E_RUN_ID;
  const pidFile = process.env.FIELDNOTES_E2E_SERVER_PID_FILE;
  if (!runId || !/^[a-f0-9]{32}$/.test(runId) || !pidFile) return;
  const runDirectory = path.join(tmpdir(), `devops-fieldnotes-playwright-${runId}`);
  if (path.resolve(pidFile) !== path.join(runDirectory, "web-server.pid")) return;
  const serverPid = existsSync(pidFile) ? Number(readFileSync(pidFile, "utf8").trim()) : undefined;
  if (serverPid !== undefined && Number.isSafeInteger(serverPid) && serverPid > 0) {
    if (process.platform === "win32") {
      const result = spawnSync("taskkill", ["/PID", String(serverPid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
        timeout: 15_000,
      });
      if ((result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT") {
        throw new Error("Timed out while stopping the isolated Fieldnotes test server.");
      }
    } else {
      try {
        process.kill(-serverPid, "SIGTERM");
      } catch {
        // The server may already have exited during a failed setup.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        process.kill(-serverPid, 0);
        process.kill(-serverPid, "SIGKILL");
      } catch {
        // The server process group has stopped.
      }
    }
  }

  try {
    await rm(runDirectory, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (process.platform !== "win32" || (code !== "EPERM" && code !== "EBUSY")) throw error;
    console.warn(`Windows could not remove the disposable Fieldnotes test directory (${code}): ${runDirectory}`);
  }
}
