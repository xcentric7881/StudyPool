# StudyPool

StudyPool is an experiment-participation system for a university research group. Staff create studies and sessions, students book or waitlist for places, attendance awards participation points, and administrators manage roster eligibility and academic-year targets.

The current repository is a working **prototype/test deployment**. Use synthetic/test participant data only.

## Current prototype

Implemented:
- CSV-controlled roster with student, staff and admin roles;
- PostgreSQL persistence through Prisma;
- study creation and lifecycle;
- multiple bookable sessions with capacity;
- booking, cancellation reasons and waiting lists;
- automatic waitlist promotion in the mail-free prototype;
- attendance/no-show marking and participation points;
- academic-year and cohort target configuration;
- audit records for material actions;
- synthetic demo sign-in;
- Render deployment with a database-backed health check.

The prototype deliberately does **not** yet provide production email claiming/password recovery/reminders.

## Important: shared database

The PostgreSQL database may be shared with other applications. StudyPool must use its dedicated PostgreSQL schema:

```text
STUDYPOOL_DB_SCHEMA=studypool
```

Do not run Prisma against another application's schema and never use `prisma db push --accept-data-loss` as a shortcut on the shared database.

See [Deployment](docs/DEPLOYMENT.md).

## Documentation for developers and coding agents

Start with:
- [AGENTS.md](AGENTS.md) — durable implementation constraints and working rules;
- [Product decisions](docs/PRODUCT_DECISIONS.md) — intended behaviour and prototype exceptions;
- [Architecture](docs/ARCHITECTURE.md) — application structure;
- [Data model](docs/DATA_MODEL.md) — entities and invariants;
- [Deployment](docs/DEPLOYMENT.md) — Render/PostgreSQL deployment;
- [Roster CSV format](docs/CSV_FORMAT.md).

## Synthetic demo accounts

When `PROTOTYPE_MODE=true`, sign-in currently permits:

| Email | Role |
| --- | --- |
| `admin@studypool.test` | admin |
| `staff@studypool.test` | staff |
| `student1@studypool.test` | student |
| `student2@studypool.test` | student |

No password is required for these prototype-only identities.

The seed script also creates additional synthetic roster data and example studies for testing.

## Local development

StudyPool uses PostgreSQL; the older SQLite prototype instructions are obsolete.

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run prototype:seed
npm run dev
```

Open `http://localhost:3000`.

Use a local/test PostgreSQL instance in `.env`. Do not commit real database credentials.

## Useful commands

```bash
npm run typecheck
npm test
npm run build
npm run prototype:seed
npm run roster:import
```

## Roster CSV

Admins can replace/update the roster through **Admin -> Approved roster**.

Example:

```csv
name,email,role,cohort
Ada Admin,ada@example.test,admin,
Rory Researcher,rory@example.test,staff,
Sam Student,sam@example.test,student,2026
```

A roster replacement may deactivate omitted people, but their user and participation history is retained.

## Current hosted prototype

The Render service is `studypool-prototype`, deployed from `main`.

Health check:

```text
https://studypool-prototype.onrender.com/api/health
```

Expected response:

```json
{"ok":true}
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment details and database-safety rules.
