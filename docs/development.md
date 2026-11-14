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

The app listens on `127.0.0.1:3000` and creates `.data/lms.sqlite` unless `DATABASE_PATH` is set. For a separate development database:

```powershell
$env:DATABASE_PATH = ".data/lms-dev.sqlite"
npm run dev
```

```sh
DATABASE_PATH=.data/lms-dev.sqlite npm run dev
```

Next.js loads `.env*` files for app configuration. Compose reads `.env` for host-side settings such as `APP_PORT`; `.env.example` documents the default host port. Do not commit real environment files or credentials.

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
| `npm run test:e2e` | Rebuild and run the Playwright end-to-end suite |

`npm run test:e2e` runs a production build first and uses the same `.next` directory. Stop `npm run dev` before running it. If Docker or another local service occupies port 3000, choose another free port:

```powershell
$env:PLAYWRIGHT_PORT = "3001"
npm run test:e2e
```

```sh
PLAYWRIGHT_PORT=3001 npm run test:e2e
```

CI runs lint, type checking, unit tests, the production build, Playwright, and a Docker image build. Run the checks relevant to a change locally; for a user-visible or data-flow change, include the browser suite. Do not report a check as passing unless it was run and its result observed.

## Docker Compose

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f app
```

The app is exposed on `127.0.0.1:${APP_PORT:-3000}` and stores data in the named `learning-data` volume. `docker compose down` removes the container and network but retains that volume. Do not use `docker compose down -v` unless permanent deletion of learning records is intended. The MVP is not designed for LAN or public exposure; changing the bind address requires a separate authentication, access-control, backup, and deployment design.

## Changing curriculum and application behavior

### Curriculum content

- Edit the appropriate Markdown file under `src/content/curriculum/`; keep stable IDs and relationships intact.
- Before changing frontmatter fields or required section names, inspect `src/content/catalog.ts` and `src/content/content.test.ts`. Update the parser and meaningful tests together when the content schema changes.
- Keep module explanations, activity steps, verification, reflection, and references consistent. Do not add unsupported claims or imply that opening or checking an item verifies mastery.

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
6. Do not expose the unauthenticated MVP to a LAN, tunnel, or public host; do not change production data or deploy without explicit authorization. Preserve the local SQLite volume during routine development.

## Troubleshooting

- **Port 3000 is busy:** set `APP_PORT` in `.env` for Compose, or use `PLAYWRIGHT_PORT` for E2E tests. Stop a conflicting dev server before the E2E build.
- **SQLite native module fails to install:** use Node.js 24 and a supported platform; install the platform's native compiler toolchain if npm cannot use a prebuilt binary, then rerun `npm ci`.
- **Progress appears missing:** local development and Compose use separate database paths. Check `DATABASE_PATH` for local runs and preserve the `learning-data` Docker volume.
- **Container is not healthy:** inspect `docker compose logs app` and `docker compose ps`; the health endpoint is `/api/health`.
