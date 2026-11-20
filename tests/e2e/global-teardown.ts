import { existsSync, rmSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

export default async function globalTeardown(): Promise<void> {
  const pidFile = process.env.FIELDNOTES_E2E_SERVER_PID_FILE;
  if (!pidFile || !existsSync(pidFile)) return;

  const serverPid = Number(readFileSync(pidFile, "utf8").trim());
  if (Number.isSafeInteger(serverPid) && serverPid > 0) {
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

  rmSync(pidFile, { force: true });
}
