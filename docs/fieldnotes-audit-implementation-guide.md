# Fieldnotes LMS audit implementation guide

Fix data safety and release verification first. Apply the learner-facing fixes as small changes, then consolidate the code that caused several of those defects.

## Baseline and scope

Rechecked on 21 November 2026 against clean `main` at `756ac3235153310637416c89ba3f13292c80ce22`, the audited revision. The installed stack includes Node.js 24, npm 11, Next.js 16.4.6 with the App Router and Turbopack, React 19.3.1, TypeScript 5.9.3, Better Auth and its Drizzle adapter 1.7.26, Drizzle ORM 0.45.4, better-sqlite3 13.1.1 with SQLite 3.54.1, Zod 4.6.7, Vitest 5.1.0, and Playwright 1.65.0. If your checkout differs, check the lockfile and installed framework behavior before applying the steps. [Package manifest](../package.json) · [Lockfile](../package-lock.json)

The original audit passed lint, TypeScript, 62 Vitest tests, 38 Chromium tests, an isolated production build, and a standalone HTTP smoke test. Full and production-only npm advisory scans reported zero matches for the locked tree. The guide recheck inspected current source and build trace metadata, validated the combined Compose configuration, and observed hosted health and readiness at 200 and guest progress at 401. The audit test totals are historical baseline evidence. Verify your changes afresh. Live Google and GitHub exchanges, a production restore drill, deployed commit identity, the Python lab runtime, and production load capacity remain unverified.

### Status and implementation order

Phase 1 addresses high-severity data loss and recovery defects. Phases 2 and 3 address medium-priority release and learner-facing failures. Phase 4 removes confirmed sources of drift and redundant work. Phase 5 contains lower-priority cleanup and a conditional curriculum change.

| Phase | Task | Status at the recheck | Prerequisite |
| --- | --- | --- | --- |
| 1 | [1.1 Local standalone storage](#11-keep-local-sqlite-outside-standalone-output) | Confirmed outstanding. Docker already isolates the database and build inputs. | None |
| 1 | [1.2 Backup dates and recovery](#12-validate-backup-dates-and-keep-damaged-records-readable) | Confirmed outstanding. Existing validation and transactions cover other import errors. | None |
| 1 | [1.3 Restore ordering and preview](#13-preserve-later-edits-when-backup-clocks-differ) | Confirmed clock-skew defect. Apply already protects newer saved rows. | 1.2 |
| 2 | [2.1 Tunnel and revision](#21-make-the-public-compose-release-reproducible) | Partially addressed by the overlay. Repeatable public recreation remains unverified. | None |
| 2 | [2.2 Image smoke test](#22-smoke-test-the-image-that-ci-builds) | Partially addressed by build checks and dev-server E2E. CI still does not run the image. | 1.1 for standalone artifact checks |
| 2 | [2.3 Playwright port ownership](#23-make-playwright-own-its-test-server) | The database and test build are isolated. Port ownership is a source-level risk. | None |
| 2 | [2.4 Operator recovery](#24-document-and-rehearse-a-consistent-sqlite-restore) | Recovery runbook outstanding. Multi-process changes are conditional. | None |
| 3 | [3.1 Guest activity editing](#31-gate-activity-record-editing-on-a-usable-account-record) | Confirmed outstanding on A01 and A02. | None |
| 3 | [3.2 Session renewal](#32-let-the-browser-receive-session-renewal-cookies) | Confirmed with installed Better Auth and synthetic sessions. | None |
| 3 | [3.3 Checkpoint links](#33-make-project-checkpoint-links-open-the-requested-checkpoint) | Confirmed outstanding. | None |
| 3 | [3.4 Markdown remounts](#34-keep-activity-instructions-stable-while-a-learner-types) | Confirmed outstanding. | None |
| 3 | [3.5 Mobile drawers](#35-fix-mobile-drawer-navigation-and-keyboard-focus) | Confirmed outstanding. Existing Escape, focus, and inert logic provides a base. | Coordinate with 3.4 |
| 4 | [4.1 Save response](#41-return-the-persisted-record-after-saving) | Confirmed outstanding. SQL already preserves omitted observations. | 1.3 if both change `upsert` |
| 4 | [4.2 Auth state and duplicate reads](#42-distinguish-auth-outages-and-share-project-record-reads) | Confirmed outstanding. Summary work is already shared across mounted consumers. | 3.1, 3.2 |
| 4 | [4.3 Progress lifecycle](#43-consolidate-the-progress-lifecycle-and-activity-workbenches) | Confirmed duplication and legacy-field drift. | 3.1, 3.4, 3.5, 4.1, 4.2 |
| 4 | [4.4 Dashboard project model](#44-use-a-compact-project-model-on-the-dashboard) | Confirmed repeated parsing and completed-project recommendation defect. | None |
| 5 | [5.1 UI and dependencies](#51-prune-unused-ui-and-fix-the-project-editor-style-hook) | Confirmed unused code and selector mismatch. Dependency deletion requires usage and visual checks. | 4.3 for editor branches |
| 5 | [5.2 Lesson registration](#52-reduce-lesson-registration-work-if-authoring-needs-it) | Optional. Current validation and builds cover the verified curriculum. | Evidence of authoring friction |
| 5 | [5.3 Status API lab](#53-align-the-status-api-starter-and-activity-a08) | Confirmed instruction drift. ZIP parity already passes. Runtime ownership needs a disposable check. | None |

No previously reported defect was fully resolved at this revision. Preserve the protections that already work, including the external Docker database path, Tunnel overlay, transactional restore, and account-isolation tests.

### Work in small, verifiable changes

1. Read the checkout’s `AGENTS.md`, [architecture](architecture.md), and [development guide](development.md). Check `git status --short --branch`. Find the current caller and tests. If a later branch already fixed a finding, run its acceptance check and record the result.
2. Prove the same entry point that failed. Use Chromium for learner actions and disposable SQLite for storage cases. Build in a separate checkout or copy until task 1.1 passes. Preserve existing standalone output that could hold progress.
3. Reuse the boundary that owns the behavior. Ponytail favors deleting unused paths and reusing installed capabilities. pstack favors checking the root cause through the real entry point. Thermos favors one owner per rule and removing conflicting state. Judge changes by their behavior and maintenance cost.
4. Use synthetic users, notes, provider values, and backups. Keep existing learner databases and the hosted deployment outside the test fixture. Any production repair or release belongs to separately authorized operator work.

### Contracts to preserve

- The dashboard, roadmap, modules, lessons, activities, projects, and resource library stay public. Knowledge checks remain local practice. Completion remains self-reported.
- The server derives ownership from the authenticated session. `X-Fieldnotes-Account` detects stale account context. Preserve the account-scoped row key, same-origin write checks, bounded request parsing, private cache policy, 401 and 503 distinctions, and revision conflicts.
- Revisions control concurrent saves. Timestamps order activity and choose backup winners. Preserve stable curriculum IDs, backup versions 1 through 3, one-time verified-owner adoption, and foreign-key deletion.
- Keep SQLite on the server and MDX limited to reviewed repository content. Preserve the non-root container, loopback default, dropped capabilities, and named volume. [Progress route](../src/app/api/progress/route.ts) · [Storage façade](../src/features/progress/storage/store.server.ts) · [Next.js data security](https://nextjs.org/docs/app/guides/data-security)

## Phase 1. Protect learner data

### 1.1 Keep local SQLite outside standalone output

**Objective and evidence.** Make `npm start` use persistent storage outside generated files. `scripts/start-local.mjs` imports the generated `.next/standalone/server.js`. Next changes the working directory to standalone, then `getDatabase()` falls back to `process.cwd()/.data/lms.sqlite`. The isolated test created SQLite under standalone and left the project-root path absent. The existing build also contains a traced SQLite file and a copied `.env`. A rebuild clears standalone, and sharing a populated local artifact can disclose private files.

**Files.** [Local launcher](../scripts/start-local.mjs) · [Postbuild packaging](../scripts/prepare-standalone.mjs) · [Next configuration](../next.config.ts) · [Database initialization](../src/features/progress/storage/store.server.ts) · [Dockerfile](../Dockerfile) · [Docker exclusions](../.dockerignore) · [README](../README.md)

**Implementation.**

1. Establish the project root from the launcher’s file location before importing the generated server. Resolve the configured ordinary SQLite path against that root and default to its `.data/lms.sqlite`. Preserve absolute paths and the explicit `:memory:` sentinel. Keep the Docker entry point on `/data/lms.sqlite`.
2. Define configuration precedence. Prefer exported `DATABASE_PATH`. If supporting a value from an app-root environment file, load the intended configuration before resolving the path and preserve exported-value precedence. Verify that setting a default before import does not silently shadow a documented configuration. Keep the fix within Node and the existing Next environment model.
3. Add narrow output tracing exclusions for private database inputs, including `.data` and SQLite sidecars. Confirm the results in route and server manifests. Keep native driver files, migrations, curriculum, and public assets. Next copies certain environment files separately from tracing. Produce shareable artifacts from a clean build context and inject real secrets at runtime. Docker already excludes the local inputs.
4. Document existing-data recovery. If an old standalone database exists, have the operator snapshot it before rebuilding and determine whether it contains work missing from the app-root database. Use an approved restore or merge after identifying both stores. An automatic copy can overwrite different learner records.
5. Treat custom `FIELDNOTES_NEXT_DIST_DIR` as a separate compatibility question. The launcher hardcodes `.next`, and the postbuild script hardcodes the static destination. The verified release path uses the default. If custom standalone output is supported, align the launcher and destination with the generated server and test it. Otherwise document the variable as part of the test build.

**Acceptance and verification.**

- In a copied checkout, run `npm run build` and launch via `npm start` on a free port with synthetic runtime values. Request `/api/health` to initialize storage. Check that the default DB is at the copy’s root under `.data` and that standalone contains no DB.
- Repeat with relative and absolute paths and `:memory:`. Seed a synthetic account and record into the disposable file through the storage lifecycle. Rebuild, restart, and verify the same record. Test a launcher invocation from a different current directory.
- Place a synthetic SQLite fixture under the copy’s `.data` before building. Inspect the tracing manifests and artifact filenames. Require the fixture to be absent from standalone and fetch a lesson, its referenced JavaScript, and the ZIP. Verify Docker still uses persistent `/data` in task 2.2.
- Switching the local command to a supported non-standalone production entry point is an alternative if the runtime contract is intentionally changed. Retaining the current launcher requires fixing its path and validating its artifact separately.

[Next.js output tracing and environment files](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) · [Next.js environment load order](https://nextjs.org/docs/app/guides/environment-variables) · [Docker build context](https://docs.docker.com/build/building/context/)

### 1.2 Validate backup dates and keep damaged records readable

**Objective and evidence.** Reject impossible restore timestamps and keep old damaged records readable. The common schema behind backup versions 1, 2, and 3 accepts a nonnegative integer outside the JavaScript Date range. Apply persists it. `ProgressNotebook` then throws in date formatting, which also hides the backup controls. Dashboard Recent work has a second unsafe formatter.

**Files.** [Backup schema](../src/features/progress/validation.ts) · [Preview and apply](../src/app/api/progress/route.ts) · [Storage](../src/features/progress/storage/database.ts) · [Notebook](../src/features/progress/progress-notebook.tsx) · [Dashboard panels](../src/features/dashboard/dashboard-panels.tsx) · [Backup UI](../src/features/progress/progress-backup.tsx)

**Implementation.**

1. Define one import rule for safe, nonnegative integer milliseconds inside the Date range and within a documented allowance for future clock skew. Keep historical values, including zero. A 24-hour allowance is a proposed default. Verify supported exports against that choice. Compute the limit at request validation time so a long-lived process does not use a stale cutoff.
2. Apply the common Zod rule to both preview and apply, returning the existing 400 with the affected field path before any write. Keep version compatibility, stable item validation, byte limits, and transactional merge.
3. Before calling `Intl.DateTimeFormat.format()` or `toISOString()`, check that the stored value produces a valid Date. Display **Saved date unavailable** and omit the machine-readable timestamp attribute for that row. Keep the row text, edit action, and backup controls visible. A small shared formatter is appropriate if these two callers would otherwise duplicate the same validity rule.
4. Make a revision-checked edit recover an invalid past value using task 1.3. Document how to resave a damaged row before exporting a backup that can be re-imported. If many rows need correction, plan a backed-up maintenance operation or new numbered migration and validate it on a copy. Keep normal reads free of data repair.

**Acceptance and verification.**

- Extend [validation.test.ts](../src/features/progress/validation.test.ts) with valid historical and current values, the future limit, an out-of-range Date, a fractional value, and a negative value. Freeze and reset time in boundary tests. Cover versions 1 through 3 through their common schema.
- Exercise both authenticated restore endpoints with a mixed valid and invalid backup. Require 400 and zero writes. Retain the existing valid backup round trip.
- Render the notebook and dashboard with a synthetic previously saved invalid date. Confirm the visible fallback, record text, and available backup controls. Save the affected row using its revision, reload, and verify both its timestamp and content.

[ECMAScript TimeClip](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-timeclip) · [Zod numeric schemas](https://zod.dev/api#numbers)

### 1.3 Preserve later edits when backup clocks differ

**Objective and evidence.** Preserve a later edit when transferring it back to another copy of the same backup. `upsert()` uses the greater of local time and the previous timestamp. If two installations have a future-dated record, an edit on a clock-behind installation inherits the old timestamp. `mergeMany()` then keeps the receiver’s older content on equality. Preview also describes precise winners even though apply computes them again.

**Files.** [Timestamp and merge](../src/features/progress/storage/database.ts) · [Storage tests](../src/features/progress/storage/database.test.ts) · [Preview response](../src/app/api/progress/route.ts) · [Restore messages](../src/features/progress/progress-backup.tsx)

**Implementation.**

1. In the existing revision-checked write transaction, give ordinary edits the greater of server time and the valid previous timestamp plus one millisecond. If the previous value is damaged or outside the clock policy, use server time. Guard the prior value before adding one and account for ordinary monotonic increments at the future boundary.
2. Preserve valid imported timestamps and keep the equal-or-newer receiver rule. Identical repeat import should remain idempotent. Keep revision checks distinct from restore ordering. This approach fixes the shared-base clock-skew case. Explicit conflicts or richer version tracking are justified only if independent installations commonly exchange divergent backups.
3. Describe preview counts and winners as estimates at preview time. Let apply use the current transaction and show actual imported and preserved counts. An exact confirmation would require checking the previewed revisions and reporting when the preview is stale. Choose that protocol only if the product needs that guarantee.

**Acceptance and verification.** With fixed clocks, restore one slightly future-dated row into two disposable stores. Save changed text on the clock-behind copy and restore the result into the second. Confirm the new text wins and a repeated import leaves revision unchanged. Cover same-millisecond saves, an older backup, a stale edit revision, an invalid prior date, and one-time legacy adoption. In Playwright, preview a restore, save a newer destination row from a second synthetic client, then apply and verify the displayed actual counts and retained text. Replace the old test assertion that blesses timestamp equality after an edit.

[SQLite transaction semantics](https://sqlite.org/lang_transaction.html) · [Existing restore test](../tests/e2e/learning-flow.spec.ts)

## Phase 2. Verify deployment and recovery

### 2.1 Make the public Compose release reproducible

**Objective and evidence.** Preserve the Tunnel origin through planned recreation and identify the running image. Docker shows both networks on the healthy container, but its Compose label lists only `compose.yaml` and the image lacks an OCI source revision label. The existing overlay declares the external network and validates when combined with the base.

**Files.** [Base Compose](../compose.yaml) · [Tunnel overlay](../compose.cloudflare.yaml) · [Image build](../Dockerfile) · [Development and deployment](development.md) · [README](../README.md)

**Implementation.**

1. Standardize the public operator procedure on `docker compose -f compose.yaml -f compose.cloudflare.yaml` for configuration and recreation. Keep the base command available for local operation. Preserve the existing project name, `app` service, external network, `fieldnotes-lms` alias, loopback binding, volume, and HTTPS auth origin.
2. Pass the source revision to the final image build and set `org.opencontainers.image.revision`. Derive it from the checkout being built, such as `GITHUB_SHA` in CI. Document how an uncommitted build is identified. Pair the label with the actual image ID or digest in the release record.
3. Use the existing overlay and a canonical documented command. A dedicated wrapper makes sense if repeated operator error or release automation needs it. Keep the local path simple.

**Acceptance and verification.** Validate with `docker compose -f compose.yaml -f compose.cloudflare.yaml config --quiet` using appropriate values. Inspect only the merged network and alias and confirm the revision on the disposable image. In an authorized release or staging recreation, confirm the Compose files recorded on the new container, unchanged volume identity, and the expected network alias. Check the public HTTPS lesson and its asset, health and readiness 200, and anonymous progress 401. Prove real OAuth in authorized staging with test accounts.

[Docker Compose file merge](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/) · [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)

### 2.2 Smoke-test the image that CI builds

**Objective and evidence.** Exercise the exact Linux runtime image. CI builds standalone and Docker, while authenticated Playwright starts `next dev`. The isolated standalone test established Windows standalone behavior. Linux native bindings, migration startup, production runtime settings, and image asset copying need an image-level check.

**Files.** [CI workflow](../.github/workflows/ci.yml) · [Dockerfile](../Dockerfile) · [Postbuild packaging](../scripts/prepare-standalone.mjs) · [Health](../src/app/api/health/route.ts) · [Readiness](../src/app/api/ready/route.ts) · [Auth runtime config](../src/features/auth/runtime-config.ts)

**Implementation.**

1. Start a disposable container from the exact CI image tag or ID. Give it a fresh writable data location, a loopback test port, and synthetic runtime values. Set `BETTER_AUTH_URL` and `FIELDNOTES_PUBLIC_URL` to a matching HTTPS origin with a synthetic owner and provider configuration. The readiness check needs configuration, and provider exchanges belong to staging. Leave production test-password auth disabled.
2. Poll for startup with a fixed timeout. On failure, capture sanitized diagnostics. Clean up only the test container and its storage. Keep read-only CI permissions and pinned actions.
3. Require 200 for health, readiness, a generated lesson, a static asset referenced in its HTML, a figure, and the lab ZIP. Require 401 and `Cache-Control: no-store` for anonymous progress. Check the packaged migrations and absence of a synthetic build-input database and real environment files. Start as the image’s default user through its normal entry point.
4. Keep the existing dev-server feature suite for authenticated flows. Moving every feature test into the production image would add more test-auth setup. A smoke test covers packaging and startup with a narrower change.

**Acceptance and verification.** CI fails with actionable diagnostics if the built image cannot start, open SQLite, migrate, serve lesson assets, or enforce the public/private API contract. Confirm the job stops the disposable container after both success and failure.

[Docker test before push](https://docs.docker.com/build/ci/github-actions/test-before-push/) · [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)

### 2.3 Make Playwright own its test server

**Objective and evidence.** Ensure synthetic account setup targets the test run’s server. The current setup accepts an HTTP 200 on `PLAYWRIGHT_PORT` before proving that its child bound the port. Another responder could pass that check before the synthetic sign-up requests. The distinct database, accounts, and build directory are worth keeping.

**Files.** [Playwright config](../playwright.config.ts) · [Global setup](../tests/e2e/global-setup.ts) · [Global teardown](../tests/e2e/global-teardown.ts)

**Implementation.**

1. Configure Playwright `webServer` with the existing Next dev command, loopback address and test port, readiness URL, dedicated environment, startup timeout, and `reuseExistingServer: false`. Keep the dedicated database and test auth settings. Use distinct build output when parallel runs are supported. Confirm that Playwright 1.65.0 starts the owned server before setting up accounts.
2. Keep account creation, storage states, stale-session fixture, and route warmup in setup. Remove the PID file and custom process teardown after verifying Playwright owns the child lifecycle on Windows and Ubuntu. Keep cleanup scoped to the generated test data. If the built-in lifecycle cannot meet a demonstrated platform requirement, make the custom runner verify port ownership before account setup.

**Acceptance and verification.** Run the suite on a free port. Then use a disposable HTTP listener that records request methods on an occupied test port. Expect the suite to fail with an occupied-port diagnostic and send zero synthetic sign-up requests. Force startup failure and interrupt a separate disposable run. Confirm cleanup targets the owned child and disposable data.

[Playwright webServer configuration](https://playwright.dev/docs/test-webserver) · [Playwright browser contexts](https://playwright.dev/docs/browser-contexts)

### 2.4 Document and rehearse a consistent SQLite restore

**Objective and evidence.** Give operators a recovery path for progress, auth state, and the auth secret. SQLite runs in WAL mode. A live copy of the main file can omit committed data. Existing deployment instructions call for a backup without documenting a verified procedure. The current deployment has one Compose app instance.

**Files.** [Database initialization](../src/features/progress/storage/database.ts) · [Compose volume](../compose.yaml) · [Operator docs](development.md) · [Auth config](../src/features/auth/auth.server.ts)

**Implementation.**

1. Document a SQLite online snapshot for live backups. Use the SQLite tool or the installed driver’s backup API. A fully quiesced volume snapshot is also suitable when downtime is acceptable. Identify protected off-host storage, the retention owner, and separate secure recovery for `BETTER_AUTH_SECRET`. Learner JSON exports cover learning records. The operator snapshot also covers auth and migration state.
2. Restore into a disposable volume or empty SQLite target. Run `PRAGMA integrity_check` and expect `ok`. Run `PRAGMA foreign_key_check` and expect zero rows. Boot with the matching synthetic secret, check readiness, then verify a synthetic account can read its own progress. Record the source build and restore evidence. Preserve the old store and backup until the operator accepts the recovery.
3. Treat concurrent migrations and separate writers as conditional work. Before enabling replicas or overlapping migrations, reproduce with two separate connections or processes. The current migration ledger check runs before the write transaction. Recheck it under a write transaction or use a single explicit migrator. Verify `SQLITE_BUSY` behavior for the revision and restore transactions before choosing a retry policy. Keep applied migrations immutable.
4. If adding diagnostics while working here, retain generic client messages and log operation and error category on the server. Keep note bodies, provider responses, identities, tokens, and backup contents out of logs.

**Acceptance and verification.** Another maintainer can follow the runbook to seed synthetic progress, back up a running or quiesced test instance, restore in a separate instance, check database integrity, and verify account isolation. A multi-writer change requires an observed two-connection test. The current single-host workload does not justify a database migration solely for this finding.

[SQLite Online Backup API](https://sqlite.org/backup.html) · [WAL file handling](https://sqlite.org/wal.html#the_wal_file) · [SQLite transaction modes](https://sqlite.org/lang_transaction.html) · [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/v13.1.1/docs/api.md)


## Phase 3. Fix learner-facing behavior

### 3.1 Gate activity record editing on a usable account record

**Objective and evidence.** Prevent a signed-out learner from typing into controls that discard the input. On `/activities/A01` and `/activities/A02`, Chromium showed a sign-in notice, an editable observation field, and an enabled **Save draft**. The text immediately disappeared, and Save sent zero requests. Both workbenches omit `requiresSignIn` from their edit and save guard. `useActivityRecord()` masks the record and exits early from save in that state.

**Files.** [A01 workbench](../src/features/activities/a01-investigation-workbench.tsx) · [Generic workbench](../src/features/activities/activity-investigation-workbench.tsx) · [Activity record hook](../src/features/activities/use-activity-record.ts) · [Sign-in notice](../src/features/auth/progress-sign-in-notice.tsx)

**Implementation.**

1. Keep the sign-in notice and public task guidance. Disable or omit the private inputs and save actions while auth is pending, the user is signed out, the account changed, or the private record is unavailable. Apply the same condition to observations, legacy fields, status edits, **Save draft**, **Mark activity complete**, and reopen. Keep public step navigation, task hints, clipboard buttons, and the ability to reach the sign-in notice available.
2. Keep a guard inside the hook’s edit and save functions. A disabled button alone leaves programmatic submit and keyboard paths easy to miss. After a 401 or account-change response, preserve any draft already written under the original account key. Keep the re-authentication path and recover the draft only after the same account loads successfully.
3. Separate initial record loading, load failure, and revision conflict from signed-out behavior. Preserve retry and conflict actions when the relevant record is available. Avoid labeling a blank guest record as dirty.
4. Use the existing hook and disabled controls for this patch. Wait for task 4.3 before restructuring both workbenches.

**Acceptance and verification.**

- Open A01 and A02 in a fresh guest context. Confirm the sign-in action and public task navigation work. For the private inputs and save actions, assert hidden or disabled. Check that a guest action never displays **Unsaved changes** or issues a write.
- Sign in with a test account and verify input remains disabled until the saved record loads. Then save and reload one task observation. With a second synthetic session or a scoped browser route fixture, simulate expiry after typing. Assert the same account can recover its draft and another account cannot see it.
- Preserve the existing activity completion, early-completion confirmation, review, and reopen tests. Verify both existing desktop and compact workflows.

[React controlled textarea](https://react.dev/reference/react-dom/components/textarea) · [Existing browser auth and activity tests](../tests/e2e)

### 3.2 Let the browser receive session renewal cookies

**Objective and evidence.** Keep server identity reads from advancing expiry before the browser can receive the renewal cookie. `getCurrentSession()` calls the Better Auth server API with request headers and consumes a session object. The caller cannot relay that API call’s cookie. In a synthetic test against Better Auth 1.7.26, the server call advanced database expiry and the subsequent browser request issued no renewal cookie.

**Files.** [Better Auth configuration and session lookup](../src/features/auth/auth.server.ts) · [Client](../src/features/auth/auth-client.ts) · [App auth route](../src/app/api/auth/%5B...all%5D/route.ts) · [Progress route](../src/app/api/progress/route.ts) · [Account route](../src/app/account/page.tsx) · [Roadmap route](../src/app/roadmap/page.tsx) · [Sign-in route](../src/app/sign-in/page.tsx)

**Implementation.**

1. Verify the installed endpoint code in `node_modules/better-auth/dist/api/routes/session.mjs` and `dist/client/session-atom.mjs`. The documented `session.deferSessionRefresh: true` makes the GET lookup return a refresh indication and the installed browser client follows it with a POST. Use that mechanism if the real browser regression confirms the cookie is renewed through the auth route.
2. Keep the existing session lifetimes, Secure and host-scoped cookie settings, session freshness for account deletion, and provider configuration. The auth route already exports GET and POST. Let Better Auth issue the cookie from that route. Keep ordinary request authorization tied to the server lookup.
3. An alternative is passing the installed API’s supported `query.disableRefresh: true` only in `getCurrentSession()`. This narrows changes for other callers while leaving browser GET refresh intact. Choose one approach based on the actual ordering test. With deferred mode, also check how expired sessions are handled in the installed library before making any cleanup or retention changes.

**Acceptance and verification.** Age the expiry of a synthetic authenticated browser session into the refresh window using the disposable DB. Exercise a server-rendered session read first. Confirm it does not consume the renewal. Let the browser call the auth session route and verify the browser’s session cookie expiry advances. Compare the final cookie and SQLite expiry without printing cookie values. Test a session below the refresh threshold, an expired or revoked session, a stale deletion session, sign-out, and anonymous progress 401. The existing age-of-session deletion fixture changes creation time. Set the renewal fixture’s expiry according to the installed refresh formula so it actually reaches the intended branch.

[Better Auth session refresh](https://better-auth.com/docs/concepts/session-management#defer-session-refresh) · [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next) · [Existing authentication tests](../tests/e2e/zz-authentication.spec.ts)

### 3.3 Make project checkpoint links open the requested checkpoint

**Objective and evidence.** Keep the visible checkpoint, URL, active step, and notebook field aligned. In `/projects/S02`, selecting S02.3 and following Review’s link to S02.2 changed the hash and reopened Build while leaving S02.3 active. `ProjectMilestoneContent` prioritizes a persistent `selectedOverride` ahead of the current hash. Build remains mounted across stage transitions to preserve its editor.

**Files.** [Checkpoint selection](../src/features/projects/milestone-checklist.tsx) · [Stage navigation](../src/features/projects/project-flow-nav.tsx) · [Review links](../src/features/projects/project-record-review.tsx) · [Project wiring](../src/features/projects/project-detail.tsx) · [Browser suite](../tests/e2e/learning-flow.spec.ts)

**Implementation.**

1. Derive explicit checkpoint selection from a valid `#milestone-<id>` in the URL. Check the ID against the current project’s milestones. Use the first unfinished checkpoint, then the first checkpoint, for the Build view without a valid checkpoint hash. If tab return should remember a prior selection, store that value only as the no-hash fallback. A valid explicit hash always wins.
2. Keep one project-scoped way to write and observe the hash, using the existing external-store subscription or a small project-local helper. Browser links and Back or Forward raise location events. Programmatic `pushState()` and `replaceState()` do not emit `hashchange` by themselves. Notify subscribers when either stage or checkpoint code writes history. Keep existing stage history semantics unless the test proves a different policy is needed.
3. Route an explicit checkpoint hash to Build and reveal or focus the corresponding rendered checkpoint. Avoid competing stage and checkpoint scroll actions. Respect reduced motion, preserve the four-stage tab keyboard behavior, and keep the same project editor instance mounted. Changing checkpoint context should select a different field within the same project record.
4. Keep the current optimistic completion and revision behavior. If toggling or reopening an already selected checkpoint should keep it selected, reflect that with the same selection rule. A racing save should update its own checkpoint’s status without changing a newer URL selection.

**Acceptance and verification.** Extend the existing project Review test to select S02.3 first, then follow the S02.2 link. Assert the hash, Build tab, current step, heading, and notebook field all identify S02.2. Test direct valid links, a link to an unknown checkpoint, no milestones where the feature allows it, reload, Back and Forward, and both text drafts and checkbox saves during stage changes. Confirm no second independent project editor or duplicate PUT is created.

[React state modeling](https://react.dev/learn/choosing-the-state-structure) · [React browser subscriptions](https://react.dev/reference/react/useSyncExternalStore) · [HTML history and navigation](https://html.spec.whatwg.org/multipage/nav-history-apis.html) · [Next.js linking and navigation](https://nextjs.org/docs/app/getting-started/linking-and-navigating)

### 3.4 Keep activity instructions stable while a learner types

**Objective and evidence.** Preserve open command help and other interactive instruction state while editing. On A01, typing a note detached the original help disclosure and mounted a closed one. A02 also replaced the task DOM during an edit. `MarkdownContent` recreates renderer functions for ordered lists, paragraphs, code blocks, and optional heading IDs. React sees a different component type on the next render.

**Files.** [Markdown renderer](../src/components/ui/markdown-content.tsx) · [Copy button](../src/components/ui/copy-code-button.tsx) · [A01 workbench](../src/features/activities/a01-investigation-workbench.tsx) · [Generic workbench](../src/features/activities/activity-investigation-workbench.tsx)

**Implementation.**

1. Define renderer component functions at stable module scope. Pass changing options through a narrowly scoped context or another stable boundary supported by react-markdown. Keep heading ID prefix, task IDs, hints, progress-button handler, code-copy behavior, figure handling, GFM, and syntax highlighting.
2. Keep nested help Markdown isolated from the outer task options. An inner renderer must not mistake an ordered list in a hint for the parent task list. Preserve the existing task ID and heading anchors. Avoid remounting the renderer by keying it on a note, callback, or save state.
3. Measure the remaining work separately. If the Markdown parser still runs on every keystroke and it matters, isolate the static instruction section from edit state or render guidance on the server with client task actions. Any memoization must use stable props and must still update disabled controls and handlers when auth or task data changes. Fixing remounts and avoiding parse work are distinct checks.

**Acceptance and verification.** Add a Chromium regression that opens **Command notes and troubleshooting**, types into **Task observation**, and asserts the same disclosure stays open. Exercise a generic activity, code-copy controls, diagram captions, nested lists, and task selection as auth and loading state changes. Verify focus stays in the observation as the page updates. If claiming a performance gain, compare parser calls or interaction traces for the same typing sequence before and after.

[React state preservation](https://react.dev/learn/preserving-and-resetting-state) · [React static component rule](https://react.dev/reference/eslint-plugin-react-hooks/lints/static-components) · [react-markdown component contract](https://github.com/remarkjs/react-markdown#components) · [Next.js server and client boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components)

### 3.5 Fix mobile drawer navigation and keyboard focus

**Objective and evidence.** Close the navigation drawer when an account link is activated and return focus to the actual notebook opener. A 390-pixel browser check found navigation still covering sign-in after the account link loaded. Hosted A01 Escape restored focus to the general notebook button after opening from a task button. Project notebook’s custom tabbable selector skips the visible native `summary` when the remaining controls are loading.

**Files.** [App shell](../src/components/app-shell.tsx) · [Account links](../src/features/auth/account-navigation.tsx) · [A01 workbench](../src/features/activities/a01-investigation-workbench.tsx) · [Generic workbench](../src/features/activities/activity-investigation-workbench.tsx) · [Project notebook](../src/features/projects/milestone-checklist.tsx) · [Background inert helper](../src/features/ui/use-modal-inert-siblings.ts) · [Global styles](../src/app/globals.css)

**Implementation.**

1. Feed the existing sidebar dismissal into both account links. Use the same navigation policy as normal learning links. Verify both same-route activation and navigation to a new route. Keep focus restoration for a dismissed menu and confirm that navigation leaves focus at a useful destination. Keep ordinary modified clicks consistent with the chosen Next Link handler.
2. Capture the notebook trigger from the initiating event’s `currentTarget` before moving focus. Pass it through the activity Markdown task callback and the direct review buttons. A platform may leave `document.activeElement` on the body after a pointer click. Use a single close path for button, Escape, backdrop, and breakpoint transitions. Restore focus after the guard that marks the background inert has released it. If the opener was removed or hidden, use the visible notebook toggle or nearest logical control.
3. In the project drawer, include visible native `summary` and other real tabbable controls when testing keyboard containment. Verify disabled controls and closed disclosure descendants are excluded. If keeping the custom panel, test focus at both ends of the tab order, including when only a subset has loaded.
4. Evaluate native `dialog.showModal()` as part of the later shared workbench change. It can remove manual trapping and inert management. It still needs opening, closing, focus return, and responsive layout tests. Keep the same draft when switching between the mobile modal and desktop inline form. The direct fixes above can ship before a modal conversion.

**Acceptance and verification.** At 390 pixels, open the sidebar and follow **Sign in** as a guest, then **Account** as a learner. Verify the drawer closes and each route is usable. Open activity notebooks from task and review buttons with keyboard and pointer input. Close with Escape, the close button, and the backdrop. Assert which element receives focus. Open the project notebook with its GET delayed and tab from Close to the visible notes disclosure, then test reverse tab order while loaded. Check 320-pixel reflow, desktop resizing, and reduced motion. On visual dismissal, the background and scroll position should be usable again.

[W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) · [W3C native dialog technique](https://www.w3.org/WAI/WCAG22/Techniques/html/H102) · [Next.js Link reference](https://nextjs.org/docs/app/api-reference/components/link)

## Phase 4. Consolidate data and state ownership

### 4.1 Return the persisted record after saving

**Objective and evidence.** Make the successful `PUT /api/progress` response match the stored row. When a project or small project save omits optional `taskObservations`, SQL retains existing observations. The return object is synthesized from the input and reports an empty map. The activity branch also performs an extra observation lookup even though an existing record is already read.

**Files.** [Database upsert and row mapper](../src/features/progress/storage/database.ts) · [Storage API](../src/features/progress/storage/store.server.ts) · [Request validation](../src/features/progress/validation.ts) · [PUT route](../src/app/api/progress/route.ts) · [Storage tests](../src/features/progress/storage/database.test.ts)

**Implementation.**

1. Preserve omission semantics in `onConflictDoUpdate`. For an existing record, omission keeps the stored map. An explicitly supplied valid map, including an empty map where the schema permits it, is a deliberate replacement. For a new record with no observations, use the existing empty default.
2. Use Drizzle’s SQLite `returning()` on the upsert and apply `fromRow()` to the returned row inside the current transaction. Keep account-scoped conflict keys, timestamp rules, revision increments, and the CAS precondition. SQLite 3.54.1 and Drizzle 0.45.4 support this path. A scoped read immediately after the write in the same transaction is a fallback if a concrete adapter issue prevents returning. Avoid synthesizing a second response shape.
3. Reuse the row already read for revision or restore ordering where possible. Remove the activity-only query and any duplicate row read that serves no remaining caller. Verify that legacy adoption continues to copy the same fields and timestamps.
4. Check callers of `saveProgress` and `saveProgressMany`. Current exports have no app callers. Change any tests of production save or restore behavior to use `saveIfCurrent()` or `mergeMany()`, then remove unused exports and remove test-only storage alternatives when their role is truly gone. Keep concise fixture setup where it helps test an old database.

**Acceptance and verification.** For `activity`, `project`, and `small_project`, save an observation, send a valid update omitting the field, and compare the returned object with a subsequent targeted GET. Prove deliberate clearing, first insert, revision increments, and 409 on stale revision. Run backup, legacy migration, and account isolation tests. A failure in the write or row mapping must not leave a partially applied restore.

[SQLite RETURNING](https://sqlite.org/lang_returning.html) · [Drizzle insert returning](https://orm.drizzle.team/docs/insert#insert-returning)

### 4.2 Distinguish auth outages and share project record reads

**Objective and evidence.** Report session failures consistently and avoid redundant reads. The provider drops `authClient.useSession().error`. A cold 503 produced sign-in controls in some clients and an outage in the summary. Fresh guests fetched private progress and received 401 after session lookup. Build and Review fetched the same project detail independently. The existing list provider already shares a lightweight summary for mounted list consumers.

**Files.** [Session context](../src/features/auth/auth-session-context.tsx) · [Account navigation](../src/features/auth/account-navigation.tsx) · [Summary provider](../src/features/progress/progress-list-context.tsx) · [Detail hook](../src/features/progress/use-progress-records.ts) · [Progress editor](../src/features/progress/progress-editor.tsx) · [Activity hook](../src/features/activities/use-activity-record.ts) · [Backup UI](../src/features/progress/progress-backup.tsx) · [Project review](../src/features/projects/project-record-review.tsx) · [Server-rendered roadmap](../src/app/roadmap/page.tsx)

**Implementation.**

1. Expose a discriminated state from the session provider. Use `loading`, `signed-out`, `signed-in` with the current Better Auth session user ID, and `unavailable` with a retry path. Interpret an auth error before an empty or cached session. Verify the installed client’s `refetch` contract. Keep account-bound draft keys available to the editing lifecycle for recovery without rendering private data from a stale account during an outage or switch.
2. Migrate all `useAuthSession()` callers together. Let known guests reach completed guest UI without issuing a private progress request. An outage should show retry and preserve public content. In a signed-in state, keep `X-Fieldnotes-Account`, request cancellation, and server authorization. Continue handling a 401 or account-change 409 after the client thought it was signed in.
3. Bring Build and Review under one project-local saved snapshot keyed by user, project type, and project ID. Keep the editor’s unsaved draft distinct so Review shows persisted evidence only. Let a successful PUT publish the returned saved row. Let restore or another operation affecting that record invalidate the snapshot. If Review opens first it can start the read, and if Build already has a valid read it can reuse it. Retain the separate lightweight milestone summary. Keep stale responses from a prior account from publishing.
4. Leave `/roadmap` server-rendered unless a separate change justifies moving it. Its server code already derives account progress per request. Keep the purpose of the current whole-notebook export read. A project-local boundary is sufficient for the observed duplicate, and a package-wide cache would add scope.

**Acceptance and verification.**

- Observe requests in a fresh guest context. Open dashboard, lesson, notebook, project Review, and an activity. Each skips private browser reads once signed-out state is established. Direct guest access to the API still returns 401.
- Simulate a cold session 503 and a refetch failure after a successful session. Confirm consistent outage messaging, available public material, and recoverable private drafts. Release delayed account A responses after switching to B and confirm saved notes never appear under B.
- In signed-in Build then Review, expect one project detail GET for an unchanged account and item, plus the needed summary. Check Review-first, active editing, a successful save, 409, a failed initial request, retry, and restore. Review should reflect the saved response and never display unsaved edits.
- Verify summary responses remain compact. A global `progress-updated` event can remain for consumers that legitimately need broad invalidation. Narrow project detail invalidation so unrelated saves do not reload the same detail.

[Better Auth session client](https://better-auth.com/docs/concepts/session-management#use-session) · [React effect cleanup and data fetching](https://react.dev/reference/react/useEffect#fetching-data-with-effects) · [React state modeling](https://react.dev/learn/choosing-the-state-structure)

### 4.3 Consolidate the progress lifecycle and activity workbenches

**Objective and evidence.** Give account-keyed load, draft, revision, conflict, and save rules one owner. `ProgressEditorInstance` and `useActivityRecord()` implement the same lifecycle independently. A01 and the generic activity workbench repeat task selection, modal controls, review, and completion. This has produced concrete drift. A01 ignores `repositoryUrl` in its legacy section even though the API accepts it and the main notebook displays it. The generic editor keeps typing during a pending save, while activities use a deliberate edit lock.

**Files.** [Generic editor](../src/features/progress/progress-editor.tsx) · [Activity hook](../src/features/activities/use-activity-record.ts) · [Draft helpers](../src/features/progress/progress-draft.ts) · [Conflict UI](../src/features/progress/progress-conflict.tsx) · [Unsaved changes warning](../src/features/progress/use-unsaved-changes-warning.ts) · [A01 workbench](../src/features/activities/a01-investigation-workbench.tsx) · [Generic workbench](../src/features/activities/activity-investigation-workbench.tsx) · [A01 task catalog](../src/features/activities/a01-task-catalog.ts) · [Activity route](../src/app/activities/%5Bid%5D/page.tsx)

**Implementation.**

1. Inventory caller contracts before extracting code. The generic editor serves module, lesson, project, and troubleshooting forms. Activities share one record per activity with observations by stable task ID. Major and focused projects share checkpoint observations within one project record. Preserve each form’s labels, layout, and save behavior.
2. Move the record lifecycle into one progress-owned hook after tasks 4.1 and 4.2 establish reliable record results. Let it own account and item identity, server loads, draft rehydration, current revision and conflict, retry, mutation, and successful snapshot updates. Keep activity-specific save status choices and project-specific fields in their features. Start with the state and operations that both callers need. Extra configuration belongs in a caller until real reuse is clear.
3. Preserve compare-before-replace in `progress-draft.ts`. Snapshot the submitted draft and revision. If the user types again before the successful reply, keep the newer text, rebase its expected revision on the returned row, and mark it unsaved. If a different account or item now owns the UI, invalidate the old request and keep its effects scoped to its original identity. For `PROGRESS_CONFLICT`, preserve the draft and require an explicit conflict choice. For `ACCOUNT_CHANGED`, keep the draft bound to the original account and require reopening under the intended account. Keep the existing feature-specific activity save lock at the form boundary.
4. After both callers use the shared lifecycle, consolidate the activity workflows around the generic workbench. Supply A01 task definitions, task-specific command notes and hints, instructional copy, and the legacy section through explicit feature data or a small existing component boundary. Keep stable IDs, anchors, old records, and the one shared notebook. Expose existing A01 `repositoryUrl` for editing and clearing with the same HTTP(S) validation as the other activity workbench. Include the field in legacy visibility and dirty-state checks.
5. Assess dialog reuse after task 3.5. One common compact notebook makes sense if both workbenches use the same interaction. A generic form system or new state framework would enlarge the change without fixing the core rule ownership. Remove obsolete branches after migrating their callers.

**Acceptance and verification.**

- Run draft recovery across collapse, navigation, reload, and same-account re-authentication. Run the two-account read and write regression. Delay a PUT, type a second edit, resolve the request, and prove that Save again uses the next revision without losing text. Verify activity inputs remain intentionally locked while saving.
- Test stale revision choices for keep draft and load saved, initial GET failure and retry, canceled navigation, account switch, and legacy v1/v2/v3 restore. Compare the saved UI with the returned server record.
- For A01 and a generic activity, test task focus, hints, save, review, early completion, reopen, and compact drawer behavior. Use an imported A01 record containing only a repository URL to prove visibility, edit, and clearing. Keep A01’s existing five task observations and all legacy fields intact.

[React effect cleanup](https://react.dev/reference/react/useEffect) · [React state structure](https://react.dev/learn/choosing-the-state-structure) · [Existing browser regressions](../tests/e2e/learning-flow.spec.ts)

### 4.4 Use a compact project model on the dashboard

**Objective and evidence.** Stop shipping and parsing unused checkpoint guidance, and exclude completed projects from new recommendations. `getDashboardContent()` passes full **Build milestones** Markdown for 11 projects. `buildDashboardModel()`, `makeNextItems()`, and `makeRecentItems()` reconstruct milestones from it. The baseline was 51,595 raw UTF-8 JSON bytes. Equivalent project IDs, titles, and 55 checkpoint IDs and labels used 3,964 bytes. Those figures describe serialization, while transfer and latency remain unmeasured. The baseline model recommended S01.2 when S01 was already complete and S01.1 was checked.

**Files.** [Dashboard server content](../src/features/dashboard/content.server.ts) · [Dashboard model](../src/features/dashboard/model.ts) · [Dashboard tests](../src/features/dashboard/model.test.ts) · [Parsed content catalog](../src/content/catalog.ts) · [Milestone parser](../src/content/project-milestones.ts) · [Projects route](../src/app/projects/page.tsx) · [Project overview](../src/features/projects/project-overview.tsx)

**Implementation.**

1. Project the existing `projectMilestones` catalog into each dashboard project’s checkpoint summary on the server. Use the smallest shape consumed by the dashboard, such as project ID, title, type, and ordered checkpoint IDs and labels. Keep Markdown guidance in the project content. Update model tests to pass the new contract. The existing projects route shows how to build a compact projection.
2. Build the relevant indexes once per model calculation and pass them into the functions deriving Recent work, Up next, and project resume. Remove the parser import from the dashboard’s client dependency path. Use one project eligibility rule to exclude explicit completed status from new suggestions. Preserve activity recency, actual checkpoint counts, saved-draft visibility, project type, and checkpoint order. Reuse the rule in the project directory if the semantics are identical.
3. Keep independent project and checkpoint status. An absent project row plus completed checkpoint can still represent active work. A completed project with unfinished checkpoints can still appear in history and remain editable when visited. Only its suggestion eligibility changes.

**Acceptance and verification.** Add cases for completed S01 with a completed S01.1, checkpoint-only work, a saved project draft, `needs_review`, all checkpoints complete, and two active projects with different timestamps. Verify links identify valid project and checkpoint IDs and existing module sequencing still passes. For the same 11 projects and 55 checkpoints, compare `Buffer.byteLength(JSON.stringify(projectProps), "utf8")` before and after, recording shape and counts. Confirm the client receives no full checkpoint guidance and that the model no longer parses it. Measure browser transfer or latency separately if reporting those outcomes.

[Next.js client prop serialization](https://nextjs.org/docs/app/getting-started/server-and-client-components) · [React derived state](https://react.dev/learn/choosing-the-state-structure)


## Phase 5. Remove verified redundancy

### 5.1 Prune unused UI and fix the project editor style hook

**Objective and evidence.** Reduce unused component APIs and restore intended project notebook styling. The project editor emits `progress-editor--project-workbench`. The project notebook selectors expect `editor-card--project-workbench`. Whole-tree reference checks found no callers for `DashboardProgress`, UI `Card` and `Badge`, or the editor’s `bare`, `recordContext`, `reflectionPrompt`, and `activity-lab` surfaces. UI `Progress` is used by the unused dashboard. Live `Button` callers use shared CSS classes and do not use its variant, size, or `asChild` options. The global stylesheet directly imports `highlight.js` from the transitive chain through `rehype-highlight` and `lowlight`.

**Files.** [Global CSS](../src/app/globals.css) · [Progress editor](../src/features/progress/progress-editor.tsx) · [Unused dashboard](../src/features/dashboard/dashboard-progress.tsx) · [Badge](../src/components/ui/badge.tsx) · [Card](../src/components/ui/card.tsx) · [Progress bar](../src/components/ui/progress.tsx) · [Button](../src/components/ui/button.tsx) · [Dependency manifest](../package.json)

**Implementation.**

1. Use one project editor class name and make its scoped selectors match. Check every former selector before choosing which name to keep. Preserve other editor variants, responsive drawer padding, status colors, and focus visibility. Keep global tokens and base styles together. Scope feature CSS during related edits when that prevents selector drift.
2. Re-run whole-tree searches for imports, exports, names, and class selectors in source and tests. Remove verified dead components and editor options after their active callers have migrated. Remove orphaned CSS when its last DOM producer disappears. Verify Tailwind and global link or button classes before changing their cascade.
3. Simplify the live Button API with native button semantics and the current shared classes. Preserve `type`, disabled behavior, refs, form name and value, accessibility attributes, and styles on hover and keyboard focus. If consumers need no wrapper after cleanup, migrate them together. If a thin wrapper keeps useful consistent markup, retain that boundary.
4. After JSX and CSS checks, use `npm explain radix-ui`, `npm explain class-variance-authority`, and `npm explain highlight.js`. Remove direct dependencies only after proving they have no remaining contract in config, code, or tests. If retaining the imported upstream syntax theme, make its dependency explicit and use a version compatible with the installed highlighting pipeline. Maintaining a custom theme is an alternative if there is a product reason. Keep lockfile updates limited to the justified dependency changes.

**Acceptance and verification.** Confirm the emitted project modifier matches a live rule in Chromium. Compare the project editor on desktop and at 320 and 390 pixels, and exercise save, disabled state, keyboard focus, and a code example with highlighting. Check `git grep`, lint, TypeScript, the full browser suite, and a clean locked production build after dependency changes. Report bundle size only if measured on comparable builds.

[Next.js CSS scope](https://nextjs.org/docs/app/getting-started/css) · [React DOM refs and native props](https://react.dev/reference/react-dom/components/common#ref-callback) · [npm explain](https://docs.npmjs.com/cli/v11/commands/npm-explain) · [npm dependency declarations](https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file)

### 5.2 Reduce lesson registration work if authoring needs it

**Objective and decision.** Keep lesson IDs and MDX imports synchronized with less wrapper churn when adding lessons becomes frequent. Current metadata, exported MDX IDs and titles, and the 24 module wrappers each participate in registration. Existing strict schemas, build coverage, and link tests make the current approach workable. Schedule this task only after a representative lesson addition demonstrates recurring authoring friction.

**Files.** [Module metadata](../src/content/curriculum/modules/definitions.ts) · [Module schema](../src/content/module-definitions.ts) · [Module renderer registry](../src/features/roadmap/module-lesson.tsx) · [Wrapper example](../src/features/roadmap/module-01-lessons.tsx) · [Shared lesson renderer](../src/features/roadmap/module-lessons.tsx) · [Lesson route](../src/app/modules/%5Bid%5D/lessons/%5BlessonId%5D/page.tsx) · [MDX components](../src/mdx-components.tsx) · [Content tests](../src/content/content.test.ts)

**Implementation if justified.**

1. Identify each registration edit needed for a typical new lesson on a disposable branch. Prefer a build-checked registry of explicit imports keyed by stable lesson ID, with one shared rendering path. Keep catalog metadata authoritative for route order. Preserve module review entries as their current distinct content kind.
2. Verify the actual compiled output and bundler behavior before choosing the registry layout. An all-module import may broaden route dependencies. Check the production output for representative routes. Runtime filesystem loading and a custom generation step cost more to validate and only make sense if authoring volume warrants them.
3. Keep MDX trusted and repository-owned, stable URLs and progress keys, titles, figure accessibility, and transient knowledge checks. Remove obsolete wrapper code once all callers use the shared registry.

**Acceptance and verification.** Demonstrate fewer manual edits with a synthetic new lesson in an isolated checkout. Verify duplicate and missing IDs fail the existing integrity checks or an equally direct build check. Confirm the 24 overviews, 77 existing lesson routes, the separate Module 01 review, figures, and previous and next links render in the production build. Keep the current registration if the alternative adds meaningful build risk for little authoring benefit.

[Next.js MDX guide](https://nextjs.org/docs/app/guides/mdx) · [Next.js static route generation](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

### 5.3 Align the Status API starter and Activity A08

**Objective and evidence.** Make downloaded instructions lead to the intended non-root volume exercise. The ZIP matched all 11 checked-in entries during the audit. A08 uses Python 3.13 and prepares `/lab-data`. The supplied Dockerfile uses Python 3.12, prepares `/data`, and runs as UID and GID 10001. The path mismatch can cause permission issues when learners use the supplied Dockerfile with the A08 mount. The actual reproduction needs a disposable runtime.

**Files.** [A08 activity](../src/content/curriculum/activities/A08.md) · [Starter README](../public/labs/status-api/README.md) · [Starter Dockerfile](../public/labs/status-api/Dockerfile) · [Starter Compose](../public/labs/status-api/compose.yaml) · [Python tests](../public/labs/status-api/test_app.py) · [Development requirements](../public/labs/status-api/requirements-dev.txt) · [Download](../public/labs/status-api.zip) · [CI workflow](../.github/workflows/ci.yml)

**Implementation.**

1. Extract the current archive into a disposable lab directory. Reproduce the baseline marker exercise using a unique local container and volume, and inspect the configured UID, mount target, and marker write result. Keep the port published only on loopback and the lab independent of the LMS container and volume.
2. Use the starter’s Python baseline and prepared `/data` target consistently across A08’s Dockerfile guidance, mount, marker commands, troubleshooting, and README when the goal is volume persistence. If editing the Dockerfile is part of the exercise, state the exact Python and path changes at the step where the learner makes them and use the resulting path consistently.
3. Keep the distinction between the image layer and named-volume marker. Preserve non-root operation, stable pinned Python dependencies, and the A05 local fixture, A09 Compose, A10 test, and A11 image promotion contracts. If startup depends on copying prepared directory ownership into an empty volume, test a fresh volume and explain the existing-volume case in the exercise.
4. For any starter file change, regenerate the existing ZIP from the reviewed source directory. Add a packaging check that compares relative member names and uncompressed bytes and rejects extra or missing entries. Run the existing Python tests in an isolated environment in the lab CI scope. Those tests use synthetic database responses. Add a one-time Compose verification of the lesson flow to establish runtime behavior.

**Acceptance and verification.** The documented non-root process writes the named-volume marker and can see it after recreation. The layer marker starts absent in the new container. The ZIP and source match. `python -m pytest -q` passes from the extracted starter, and the relevant proxy, health, and database paths work in the disposable Compose project. Keep runtime evidence separate from archive parity.

[Docker named volume behavior](https://docs.docker.com/engine/storage/volumes/#mounting-a-volume-over-existing-data) · [Docker container user](https://docs.docker.com/reference/dockerfile/#user) · [pytest invocation](https://docs.pytest.org/en/stable/how-to/usage.html)

## Final verification checklist

Run the targeted tests after each task and the relevant full checks after the phase. Use an isolated checkout, a free test port, and the project’s locked dependencies. The commands below assume PowerShell. Set `PLAYWRIGHT_PORT` to a port you verified is free.

```powershell
git status --short --branch
git diff --check
npm run lint
npm run typecheck
npm test
npm run build
$env:PLAYWRIGHT_PORT = "3037"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_PORT
```

For a narrow browser run, pass a quoted test-name filter through the existing command. For example, `npm run test:e2e -- -g "a stale draft can be compared"`. Use both the original reproduction and the relevant existing regressions. Record the commit, command, platform, and result.

| Area | Evidence required before closing the task |
| --- | --- |
| Persistence | A synthetic saved record survives reload and restart. A local standalone record survives rebuild outside the output directory. Docker starts from a disposable mounted volume and can reopen it. |
| Import and conflict | Preview and apply reject out-of-policy dates, versions 1 through 3 still work, and invalid old rows render safely. Re-import is idempotent. A stale revision returns 409, and an omitted observation map survives the update and response. |
| Authentication and isolation | Guest HTTP gets 401 on progress. Two synthetic accounts cannot read or write each other’s data. Account changes reject late results. Browser renewal advances the cookie when eligible. Expired sessions and stale deletion sessions retain their existing behavior. |
| Request integrity | Same-origin enforcement, body limits, safe error messages, and account-scoped response caching continue to pass. Keep credentials and personal data out of fixtures, artifacts, logs, and screenshots. |
| Learning flow | Public overview, lesson, activity, project, and resource routes still open. Task and checkpoint IDs stay stable. A learner can save, reopen, restore a draft, and review the intended record. |
| Accessibility | Keyboard users can open, operate, and dismiss drawers. Focus returns to the opener or a logical fallback. The page reflows at 320 and 390 pixels, supports desktop resize, and honors reduced motion. |
| Performance | Record request counts for the same guest and signed-in flows. Compare uncompressed JSON separately from network transfer. Check open disclosure identity across edits and measure parse work independently if optimizing it. |
| Packaging and operations | The exact image passes its smoke test. Build artifacts contain required migrations and assets, and exclude private inputs. The Compose overlay validates and the restore drill succeeds. Attribute hosted behavior only when a staged or deployed revision is verified. |
| Code quality and maintainability | Each rule has a clear owner. Reused helpers replace duplicated work, and obsolete callers, branches, and styles are removed after migration. Retain existing design where a proposed replacement has equal behavior and higher maintenance cost. |

### Record the handoff

For each completed task, record the changed entry point, the test that first exposed the issue, the verification result, and any remaining uncertainty. Update the task status to confirmed fixed, partially addressed, outstanding, or pending verification. Keep historical test results separate from those collected on the implementation. If an optional change has little measurable benefit, record the evidence and leave the working design in place.
