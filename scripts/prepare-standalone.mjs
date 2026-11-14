import path from "node:path";
import { cp, mkdir } from "node:fs/promises";

const standaloneDirectory = path.join(process.cwd(), ".next", "standalone");

await mkdir(path.join(standaloneDirectory, ".next"), { recursive: true });
await Promise.all([
  cp("public", path.join(standaloneDirectory, "public"), { recursive: true, force: true }),
  cp(path.join(".next", "static"), path.join(standaloneDirectory, ".next", "static"), { recursive: true, force: true }),
  cp("migrations", path.join(standaloneDirectory, "migrations"), { recursive: true, force: true }),
]);
