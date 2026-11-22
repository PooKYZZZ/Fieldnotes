import path from "node:path";
import { cp, lstat, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = process.env.FIELDNOTES_NEXT_DIST_DIR ?? ".next";
const outputPath = path.resolve(projectRoot, outputDirectory);
const relativeOutputPath = path.relative(projectRoot, outputPath);
if (!relativeOutputPath || relativeOutputPath === ".." || relativeOutputPath.startsWith(`..${path.sep}`) || path.isAbsolute(relativeOutputPath)) {
  throw new Error("FIELDNOTES_NEXT_DIST_DIR must resolve inside the project root.");
}
const standaloneDirectory = path.join(outputPath, "standalone");

await mkdir(path.join(standaloneDirectory, ".next"), { recursive: true });
await Promise.all([
  cp(path.join(projectRoot, "public"), path.join(standaloneDirectory, "public"), { recursive: true, force: true }),
  cp(path.join(outputPath, "static"), path.join(standaloneDirectory, ".next", "static"), { recursive: true, force: true }),
  cp(path.join(projectRoot, "migrations"), path.join(standaloneDirectory, "migrations"), { recursive: true, force: true }),
]);

for (const entry of await readdir(standaloneDirectory, { withFileTypes: true })) {
  if (!/^\.env(?:\.(?:development|production|test))?(?:\.local)?$/.test(entry.name)) continue;
  const entryPath = path.join(standaloneDirectory, entry.name);
  if ((await lstat(entryPath)).isFile()) await rm(entryPath);
}
