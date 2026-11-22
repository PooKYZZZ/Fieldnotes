import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

nextEnv.loadEnvConfig(projectRoot);

if (process.env.DATABASE_PATH !== ":memory:") {
  process.env.DATABASE_PATH = path.resolve(projectRoot, process.env.DATABASE_PATH ?? ".data/lms.sqlite");
}

process.env.HOSTNAME = "127.0.0.1";
process.env.PORT ??= "3000";

await import(pathToFileURL(path.join(projectRoot, ".next", "standalone", "server.js")).href);
