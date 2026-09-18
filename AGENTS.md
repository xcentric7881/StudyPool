# StudyPool agent guide

This file is the durable implementation context for coding agents working on StudyPool. Read it before making non-trivial changes.

## What StudyPool is

StudyPool is an experiment-participation system for a university research group. Staff create studies and bookable sessions; students browse and book them; administrators manage eligibility, academic-year targets and oversight.

The current repository is a working prototype, not yet the final production authentication/mail implementation.

## Read these before changing behaviour

1. `docs/PRODUCT_DECISIONS.md` — agreed product behaviour and prototype exceptions.
2. `docs/ARCHITECTURE.md` — application structure and technical boundaries.
3. `docs/DATA_MODEL.md` — database entities and invariants.
4. `docs/DEPLOYMENT.md` — Render/PostgreSQL deployment rules.
5. `docs/CSV_FORMAT.md` — roster import format.

Code is the authority for what is implemented today. The decision documents are the authority for intended behaviour. If they conflict, do not silently guess: preserve current data and behaviour and make the discrepancy explicit in the change.

## Current stack

- Next.js 15 App Router
- TypeScript
- React 19
- Prisma
- PostgreSQL
- Next.js server actions for mutations
- Render for the current hosted prototype
- Europe/London application timezone

## Hard constraints

### Shared PostgreSQL database

The PostgreSQL database is shared with other applications. StudyPool must use its own PostgreSQL schema, currently `studypool`.

- Never point Prisma at the shared `public` schema by accident.
- Never use `prisma db push --accept-data-loss` against the shared database.
- Never drop, rename or migrate tables belonging to another schema/application.
- `prisma.config.ts`, `lib/db.ts`, and `scripts/render-start.mjs` deliberately force `STUDYPOOL_DB_SCHEMA` (default `studypool`).
- Treat changes to any of those three files as deployment-sensitive.

### Preserve participant history

Do not delete participation history simply because a user is removed from a current roster or cancels a booking.

- Roster replacement may deactivate people but must retain users/history.
- Cancellation must retain the booking record and cancellation reason.
- Attendance/no-show history and awarded points are durable records.
- Material administrative and participation actions should remain auditable.

### Server-side authorization

UI hiding is not authorization. Mutating actions must enforce roles and ownership on the server.

Current roles are:
- `STUDENT`
- `STAFF`
- `ADMIN`

Staff normally manage only their own studies. Admins can operate across studies.

### Prototype data

The currently deployed prototype is intended for synthetic/test data. Do not add real participant data, real credentials or secrets to the repository.

## Core behavioural rules

- Studies start as drafts and require at least one session before they can be opened.
- A session has a start, end, capacity and optional location.
- Session end must be after start and on the same date.
- Students may hold only one active/waitlisted/attended booking within the same study.
- If capacity is available, a booking is confirmed; otherwise it is waitlisted.
- A student cancellation requires a reason.
- Cancelling a confirmed place should attempt to promote the earliest waitlisted participant.
- Only attendance awards the study's participation points.
- Academic years have a default points target with optional cohort overrides.

See `docs/PRODUCT_DECISIONS.md` for the complete product-level rules.

## Development workflow

Before committing a substantive change, normally run:

```bash
npm run typecheck
npm test
npm run build
```

For database-affecting work, also inspect the generated Prisma operations and confirm they are scoped to the StudyPool schema.

Prefer small, comprehensible changes. Do not rewrite working areas merely to modernise style.

## Deployment

The production-like prototype is deployed from GitHub `main` to Render as `studypool-prototype`.

A healthy deployment must:
1. prepare Prisma against schema `studypool`;
2. run the prototype seed idempotently when `PROTOTYPE_MODE=true`;
3. start Next.js on `0.0.0.0:$PORT`;
4. return HTTP 200 from `/api/health`.

See `docs/DEPLOYMENT.md`.

## When product decisions change

Update the relevant documentation in the same change. In particular, keep `PRODUCT_DECISIONS.md`, `DATA_MODEL.md`, and `DEPLOYMENT.md` consistent with implementation changes.
