import path from "node:path";
import { cp, mkdir } from "node:fs/promises";

const outputDirectory = process.env.FIELDNOTES_NEXT_DIST_DIR ?? ".next";
const standaloneDirectory = path.join(process.cwd(), outputDirectory, "standalone");

await mkdir(path.join(standaloneDirectory, ".next"), { recursive: true });
await Promise.all([
  cp("public", path.join(standaloneDirectory, "public"), { recursive: true, force: true }),
  cp(path.join(outputDirectory, "static"), path.join(standaloneDirectory, ".next", "static"), { recursive: true, force: true }),
  cp("migrations", path.join(standaloneDirectory, "migrations"), { recursive: true, force: true }),
]);
