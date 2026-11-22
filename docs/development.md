# Development and testing

This guide is the tracked working agreement for maintainers and coding agents. The root `AGENTS.md` is intentionally Git-ignored and may add local guidance; it is not the shared source of project requirements.

## Prerequisites and setup

- Node.js 24 and npm for local development. `better-sqlite3` includes a native module, so installation may need a platform-compatible prebuilt binary or the platform's native build tools.
- Docker Desktop with Compose, or Docker Engine with the Compose plugin, for the container workflow.

Install locked dependencies:

```sh
npm ci
```

Start the local development server:

```sh
npm run dev
```

The app listens on `127.0.0.1:3000` and creates `.data/lms.sqlite` unless `DATABASE_PATH` is set. Curriculum pages remain open without an account; saving or reading private progress requires a session. To exercise real local Google/GitHub sign-in, configure the provider and owner settings in `.env` first. Playwright uses test-only password authentication and a separate disposable database.

For a separate development database:

```powershell
$env:DATABASE_PATH = ".data/lms-dev.sqlite"
npm run dev
```

```sh
DATABASE_PATH=.data/lms-dev.sqlite npm run dev
```

Next.js loads `.env*` files for app configuration. Compose reads `.env` for host settings, `FIELDNOTES_PROD_BETTER_AUTH_SECRET`, and production-specific OAuth client variables. Local development uses `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and local `GOOGLE_*` or `GITHUB_*` credentials. Use separate Google Cloud projects/OAuth clients for local development and production. Production requires `FIELDNOTES_PUBLIC_URL` to be the exact public HTTPS origin; Compose passes that value as `BETTER_AUTH_URL`. Do not commit real environment files or credentials.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checking |
| `npm test` | Run Vitest unit and database tests |
| `npm run build` | Build the production app and prepare standalone output |
| `npm start` | Start the built standalone app on loopback |
| `npx playwright install chromium` | Install the browser used by Playwright |
| `npm run test:e2e` | Run Playwright against an isolated local Next.js server and disposable SQLite database |

`npm start` loads project-root `.env*` files with Next.js precedence before starting standalone output. An exported `DATABASE_PATH` wins; relative paths resolve from the project root, absolute paths remain absolute, and `:memory:` remains in-memory. Without it, local standalone storage is `.data/lms.sqlite` at the project root, outside generated output. Before rebuilding an older checkout, snapshot and inspect `.next/standalone/.data/lms.sqlite` if present and compare it with the project-root database. Rebuilds replace generated output, so restore or merge any missing records using the approved recovery process; do not overwrite either database automatically.

`FIELDNOTES_NEXT_DIST_DIR` is an internal output-directory setting used by Playwright to isolate test builds. Local production builds use the default `.next` directory and `npm start` expects that location.

The browser suite creates separate owner and learner accounts, stores their test-only session cookies in the operating system's temporary folder, and deletes the isolated database on exit. It does not use the local `.data/lms.sqlite` or the Docker volume. The test server listens on port 3000 by default; choose another free port if needed:

```powershell
$env:PLAYWRIGHT_PORT = "3001"
npm run test:e2e
```

```sh
PLAYWRIGHT_PORT=3001 npm run test:e2e
```

CI runs lint, type checking, unit tests, a production build, Playwright, and a Docker image build. Run the checks relevant to a change locally; for a user-visible or data-flow change, include the browser suite. Do not report a check as passing unless it was run and its result observed.

## Docker Compose

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f app
```

The app is exposed on `127.0.0.1:${APP_PORT:-3000}` and stores auth users, sessions, and account-scoped progress in the named `learning-data` volume. `docker compose down` removes the container and network but retains that volume. Do not use `docker compose down -v` unless permanent deletion of learner data is intended. Before an upgrade that adds or changes a migration, make a SQLite/volume backup.

An optional `compose.cloudflare.yaml` overlay connects the app to an existing CyberTrace Cloudflare Tunnel network. The app remains bound to loopback on the host and is reachable through the Tunnel by the internal Docker alias `fieldnotes-lms:3000`. Set `FIELDNOTES_TUNNEL_NETWORK` in the local `.env` to the existing `cloudflared` ingress network name. Use the same two-file command for validation and public recreation; Compose merges the overlay onto the base file in the order shown ([Compose merge rules](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)). Record the image ID and revision label after building:

```powershell
$changes = git status --porcelain
$env:FIELDNOTES_SOURCE_REVISION = if ($changes) { "uncommitted" } else { (git rev-parse HEAD).Trim() }
docker compose -f compose.yaml -f compose.cloudflare.yaml config --quiet
docker compose -f compose.yaml -f compose.cloudflare.yaml up --build -d
docker image inspect devops-fieldnotes:local --format '{{.Id}} {{index .Config.Labels "org.opencontainers.image.revision"}}'
```

`SOURCE_REVISION` becomes the `org.opencontainers.image.revision` label. CI supplies the checked-out commit SHA. For a dirty local checkout, use `uncommitted` rather than the current `HEAD`; retain the image ID or digest and the source status with the release record. The label identifies the declared source revision, not the running image or a clean source tree by itself.

For the public `learn.cybertracesystems.com` route, keep Cloudflare Tunnel as transport and let Better Auth handle accounts. Do not enable Cloudflare Access if visitors should be able to browse without a Cloudflare identity. Publish the public `/privacy` and `/terms` pages, configure production-only OAuth callbacks, and set the exact HTTPS app origin before publishing. This is still a single-host SQLite deployment: every learner account is logically isolated in one database file, and backups/host access remain the operator's responsibility. To remove the additional network attachment, apply the base Compose file again with `docker compose -f compose.yaml up --build -d`; the named data volume remains intact.

### SQLite snapshots and restore drills

The live database uses SQLite WAL mode. Do not copy only `/data/lms.sqlite` while the app is running: committed changes may still be in its WAL file. Use the installed `better-sqlite3` Online Backup API to create a consistent snapshot, then copy that snapshot out of the Docker volume. The snapshot contains learner records, auth state, and the migration ledger; learner JSON exports do not replace it. Keep `FIELDNOTES_PROD_BETTER_AUTH_SECRET` separately in the approved secret manager used for recovery because the database does not contain that key.

The operator must transfer snapshots to the organization's approved encrypted, access-controlled off-host backup store; a second file in `learning-data` is only staging. The Fieldnotes service owner owns retention and restore checks. Record the actual destination, retention period, and recovery contact in the deployment record before a public release; this repository does not configure off-host storage or retention.

For a live snapshot, choose a unique name, create it through SQLite, copy it to a protected host staging directory, and verify the copied file before transferring it off-host. The following PowerShell example keeps snapshot content and credentials out of output:

```powershell
$snapshotName = "fieldnotes-$((Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')).sqlite"
$snapshotScript = @'
const Database = require("better-sqlite3");
const name = process.argv[1];
if (!/^[A-Za-z0-9.-]+\.sqlite$/.test(name)) throw new Error("Invalid snapshot name.");
(async () => {
  const db = new Database("/data/lms.sqlite", { readonly: true, fileMustExist: true });
  try { await db.backup(`/data/${name}`); } finally { db.close(); }
})().catch((error) => {
  console.error(`Snapshot failed (${error.name})`);
  process.exitCode = 1;
});
'@
$compose = @('-f', 'compose.yaml', '-f', 'compose.cloudflare.yaml')
docker compose @compose exec -T app node -e $snapshotScript $snapshotName
if ($LASTEXITCODE -ne 0) { throw 'SQLite snapshot failed.' }

if (-not $env:FIELDNOTES_BACKUP_DIR) { throw 'Set FIELDNOTES_BACKUP_DIR to a protected host staging directory.' }
$appContainer = docker compose @compose ps -q app
$snapshotPath = Join-Path $env:FIELDNOTES_BACKUP_DIR $snapshotName
docker cp "$($appContainer):/data/$snapshotName" $snapshotPath
if ($LASTEXITCODE -ne 0) { throw 'Copy the snapshot to the protected staging directory before removing it from the volume.' }

$verifyScript = @'
const Database = require("better-sqlite3");
const db = new Database(process.argv[1], { readonly: true, fileMustExist: true });
try {
  const integrity = db.pragma("integrity_check");
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") throw new Error("integrity_check failed");
  if (db.pragma("foreign_key_check").length !== 0) throw new Error("foreign_key_check failed");
  if (db.prepare("SELECT count(*) AS count FROM schema_migrations").get().count === 0) throw new Error("migration ledger is empty");
  console.log("PASS snapshot integrity, foreign keys, and migration ledger");
} finally { db.close(); }
'@
node -e $verifyScript $snapshotPath
if ($LASTEXITCODE -ne 0) { throw 'Keep the source and snapshot; do not use an unverified backup.' }
Get-FileHash $snapshotPath -Algorithm SHA256 | Select-Object -ExpandProperty Hash
```

Transfer the verified file and checksum to the protected off-host store. After confirming the off-host copy, remove only this timestamped staging file from `/data`:

```powershell
$cleanupScript = @'
const name = process.argv[1];
if (!/^fieldnotes-\d{8}T\d{6}Z\.sqlite$/.test(name)) throw new Error("Refusing to remove a non-snapshot path.");
require("node:fs").rmSync(`/data/${name}`);
'@
docker compose @compose exec -T app node -e $cleanupScript $snapshotName
if ($LASTEXITCODE -ne 0) { throw 'Remove only the verified timestamped staging snapshot.' }
```

Keep the original volume and backup until the recovery owner accepts the restore. If a production restore is necessary, use the backup and the matching secret from the same recovery point.

Restore a verified copy into a new, empty host file before any cutover. This uses SQLite's backup API again and refuses to overwrite a target. It prints only check results, not database contents:

```powershell
$restorePath = Join-Path $env:TEMP "fieldnotes-restore-$snapshotName"
$restoreScript = @'
const Database = require("better-sqlite3");
const fs = require("node:fs");
const [sourcePath, targetPath] = process.argv.slice(1);
(async () => {
  if (fs.existsSync(targetPath)) throw new Error("Restore target already exists.");
  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try { await source.backup(targetPath); } finally { source.close(); }
  const restored = new Database(targetPath, { readonly: true, fileMustExist: true });
  try {
    const integrity = restored.pragma("integrity_check");
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") throw new Error("integrity_check failed");
    if (restored.pragma("foreign_key_check").length !== 0) throw new Error("foreign_key_check failed");
    if (restored.prepare("SELECT count(*) AS count FROM schema_migrations").get().count === 0) throw new Error("migration ledger is empty");
    console.log("PASS restored file integrity, foreign keys, and migration ledger");
  } finally { restored.close(); }
})().catch((error) => {
  console.error(`Restore verification failed (${error.name})`);
  process.exitCode = 1;
});
'@
node -e $restoreScript $snapshotPath $restorePath
if ($LASTEXITCODE -ne 0) { throw 'Keep the source and backup; do not use an unverified restore.' }
```

For the repeatable account-isolation rehearsal in a test checkout, first run `npm ci` and `npm run build`, then execute `node_modules/.bin/tsx.cmd scripts/rehearse-sqlite-restore.ts` on Windows or `node_modules/.bin/tsx scripts/rehearse-sqlite-restore.ts` on Linux. It creates a random synthetic account and progress record under ignored `tmp/`, holds a live WAL connection while snapshotting, restores to a separate file, checks integrity, foreign keys, and migrations, boots the standalone build with only synthetic auth/provider configuration, checks `/api/ready`, and verifies the restored record through the account-scoped storage API. It removes only its own generated directory and never opens `.data/lms.sqlite` or the Compose volume.

The local rehearsal verifies only its synthetic copy. For a production recovery, keep the source and backup until a separate restored instance is accepted with the matching image and secret; do not create provider exchanges or test with real learner progress.

`integrity_check` does not check foreign-key violations, so run both PRAGMAs. SQLite's [Online Backup API](https://sqlite.org/backup.html) creates a snapshot of a live database; the [WAL file](https://sqlite.org/wal.html#the_wal_file) is part of persistent state during ordinary file-level copies. See the [better-sqlite3 backup API](https://github.com/WiseLibs/better-sqlite3/blob/v13.1.1/docs/api.md#backupdestination-options---promise) and SQLite's [`integrity_check` and `foreign_key_check` PRAGMAs](https://sqlite.org/pragma.html#pragma_integrity_check).

### Authentication and account-scoped progress

- Better Auth owns OAuth account linking, opaque database-backed sessions, cookie handling, and database-backed rate limits. Production sign-in is through configured Google and/or GitHub providers; test-only email/password registration is disabled when `NODE_ENV=production`.
- Production auth fails closed unless its secret is strong and the configured auth URL matches the public HTTPS origin. Compose reads only production-prefixed OAuth credentials; local development uses the separate unprefixed settings. The configured owner role is granted only when the matching provider email is verified.
- The public curriculum does not require sign-in. `/api/progress` requires a valid session and derives the user ID from the verified server-side session; never accept an account ID from form data, query parameters, or a request body.
- Existing shared progress is copied into `legacy_progress` by migration `0004_add_auth_and_progress_ownership.sql`. Only the verified account whose email matches `FIELDNOTES_OWNER_EMAIL` can atomically claim those rows. New progress uses `(user_id, item_type, item_id)` as its key. Keep migration compatibility and test it with a disposable database; do not rewrite migrations already used by a learner.
- If a session expires, API calls return 401. Show a sign-in path without clearing the learner's current form state; after signing in, allow the learner to save again. A 503 means auth storage/configuration is unavailable and must not be presented as an empty progress record.
- OAuth/provider/network failures should give a plain retry message without exposing provider responses, tokens, or internal exception details. Same-origin checks remain on progress writes for request integrity, in addition to authentication.
- Account deletion is enabled in Better Auth. The account page requires the learner to type `DELETE`; a session older than 10 minutes must be restarted before deletion. SQLite foreign-key cascades remove active account records, sessions, and progress. Migration `0005` also removes the unclaimed legacy archive when the configured owner is deleted. Downloaded exports and database backups remain outside this deletion path.
- Do not automatically delete accounts or progress because an account has been inactive for a chosen number of days.
- The auth tables and learning records share the existing SQLite database. OAuth tokens are encrypted by Better Auth using the app secret; learner notes remain ordinary SQLite text. Protect the secret, database volume, and backups. Losing the secret can invalidate sessions and affect token decryption, so keep a secure backup.

## Changing curriculum and application behavior

### Curriculum content

- Edit module metadata and overviews in `src/content/curriculum/modules/definitions.ts`, and lesson explanations in the corresponding `src/content/curriculum/modules/NN/lessons/*.mdx` files. Keep stable module IDs, lesson IDs, titles, and links aligned. Use practice-only `KnowledgeCheck` components to verify module concepts; they must not claim mastery or create saved records.
- Edit activities, troubleshooting, projects, and other existing Markdown content under `src/content/curriculum/` in their current source files. Before changing frontmatter fields or required section names, inspect `src/content/catalog.ts` and `src/content/content.test.ts`; update the parser and meaningful tests together when those schemas change.
- Activity A01 uses stable task IDs in `src/content/a01-task-ids.ts`, task-specific recovery hints in A01 Markdown frontmatter, and learner prompts in `src/features/activities/a01-task-catalog.ts`. Keep each step’s command, expected result, interpretation, and observation prompt aligned. Its five task observations live in the existing A01 SQLite record, with additive migration `0003_add_a01_task_observations.sql`; legacy unassigned `notes` and `evidence` remain visible and editable. Notebook and final review use the same map. Keep old v1/v2 JSON imports working, preserve task observations when those old records omit the new field, and export the current shape as backup version 3.
- Keep module explanations, activity steps, verification, reflection, and references consistent. Do not add unsupported claims or imply that opening or checking an item verifies mastery.
- All 24 modules use typed metadata and lesson-sized MDX. Use registered components in `src/mdx-components.tsx` for responsive layouts, reviewed local diagrams, command examples, callouts, and interactive knowledge checks. Knowledge-check state is practice-only and does not replace the saved learning record.
- MDX can execute JavaScript. Only reviewed repository content may use this pipeline; never render learner uploads, remote documents, or other untrusted MDX on the server. Keep static diagrams under `public/diagrams/` and cite authoritative sources in the lesson.

### Progress storage

- Keep database access in `src/features/progress/storage/` and request validation at the API boundary.
- Add a new numbered SQL file under `migrations/` for a schema change. Never rewrite a migration that may already have been applied to a learner's database.
- Update the Drizzle schema and persistence tests with the migration. Preserve existing SQLite files and verify migration behavior against a disposable test database.
- If the migration directory changes, update `src/features/progress/storage/store.server.ts` and `scripts/prepare-standalone.mjs`, then verify the standalone build and Docker image.

### Code organization

- Keep App Router files focused on routing and page composition. Put feature behavior in the corresponding `src/features/<feature>/` module; put genuinely shared UI in `src/components/`.
- Prefer server components and server-only data access by default. Add client components only where interaction needs them. Keep database drivers and filesystem access out of browser bundles.
- Use strict TypeScript, Zod at untrusted input boundaries, and the existing design primitives. Avoid new dependencies, broad rewrites, or abstraction layers without a concrete need.

## Agent workflow and safety

1. Read `README.md`, this guide, and `docs/architecture.md`; inspect the relevant implementation, tests, and `git status` before editing. Preserve unrelated work.
2. State the observed behavior and the smallest relevant change. Separate verified facts from assumptions; do not invent requirements or claim unimplemented functionality.
3. For Next.js changes, consult the installed version's matching guide under `node_modules/next/dist/docs/` and heed deprecations. The Next.js-managed section in `AGENTS.md` is preserved intentionally.
4. Add or update tests for changed behavior, run the relevant checks, and inspect the final diff. Update docs when setup, architecture, behavior, or commands change.
5. Keep credentials, personal data, private network details, and real learner notes out of source, tests, screenshots, logs, and exported fixtures. Treat JSON progress exports as unencrypted personal data.
6. Keep Compose bound to loopback by default. A public Tunnel route may rely on Fieldnotes OAuth for account access to progress, while the learning content remains public. Do not expose the route before at least one provider and owner identity are configured. Do not change production learner data or deploy without explicit authorization. Preserve the local SQLite volume during routine development.

## Troubleshooting

- **Port 3000 is busy:** set `APP_PORT` in `.env` for Compose, or use `PLAYWRIGHT_PORT` for E2E tests. Stop any other server on the selected E2E port.
- **SQLite native module fails to install:** use Node.js 24 and a supported platform; install the platform's native compiler toolchain if npm cannot use a prebuilt binary, then rerun `npm ci`.
- **Progress appears missing:** local development and Compose use separate database paths. Check `DATABASE_PATH` for local runs and preserve the `learning-data` Docker volume.
- **Local sign-in is unavailable:** check `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FIELDNOTES_OWNER_EMAIL`, and local `GOOGLE_*`/`GITHUB_*` settings in `.env`. Restart the app after changing them. Do not paste the secret into logs or support requests.
- **Production sign-in is unavailable:** check `FIELDNOTES_PROD_BETTER_AUTH_SECRET`, `FIELDNOTES_PUBLIC_URL`, and production `FIELDNOTES_PROD_*` provider settings. `BETTER_AUTH_URL` must match the public HTTPS origin in production.
- **Prior progress is not visible:** confirm you signed in with the verified email that exactly matches `FIELDNOTES_OWNER_EMAIL`; the older shared rows are not visible to other accounts.
- **Container is not healthy:** inspect `docker compose logs app` and `docker compose ps`; `/api/health` checks SQLite liveness. Use `/api/ready` to check whether both the database and authentication configuration are ready.
