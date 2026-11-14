# Fieldnotes — DevOps Learning Workspace

A self-hosted personal learning workspace for structured study, hands-on practice, projects, and progress tracking. Fieldnotes brings the eight supplied DevOps roadmap PDFs into a course-like interface with lessons, practical activities, project briefs, a glossary, and a persistent local progress notebook. The current MVP is single-user and local-first.

This is a single-user local MVP. It has no login, cloud sync, public hosting, or Cloudflare configuration. Docker publishes the app only on `127.0.0.1` by default.

## Start the local app

Requirements: Docker Desktop with Compose support. Port `3000` must be free.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Open [http://localhost:3000](http://localhost:3000). The app uses one container and one named SQLite volume; it does not start PostgreSQL, Redis, or a proxy.

Useful commands:

```powershell
docker compose logs -f app
docker compose restart app
docker compose down
```

`docker compose down` removes the app container and network but keeps your learning data in the `learning-data` volume. Removing that volume permanently deletes saved progress. To inspect the data volume name, run `docker volume ls` and look for the `devops-learning-platform_learning-data` volume.

To change the local port, edit `APP_PORT` in `.env`, then run `docker compose up -d`. Compose still binds to loopback, for example `127.0.0.1:3001`.

## Development

Use Node.js 24 LTS and npm. The SQLite native module is built for the current platform during install.

```powershell
npm ci
$env:DATABASE_PATH = ".data\lms-dev.sqlite"
npm run dev
```

The development server opens at `http://localhost:3000`. The test suite uses a separate temporary SQLite file.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

GitHub Actions runs lint, type checking, unit tests, the production build, Playwright end-to-end tests, and a Docker image build for pull requests and pushes to `main`. CI uses the locked npm dependency tree and a temporary SQLite database; it does not publish images or deploy the app.

The end-to-end command rebuilds the app and starts the standalone production server on loopback with its own temporary SQLite database. It refuses to reuse an unrelated server already using port 3000. Browser binaries need to be installed once per machine.

If the Docker app is already using port 3000, run the browser suite on another free loopback port:

```powershell
$env:PLAYWRIGHT_PORT = "3001"
npm run test:e2e
```

## What is included

- Dashboard with saved module progress and phase summaries.
- A 24-module roadmap with concepts, explanations, practice instructions, common mistakes, mini-labs, readiness checks, and source references.
- The matching 24 A01–A24 activities, including their prerequisites, required evidence, self-checks, and independent-work prompts.
- Twelve evidence-first troubleshooting scenarios.
- Eight small project briefs and three major projects with acceptance details, milestones, and a self-review rubric.
- Career and responsible-AI guidance, official reference links, cloud-cost cautions, and the source glossary.
- All eight supplied PDFs, copied without modification to `public/library/`.
- Progress status, familiarity level, notes, sanitized evidence, optional repository URL, and project milestone checkboxes.
- Versioned JSON progress export and validated merge import, so saved records can be carried between local app instances.

The app preserves the roadmap's self-paced approach. The dated career priorities are presented as flexible guidance, not a deadline or current labor-market guarantee. The source says its glossary has 36 terms but lists 37; all listed terms are included.

## Architecture

- **Next.js App Router, React, and TypeScript:** Server Components render the reading pages; small Client Components handle navigation, filters, progress entry, and saved summaries.
- **Tailwind CSS v4, shadcn/ui, and Lucide:** Local shadcn components provide accessible interface primitives; the visual system uses compact teal navigation, charcoal and earth-tone module headers, warm neutral surfaces, and restrained academic accents.
- **SQLite, Drizzle ORM, and Zod:** Progress is stored locally with numbered SQL migrations, a composite key per learning item, bounded fields, and same-origin write checks.
- **Curriculum source:** Module, activity, troubleshooting, and project content is stored in Markdown with Zod-validated frontmatter. The server-side catalog derives lesson/task records and counts from those files; progress stays in SQLite. Markdown rendering uses `react-markdown`, GFM, and syntax highlighting with raw HTML disabled.
- **Feature boundaries:** Dashboard recommendations and progress summaries are derived in feature models; App Router pages compose server data with focused client components for interaction.
- **Docker Compose:** One multi-stage Node 24 LTS image runs as a non-root user. `/data/lms.sqlite` and its WAL files live in one named volume.
- **Tests:** Vitest covers curriculum parsing, dashboard recommendations, backup validation, progress rules, and SQLite migration/persistence. Playwright covers dashboard states and filters, backup merge/export, progress reload, PDF access, and responsive navigation.

## Progress data and migrations

The default development database is `.data/lms-dev.sqlite`; the Compose database is `/data/lms.sqlite`. The app applies ordered `migrations/*.sql` files the first time the database is opened and records applied filenames. Add a new numbered migration for future schema changes; do not edit a migration already used by a database.

The API only accepts same-origin writes and validates status, item IDs, URLs, and text lengths. Import validates the backup version, catalog IDs, record count, and duplicate keys before merging all records in one SQLite transaction. Matching item records are updated, unrelated records are retained, and imported records receive a fresh saved timestamp. Export produces a JSON file for the learner to store separately; it is not an automatic or encrypted backup. Saved notes are plain text. Keep secrets, private network details, personal information, and work data out of saved evidence.

Opening a lesson does not change its progress state. Completion is an explicit learner self-report; the app does not verify mastery. Activity progress is recorded on the activity as a whole, while project milestone checkboxes are tracked individually.

Module-card saved-record progress counts one saved module record plus each activity linked to that module. Only records explicitly marked complete count toward that card's fraction. This display is a summary of the learning log, not a required-work checklist or a mastery score; the overall journey percentage continues to count modules marked complete.

## Security and deployment boundaries

- Compose binds to `127.0.0.1`, runs as a non-root user, drops Linux capabilities, and enables `no-new-privileges`.
- There is no account system because the app is intended for a single local learner. Anyone with access to the same local machine and browser can read the local database.
- Do not expose the container to a LAN, public IP, tunnel, or Cloudflare hostname in this MVP. Remote access requires a separate security design that adds authentication, authorization, backups, and operational safeguards first.
- Resource links leave the local app for third-party official documentation.

## Content maintenance

The curriculum source of truth is `src/content/curriculum/**/*.md`. Frontmatter stores stable IDs and relationships; Markdown sections hold the learning material. The catalog validates metadata and required sections at application startup and derives counts from the parsed content. The eight unchanged PDFs in `public/library/` remain the full reference library. If a source edition changes, review the diff and deliberately update the matching Markdown; do not replace the original PDFs silently.

## Known limitations

- One local learner and one SQLite database; no multi-user sharing, authentication, or synchronization. JSON export/import is manual and unencrypted; save exported files somewhere private and separate from the application folder.
- Progress records are created only when a learner saves a note or checks a project milestone.
- Provider offers, cloud pricing, official pages, and job requirements can change after the source PDFs were written. Confirm current details before using them.
- The app does not provision cloud resources, execute lab commands, grade work, or track deadlines.
