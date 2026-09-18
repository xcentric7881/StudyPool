# Deployment

## Current hosted prototype

As of 18 September 2026:

- GitHub repository: `xcentric7881/StudyPool`
- branch: `main`
- Render web service: `studypool-prototype`
- public URL: `https://studypool-prototype.onrender.com`
- health endpoint: `/api/health`
- Render region: Frankfurt
- application timezone: `Europe/London`

The hosted deployment is a prototype and should use synthetic/test participant data.

## Build and start

The Render blueprint specifies:

```text
build: npm install && npx prisma generate && npm run build
start: npm run render:start
```

`npm run render:start` runs `scripts/render-start.mjs`, which:
1. reads `DATABASE_URL`;
2. forces the configured PostgreSQL schema;
3. runs `prisma db push`;
4. runs the idempotent prototype seed;
5. starts Next.js.

Next.js binds to `0.0.0.0:${PORT:-3000}`.

Render currently supplies port 10000 at runtime. Do not hard-code it; use `PORT`.

## Shared PostgreSQL database

The PostgreSQL instance is shared with other applications.

StudyPool's namespace is:

```text
STUDYPOOL_DB_SCHEMA=studypool
```

Schema isolation is enforced in:
- `prisma.config.ts`;
- `lib/db.ts`;
- `scripts/render-start.mjs`.

Do not remove that protection merely because `DATABASE_URL` already works.

### Never do this

Do not resolve Prisma warnings by running:

```bash
prisma db push --accept-data-loss
```

against the shared database. Warnings that unrelated tables need dropping are a strong sign Prisma is pointed at the wrong schema.

Healthy Prisma startup should explicitly report schema `studypool`.

## Health check

`GET /api/health` performs a simple database query.

Expected response:

```json
{"ok":true}
```

A 503 here is an application/database deployment problem rather than merely a homepage/auth issue.

## Environment variables

```text
DATABASE_URL=postgresql://...
STUDYPOOL_DB_SCHEMA=studypool
APP_TIMEZONE=Europe/London
PROTOTYPE_MODE=true
NODE_ENV=production
```

Do not commit the real `DATABASE_URL`.

## Local development

Use PostgreSQL, not SQLite.

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run prototype:seed
npm run dev
```

The local connection in `.env` must point to a PostgreSQL instance you control. Prisma still scopes itself to `STUDYPOOL_DB_SCHEMA`.

## Deployment verification

After a deployment:
1. confirm the deployed commit is the intended `main` commit;
2. inspect startup logs for `schema "studypool"`;
3. confirm Prisma preparation completes;
4. confirm prototype seed completes when enabled;
5. confirm Next.js listens on `0.0.0.0:$PORT`;
6. check `/api/health` returns `{"ok":true}`;
7. smoke-test login and a role-specific dashboard.

## Database changes

The prototype currently uses `prisma db push` at startup. This is convenient for early development but is not the preferred long-term production migration strategy.

Before real participant data is used, move to a controlled migration/backup process and review rollback, backups, data residency and university security/privacy requirements.

## Blueprint versus existing Render service

`render.yaml` documents intended service configuration. An existing Render service can retain dashboard settings that do not immediately change merely because YAML changes. When behaviour differs, inspect the actual service configuration and deployment logs as well as the blueprint.
