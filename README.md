# Fieldnotes

Fieldnotes is a self-hosted DevOps learning workspace. Its curriculum is public, while each signed-in learner gets a private progress notebook stored in the host's SQLite database.

> **Account model:** Google and GitHub sign-in create accounts on first use; no invitation is required. Progress is isolated by account in one SQLite file on the host. Authentication does not make the application database cloud-hosted or encrypt learner notes at rest. The optional Cloudflare Tunnel can route traffic, but Cloudflare Access is not required; Fieldnotes handles sign-in itself.

## What it does today

- Organizes **24 learning modules** into a roadmap, with concepts, explanations, practice, checks, and references.
- Provides **24 guided activities**, troubleshooting scenarios, and small and major project briefs.
- Stores saved notes, self-reported progress, and project milestones in SQLite.
- Keeps each learner's records separate and offers account session management.
- Offers a searchable Resource Library with the eight supplied PDFs, official references, and glossary terms.
- Supports validated JSON progress export and merge import. Backups are manual and unencrypted.

Opening a lesson does not mark it complete. Completion is a learner's self-report, not a verified skills assessment. See [Architecture](docs/architecture.md) for data boundaries and current limitations.

## Technology

Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui primitives, SQLite, Drizzle ORM, Zod, Vitest, Playwright, and Docker Compose. Curriculum content is maintained as Markdown under `src/content/curriculum/`.

## Run with Docker

**Requirements:** Docker Desktop with Compose support, or Docker Engine with the Compose plugin. Port 3000 must be available.

Before starting Compose, configure the production-only values in `.env` as described in [Account setup](#account-setup-before-publishing). Local development and production use separate secrets and provider credential variables.

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Other shells:

```sh
cp .env.example .env
docker compose up --build -d
docker compose ps
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Compose starts one app container and a persistent SQLite volume; it does not start PostgreSQL, Redis, or a reverse proxy.

`docker compose down` stops and removes the container and network but **keeps** the `learning-data` volume. Do not use `docker compose down -v` unless you intend to permanently delete saved learning records.

### Account setup before publishing

1. Set `BETTER_AUTH_SECRET` and `FIELDNOTES_PROD_BETTER_AUTH_SECRET` to different unique random values of at least 32 characters. Keep them in `.env`; do not commit or paste them into chat. Replacing a production secret signs out existing sessions and can make previously encrypted OAuth tokens unreadable, so keep the production value stable and back it up securely.
2. Set `FIELDNOTES_OWNER_EMAIL` to the email address you control through Google or GitHub. That provider must confirm the email as verified. The owner account is identified by this exact email; other visitors can create their own accounts but cannot claim existing progress.
3. Use separate Google Cloud projects/OAuth clients for development and production. Put local client values in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; put production values in `FIELDNOTES_PROD_GOOGLE_CLIENT_ID` and `FIELDNOTES_PROD_GOOGLE_CLIENT_SECRET`. Register only `https://learn.cybertracesystems.com/api/auth/callback/google` on the production client. GitHub credentials follow the same split. Keep `FIELDNOTES_PUBLIC_URL` set to the public HTTPS origin.
4. Publish the public `/privacy` and `/terms` pages on the verified domain, then complete the provider's branding and consent-screen setup. Fieldnotes requests basic identity only; it does not request access to Google Drive or GitHub repositories.
5. Start or rebuild the service, then try signing in from a private browser window. Confirm public lessons still open when signed out, a learner can create an account at first sign-in, and their saved progress appears only in that account.

Production does not enable password-based registration. Local Playwright tests enable a test-only email/password endpoint in a disposable database; it is disabled in production. Sessions are stored in SQLite and can last up to 30 days with regular use; they can be revoked from the account page. Account deletion requires a recent sign-in (within 10 minutes) and typing `DELETE`; it removes the account and saved work from the active database, but not downloaded exports or copies already in backups. Fieldnotes does not delete accounts because of inactivity. Removing a container does not remove the named data volume.

If the database already contains shared progress, migration `0004` moves it into a private legacy archive. It is transferred into the account matching `FIELDNOTES_OWNER_EMAIL` only after that provider signs in with a verified email. Other accounts see no legacy records. Migration `0005` removes any unclaimed legacy archive if the owner account is explicitly deleted. Back up the Docker volume before upgrading, and do not delete it during deployment.

### Optional: use the existing CyberTrace Cloudflare Tunnel

Cloudflare Tunnel can make the app reachable at `learn.cybertracesystems.com`; Fieldnotes OAuth remains the account sign-in. **Do not enable Cloudflare Access for this route** if the goal is to let learners reach the public lessons without a Cloudflare account.

1. Find the Docker network used by the existing `cloudflared` container with `docker network ls`. Add its exact name as `FIELDNOTES_TUNNEL_NETWORK` in `.env` without replacing other settings.
2. Start Fieldnotes with the optional overlay:

   ```powershell
   $changes = git status --porcelain
   $env:FIELDNOTES_SOURCE_REVISION = if ($changes) { "uncommitted" } else { (git rev-parse HEAD).Trim() }
   docker compose -f compose.yaml -f compose.cloudflare.yaml config --quiet
   docker compose -f compose.yaml -f compose.cloudflare.yaml up --build -d
   docker image inspect devops-fieldnotes:local --format '{{.Id}} {{index .Config.Labels "org.opencontainers.image.revision"}}'
   ```

   This keeps the existing loopback address and the `learning-data` volume. The overlay connects the app to the existing Tunnel network and gives it the internal name `fieldnotes-lms`. Record the image ID and revision output with the release. A dirty checkout is labeled `uncommitted`; do not label it with `HEAD` as if that commit alone described the image.
3. In Cloudflare Zero Trust, add a **Published application** route for `learn.cybertracesystems.com` with service `http://fieldnotes-lms:3000`. Do not attach a Cloudflare Access application. Cloudflare creates the DNS route for the hostname.
4. Open `https://learn.cybertracesystems.com` in a private browser window. Confirm that lessons are public, then use Google or GitHub when you want private saved progress.

The host machine and Docker services must remain running for the site to be available. Because the route is public, configure OAuth credentials and a strong unique secret before publishing it. To return the app to local-only networking, start it again with `docker compose -f compose.yaml up --build -d`; the named data volume is retained.

CI builds the image from the checked-out `GITHUB_SHA` and verifies its `org.opencontainers.image.revision` label. The image ID or digest identifies the actual artifact; the label alone does not prove that a running service uses that image.

## Local development

**Requirements:** Node.js 24 and npm.

```sh
npm ci
npm run dev
```

The development app uses `.data/lms.sqlite` by default. To use a separate database:

```powershell
$env:DATABASE_PATH = ".data/lms-dev.sqlite"
npm run dev
```

```sh
DATABASE_PATH=.data/lms-dev.sqlite npm run dev
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | Strict TypeScript check |
| `npm test` | Vitest unit and database tests |
| `npm run build` | Production build and standalone preparation |
| `npm start` | Run the built standalone app locally |
| `npx playwright install chromium` | Install Playwright's browser |
| `npm run test:e2e` | Playwright tests against an isolated local development server and disposable SQLite database |

The E2E suite starts a separate Next.js development server. If port 3000 is already in use, choose another free test port:

```powershell
$env:PLAYWRIGHT_PORT = "3001"
npm run test:e2e
```

`npm start` loads the project-root `.env*` files using Next.js precedence, then starts the generated standalone server. An exported `DATABASE_PATH` takes precedence; relative paths are resolved from the project root, absolute paths stay absolute, and `:memory:` remains in-memory. The default is `.data/lms.sqlite` beside the project, outside `.next`.

Before rebuilding an older checkout, check whether `.next/standalone/.data/lms.sqlite` contains saved work. Snapshot it and compare it with the project-root `.data/lms.sqlite` before the build, because Next.js replaces generated output. Do not copy one database over the other automatically; use the approved restore or merge process after identifying which records are missing. `npm start` uses the project-root database after this change.

The same test suite is run by [GitHub Actions CI](.github/workflows/ci.yml), which also builds the Docker image.

## Configuration and data

| Setting | Default | Use |
| --- | --- | --- |
| `APP_PORT` | `3000` | Host port published by Compose; set in `.env` |
| `APP_BIND_ADDRESS` | `127.0.0.1` | Compose host bind address; keep loopback for this MVP |
| `DATABASE_PATH` | `.data/lms.sqlite` locally; `/data/lms.sqlite` in Compose | SQLite file for auth sessions and all learners' separate progress records |
| `FIELDNOTES_NEXT_DIST_DIR` | `.next` | Internal Next.js output directory; Playwright sets this to isolate its test build |
| `BETTER_AUTH_SECRET` | Required for local account operations | Unique secret used by local development |
| `BETTER_AUTH_URL` | `http://127.0.0.1:3000` locally | Local canonical origin used for callbacks and trusted requests |
| `FIELDNOTES_PROD_BETTER_AUTH_SECRET` | Required in Compose | Separate, stable production secret |
| `FIELDNOTES_PUBLIC_URL` | `https://learn.cybertracesystems.com` | Production HTTPS origin; Better Auth rejects mismatches and non-HTTPS values |
| `FIELDNOTES_OWNER_EMAIL` | Required in Compose | Verified Google/GitHub email that receives the owner role and existing legacy progress |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Empty until configured | Local development Google OAuth client only |
| `FIELDNOTES_PROD_GOOGLE_CLIENT_ID`, `FIELDNOTES_PROD_GOOGLE_CLIENT_SECRET` | Empty until configured | Production Google OAuth client only |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Empty until configured | Local development GitHub OAuth client only |
| `FIELDNOTES_PROD_GITHUB_CLIENT_ID`, `FIELDNOTES_PROD_GITHUB_CLIENT_SECRET` | Empty until configured | Production GitHub OAuth client only |

Compose stores authentication and learning records in the named `learning-data` volume. Local development and Compose use different databases by default. Progress reads and writes require a valid session and are scoped to that session's user ID on the server. The course content remains public. Saved notes are plain text in SQLite, and exported JSON is not encrypted; protect host access and backups accordingly.

## Project documentation

- [Architecture and project structure](docs/architecture.md) — routes, features, curriculum, persistence, and build layout.
- [Development and testing](docs/development.md) — content and schema changes, validation commands, Docker workflow, and guidance for coding agents.

## Not included

Fieldnotes does not provide cloud-hosted storage, organization/team accounts, automatic inactive-account deletion, password registration in production, AI tutoring, grading, deadline management, or lab provisioning. The owner must manage the host and its SQLite backups.

## Troubleshooting

- **Port conflict:** change `APP_PORT` in `.env` for Compose; use `PLAYWRIGHT_PORT` for browser tests.
- **Progress looks missing:** check whether the app is using its local database or the separate Docker volume.
- **Container is unhealthy:** inspect `docker compose ps` and `docker compose logs app`; SQLite liveness is checked at `/api/health`. `/api/ready` also reports whether authentication configuration is ready.
- **SQLite install fails:** use Node.js 24 and install the platform's native build tools if npm cannot use a compatible prebuilt module.

For more detail, see [Development and testing](docs/development.md).
