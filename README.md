# Fieldnotes

Fieldnotes is a self-hosted, local-first learning workspace for one learner's DevOps journey. It turns the supplied learning materials into a navigable curriculum with practical work and a persistent progress notebook.

> **Current scope:** a single-learner MVP. There is no app-level sign-in, cloud sync, or multi-user support. Docker Compose binds to loopback by default. An optional Cloudflare Tunnel route can provide remote access only when Cloudflare Access is configured to allow your identity.

## What it does today

- Organizes **24 learning modules** into a roadmap, with concepts, explanations, practice, checks, and references.
- Provides **24 guided activities**, troubleshooting scenarios, and small and major project briefs.
- Stores saved notes, self-reported progress, and project milestones in SQLite.
- Offers a searchable Resource Library with the eight supplied PDFs, official references, and glossary terms.
- Supports validated JSON progress export and merge import. Backups are manual and unencrypted.

Opening a lesson does not mark it complete. Completion is a learner's self-report, not a verified skills assessment. See [Architecture](docs/architecture.md) for data boundaries and current limitations.

## Technology

Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui primitives, SQLite, Drizzle ORM, Zod, Vitest, Playwright, and Docker Compose. Curriculum content is maintained as Markdown under `src/content/curriculum/`.

## Run with Docker

**Requirements:** Docker Desktop with Compose support, or Docker Engine with the Compose plugin. Port 3000 must be available.

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

### Optional: use the existing CyberTrace Cloudflare Tunnel

Fieldnotes has no built-in login. Protect the hostname with Cloudflare Access and allow only your own email before publishing a Tunnel route. Every authorized visit uses the same single-learner SQLite database and progress records; this does not create separate accounts.

1. In Cloudflare Zero Trust, create a **Self-hosted** Access application for `learn.cybertracesystems.com`. Add an Allow policy for your email (for example, email one-time PIN) and confirm the policy before continuing. Cloudflare recommends creating the Access application before publishing the Tunnel route.
2. Find the Docker network used by the existing `cloudflared` container with `docker network ls`. Add its exact name as `FIELDNOTES_TUNNEL_NETWORK` in your local `.env`. If `.env` already exists, add this line without replacing the file.
3. Start Fieldnotes with the optional overlay:

   ```powershell
   docker compose -f compose.yaml -f compose.cloudflare.yaml up --build -d
   ```

   This keeps the existing loopback address and the `learning-data` volume. The overlay connects the app to the existing Tunnel network and gives it the internal name `fieldnotes-lms`.
4. In Cloudflare Zero Trust, open **Networks → Tunnels**, select the existing CyberTrace tunnel, and add a **Published application** route for `learn.cybertracesystems.com` with service `http://fieldnotes-lms:3000`. In Additional application settings, enable **Protect with Access** and use the team name and audience tag from the Fieldnotes Access app. Cloudflare creates the DNS route for the hostname.
5. Open `https://learn.cybertracesystems.com` in a private browser window. Confirm that Cloudflare Access prompts for authentication, that an unauthorized identity is denied, and that your allowed identity reaches the LMS.

The host machine and Docker services must remain running for the site to be available. Do not publish the route without the Access application and a restrictive Allow policy. To return the app to local-only networking, start it again with `docker compose up --build -d`; the named data volume is retained.

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
| `npm run test:e2e` | Production build followed by Playwright tests |

The E2E command builds into the shared `.next` directory, so stop `npm run dev` before running it. If port 3000 is already in use, choose another free test port:

```powershell
$env:PLAYWRIGHT_PORT = "3001"
npm run test:e2e
```

The same test suite is run by [GitHub Actions CI](.github/workflows/ci.yml), which also builds the Docker image.

## Configuration and data

| Setting | Default | Use |
| --- | --- | --- |
| `APP_PORT` | `3000` | Host port published by Compose; set in `.env` |
| `APP_BIND_ADDRESS` | `127.0.0.1` | Compose host bind address; keep loopback for this MVP |
| `DATABASE_PATH` | `.data/lms.sqlite` locally; `/data/lms.sqlite` in Compose | SQLite file used by the app |

Compose stores the database in its named `learning-data` volume. Local development and Compose use different databases by default. The progress API validates writes and imports, but the app has no user authentication; the loopback bind is the default security boundary. If the optional Tunnel route is configured, Cloudflare Access is the external authentication boundary. Saved notes are plain text, and exported JSON is not encrypted.

## Project documentation

- [Architecture and project structure](docs/architecture.md) — routes, features, curriculum, persistence, and build layout.
- [Development and testing](docs/development.md) — content and schema changes, validation commands, Docker workflow, and guidance for coding agents.

## Future ideas—not implemented or committed

Authentication, multiple learners, remote synchronization, AI-assisted tutoring, hosted deployment, and executable/provisioned labs are not part of the current application. They require separate product and security decisions before implementation.

## Troubleshooting

- **Port conflict:** change `APP_PORT` in `.env` for Compose; use `PLAYWRIGHT_PORT` for browser tests.
- **Progress looks missing:** check whether the app is using its local database or the separate Docker volume.
- **Container is unhealthy:** inspect `docker compose ps` and `docker compose logs app`; health is checked at `/api/health`.
- **SQLite install fails:** use Node.js 24 and install the platform's native build tools if npm cannot use a compatible prebuilt module.

For more detail, see [Development and testing](docs/development.md).
