# Architecture

## Overview

StudyPool is a server-rendered Next.js application backed by PostgreSQL through Prisma.

```text
Browser
  |
  v
Next.js App Router pages
  |
  +--> Server actions in lib/actions/
  |      |
  |      +--> role/ownership checks
  |      +--> business rules
  |      +--> audit writes
  |
  +--> read queries through Prisma
         |
         v
PostgreSQL
  |
  +--> configured StudyPool data scope
```

## Repository structure

- `app/` — routes, dashboards and page UI.
- `app/admin/` — administrative views.
- `app/dashboard/` — role-oriented dashboard.
- `app/projects/` — study and session views.
- `app/login/` — current prototype sign-in.
- `app/api/health/` — database-backed health check.
- `components/` — shared UI components.
- `lib/actions/` — server-side mutations and business rules.
- `lib/auth.ts` — session handling and role guards.
- `lib/db.ts` — Prisma client and database scoping.
- `lib/roster.ts` — roster CSV parsing/replacement.
- `lib/waitlist.ts` — automatic waitlist promotion.
- `lib/points.ts` — cohort/default target logic.
- `prisma/schema.prisma` — application data model.
- `prisma.config.ts` — Prisma CLI configuration and database scoping.
- `scripts/` — roster/seed/deployment scripts.
- `tests/` — automated tests.

## Authentication and authorization

### Current prototype

The prototype uses synthetic demo identities only. `demoLoginAction` permits a small fixed set of `@studypool.test` accounts when `PROTOTYPE_MODE=true`.

A random session token is stored in an HTTP-only cookie. Only a hash is stored in `AuthSession`. Sessions expire after seven days. A deactivated roster record invalidates access even when a browser still has a session cookie.

Authorization is enforced by server actions with `requireRole` plus ownership checks.

### Intended production direction

Access remains roster-controlled rather than open registration. The latest intended direction is that a person claims an email already present in the roster, verifies ownership through an emailed link, then uses an account login thereafter. The production mail/auth provider is not implemented in this prototype and should not be invented as part of unrelated work.

A separate staff-approval state is not represented in the current Prisma model. If implemented, it should be modelled explicitly rather than inferred from UI state.

## Business logic

Most mutation logic lives in `lib/actions/`.

### Study lifecycle

A staff/admin user creates a `Project` in `DRAFT`. It may be opened only after at least one `ExperimentSession` exists. Other lifecycle values are `OPEN`, `CLOSED`, and `ARCHIVED`.

### Booking

Booking runs in a serializable transaction and retries expected serialization conflicts.

For an open, future session:
- capacity available -> `BOOKED`;
- full -> `WAITLISTED`.

The application prevents a student from holding another active/waitlisted/attended booking for the same study.

### Cancellation and waitlist

Cancelling keeps the booking row, records `CANCELLED`, timestamp and reason, resets awarded points, and attempts to promote the earliest waitlisted booking if a confirmed place was released.

### Attendance and points

Staff owners or admins can record attendance/no-show state. `ATTENDED` awards the study's configured points. Reverting to `BOOKED` or marking `NO_SHOW` awards zero.

## Database encapsulation

StudyPool must not assume exclusive ownership of its database environment. The physical database and, in some deployments, the schema may contain data belonging to other applications.

The architectural rule is therefore:
- database ownership boundaries are explicit;
- application code uses the central database access/configuration layer;
- schema/table scoping is configured rather than assumed;
- schema-management operations may touch only StudyPool-owned objects;
- destructive override flags are not used.

A dedicated PostgreSQL schema is preferred where available. The current deployment uses `STUDYPOOL_DB_SCHEMA`, defaulting to `studypool`.

Three locations currently enforce the configured scope:
- `prisma.config.ts` for Prisma CLI commands;
- `lib/db.ts` for runtime Prisma Client;
- `scripts/render-start.mjs` for Render startup.

If deployment topology changes, preserve the encapsulation boundary even if the specific schema mechanism changes.

## Time handling

The application timezone defaults to `Europe/London`. Session form times are interpreted in the application timezone and stored as database timestamps.

Test daylight-saving transitions when changing time-handling code.

## Auditability

`AuditLog` is intended as an append-only record of material actions. New workflows that change participant eligibility, bookings, attendance, points, study state or administrative configuration should normally add an audit entry.

## Prototype versus production

Implemented now:
- PostgreSQL persistence;
- roster import and deactivation;
- study/session management;
- booking/waitlist/cancellation;
- attendance and points;
- academic-year/cohort targets;
- synthetic demo login;
- Render deployment.

Still prototype-level:
- real email ownership verification;
- real password/account recovery;
- transactional reminders;
- production privacy/security hardening;
- final UK-hosting decision;
- any separate staff-approval state.
