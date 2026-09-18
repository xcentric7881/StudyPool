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
2. applies the configured StudyPool database scope;
3. runs `prisma db push`;
4. runs the idempotent prototype seed;
5. starts Next.js.

Next.js binds to `0.0.0.0:${PORT:-3000}`.

Render currently supplies port 10000 at runtime. Do not hard-code it; use `PORT`.

## Database safety

Do not assume the deployment gives StudyPool exclusive ownership of the database or even of the containing PostgreSQL schema. Other applications may share either.

The deployment must therefore preserve an explicit ownership boundary:
- prefer a dedicated schema/namespace where possible;
- centralise scoping in configuration/database-access code;
- operate only on known StudyPool-owned objects;
- never modify unfamiliar tables merely because a schema tool detects them;
- inspect destructive schema changes before applying them;
- never use `prisma db push --accept-data-loss` or an equivalent force/destructive override.

### Current deployment

The present Render deployment uses:

```text
STUDYPOOL_DB_SCHEMA=studypool
```

That configured scope is enforced in:
- `prisma.config.ts`;
- `lib/db.ts`;
- `scripts/render-start.mjs`.

This is the current mechanism, not a reason for feature code to hard-code assumptions about database topology.

If a future deployment shares a schema, replace or extend the isolation mechanism appropriately while preserving the same rule: StudyPool may manage only its own objects.

### Schema-management warning signs

Stop and investigate if Prisma proposes:
- dropping tables not recognisably owned by StudyPool;
- destructive changes unrelated to the intended model change;
- changes to objects from another application;
- broad destructive operations needed only to make `db push` succeed.

Do not bypass such warnings with `--accept-data-loss`.

## Health check

`GET /api/health` performs a simple database query.

Expected response:

```json
{"ok":true}
```

A 503 here is an application/database deployment problem rather than merely a homepage/auth issue.

## Environment variables

Current deployment:

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

Use a local/test PostgreSQL environment you control. Keep the same ownership/encapsulation rules even in development.

## Deployment verification

After a deployment:
1. confirm the deployed commit is the intended `main` commit;
2. confirm the configured StudyPool database scope is the intended one;
3. confirm Prisma preparation affects only StudyPool-owned objects;
4. confirm prototype seed completes when enabled;
5. confirm Next.js listens on `0.0.0.0:$PORT`;
6. check `/api/health` returns `{"ok":true}`;
7. smoke-test login and a role-specific dashboard.

## Database changes

The prototype currently uses `prisma db push` at startup. This is convenient for early development but is not the preferred long-term production migration strategy.

Before real participant data is used, move to a controlled migration/backup process and review rollback, backups, data residency and university security/privacy requirements.

## Blueprint versus existing Render service

`render.yaml` documents intended service configuration. An existing Render service can retain dashboard settings that do not immediately change merely because YAML changes. When behaviour differs, inspect the actual service configuration and deployment logs as well as the blueprint.
