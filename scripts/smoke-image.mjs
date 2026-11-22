import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);
const image = process.argv[2];
const authSecret = "synthetic-ci-secret-never-used-for-sign-in-32-bytes";
const providerSecret = "synthetic-ci-google-client-secret";
const redactions = [authSecret, providerSecret];
const testId = `${process.pid}-${randomUUID().slice(0, 8)}`;
const container = `fieldnotes-image-smoke-${testId}`;
const volume = `${container}-data`;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceMigrations = readdirSync(path.join(projectRoot, "migrations"))
  .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
  .sort();
let containerCreated = false;
let volumeCreated = false;

function redact(value) {
  return redactions.reduce((result, secret) => result.replaceAll(secret, "[redacted]"), String(value));
}

async function docker(args) {
  try {
    const { stdout } = await execFile("docker", args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const detail = error.stderr || error.message || "unknown Docker error";
    throw new Error(`docker ${args[0]} failed: ${redact(detail)}`);
  }
}

function localAssetSources(html, tag, attribute) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*?\\b${attribute}="([^"]+)"`, "gi"))]
    .map((match) => match[1].replaceAll("&amp;", "&"))
    .filter((source) => source.startsWith("/") && !source.startsWith("//"));
}

async function get(origin, pathname) {
  return fetch(new URL(pathname, origin), { signal: AbortSignal.timeout(5000), redirect: "manual" });
}

async function assertStartup(origin) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const health = await get(origin, "/api/health");
      if (health.status === 200 && (await health.json()).status === "ok") {
        const ready = await get(origin, "/api/ready");
        if (ready.status === 200) {
          const body = await ready.json();
          if (body.status === "ready" && body.checks?.database === "ok" && body.checks?.authentication === "ready") return;
        }
      }
    } catch {
      // The server may still be starting or applying migrations.
    }
    const state = await docker(["inspect", container, "--format", "{{.State.Status}}"]);
    if (state === "exited" || state === "dead") {
      throw new Error(`The image container exited before becoming ready (state: ${state}).`);
    }
    await delay(1000);
  }
  throw new Error("The image did not become healthy and ready within 120 seconds.");
}

async function verifyDatabaseAndPackage() {
  const script = [
    "const fs = require('node:fs');",
    "const Database = require('better-sqlite3');",
    "const envFiles = fs.readdirSync('/app').filter((name) => name.startsWith('.env') && name !== '.env.example');",
    "if (envFiles.length || fs.existsSync('/app/.data')) throw new Error('private build input found in runtime package');",
    "const expected = JSON.parse(process.argv[1]);",
    "const packaged = fs.readdirSync('/app/migrations').filter((name) => /^\\d+_[a-z0-9_]+\\.sql$/.test(name)).sort();",
    "if (JSON.stringify(expected) !== JSON.stringify(packaged)) throw new Error('packaged migrations differ from the source checkout');",
    "if (typeof process.getuid !== 'function' || process.getuid() === 0) throw new Error('container process is root');",
    "const db = new Database('/data/lms.sqlite', { readonly: true, fileMustExist: true });",
    "try {",
    "  const applied = db.prepare('SELECT filename FROM schema_migrations ORDER BY filename').all().map((row) => row.filename);",
    "  if (!expected.length || JSON.stringify(expected) !== JSON.stringify(applied)) throw new Error('migration ledger does not match packaged migrations');",
    "  const integrity = db.pragma('integrity_check');",
    "  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') throw new Error('SQLite integrity check failed');",
    "  if (db.pragma('foreign_key_check').length !== 0) throw new Error('SQLite foreign-key check failed');",
    "  console.log(`PASS non-root UID ${process.getuid()}, source/package/applied migrations (${applied.length}), SQLite integrity, foreign keys, and package exclusions`);",
    "} finally { db.close(); }",
  ].join(" ");
  console.log(await docker(["exec", container, "node", "-e", script, JSON.stringify(sourceMigrations)]));
}

async function smoke() {
  assert.match(image ?? "", /^[A-Za-z0-9._:/-]+$/, "Pass a Docker image reference as the first argument.");

  const runtimeUser = await docker(["image", "inspect", image, "--format", "{{.Config.User}}"]);
  assert.ok(runtimeUser && runtimeUser !== "root" && runtimeUser !== "0", "The image must run as its configured non-root user.");

  await docker(["volume", "create", volume]);
  volumeCreated = true;
  await docker([
    "run", "--detach", "--name", container,
    "--publish", "127.0.0.1::3000",
    "--mount", `type=volume,source=${volume},target=/data`,
    "--env", "NODE_ENV=production",
    "--env", `BETTER_AUTH_SECRET=${authSecret}`,
    "--env", "BETTER_AUTH_URL=https://fieldnotes-smoke.example.test",
    "--env", "FIELDNOTES_PUBLIC_URL=https://fieldnotes-smoke.example.test",
    "--env", "FIELDNOTES_OWNER_EMAIL=ci-owner@example.test",
    "--env", "GOOGLE_CLIENT_ID=synthetic-ci-google-client-id",
    "--env", `GOOGLE_CLIENT_SECRET=${providerSecret}`,
    "--env", "DATABASE_PATH=/data/lms.sqlite",
    "--env", "NEXT_TELEMETRY_DISABLED=1",
    image,
  ]);
  containerCreated = true;

  const portMapping = await docker(["port", container, "3000/tcp"]);
  const port = portMapping.match(/127\.0\.0\.1:(\d+)/)?.[1];
  assert.ok(port, "Docker did not publish the container port on loopback.");
  const origin = `http://127.0.0.1:${port}`;
  await assertStartup(origin);
  await verifyDatabaseAndPackage();

  const lesson = await get(origin, "/modules/01/lessons/m01-l01");
  assert.equal(lesson.status, 200, "The generated lesson must return HTTP 200.");
  const html = await lesson.text();
  const script = localAssetSources(html, "script", "src").find((source) => source.startsWith("/_next/static/"));
  assert.ok(script, "The generated lesson must reference a local Next.js JavaScript asset.");
  const scriptResponse = await get(origin, script);
  assert.equal(scriptResponse.status, 200, "The referenced lesson JavaScript must return HTTP 200.");

  const figure = localAssetSources(html, "img", "src").find((source) => source.startsWith("/diagrams/"));
  assert.ok(figure, "The generated lesson must include a local figure.");
  const figureResponse = await get(origin, figure);
  assert.equal(figureResponse.status, 200, "The lesson figure must return HTTP 200.");

  const archive = await get(origin, "/labs/status-api.zip");
  assert.equal(archive.status, 200, "The lab ZIP must return HTTP 200.");

  const progress = await get(origin, "/api/progress");
  assert.equal(progress.status, 401, "Anonymous progress access must return HTTP 401.");
  assert.equal(progress.headers.get("cache-control"), "no-store", "Anonymous progress responses must not be cached.");

  console.log("PASS image runtime user, readiness, lesson, JavaScript, figure, ZIP, and anonymous progress boundary");
}

try {
  await smoke();
} catch (error) {
  console.error(redact(error.message));
  if (containerCreated) {
    try {
      console.error(redact(await docker(["logs", "--tail", "80", container])));
    } catch {
      console.error("Container diagnostics were unavailable.");
    }
  }
  process.exitCode = 1;
} finally {
  if (containerCreated) {
    try {
      await docker(["rm", "--force", container]);
      console.log("CLEANUP removed the disposable smoke container");
    } catch {
      console.error(`CLEANUP failed for the owned test container ${container}`);
      process.exitCode = 1;
    }
  }
  if (volumeCreated) {
    try {
      await docker(["volume", "rm", "--force", volume]);
      console.log("CLEANUP removed the disposable smoke volume");
    } catch {
      console.error(`CLEANUP failed for the owned test volume ${volume}`);
      process.exitCode = 1;
    }
  }
}
