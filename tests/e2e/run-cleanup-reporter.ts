import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export default class RunCleanupReporter {
  async onExit(): Promise<void> {
    const runId = process.env.FIELDNOTES_E2E_RUN_ID;
    if (!runId || !/^[a-f0-9]{32}$/.test(runId)) return;

    const temporaryDirectory = path.resolve(tmpdir());
    const runDirectory = path.resolve(temporaryDirectory, `devops-fieldnotes-playwright-${runId}`);
    if (path.dirname(runDirectory) !== temporaryDirectory) return;
    await rm(runDirectory, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
  }
}
