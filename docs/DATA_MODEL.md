# Data model

The canonical schema is `prisma/schema.prisma`. This document explains its intent and important invariants.

## Relationship overview

```text
RosterPerson 1 --- 0..1 User
                     |
                     +--- AuthSession
                     +--- Project (owner)
                     +--- Booking (student)
                     +--- AuditLog (actor)

AcademicYear 1 --- * Project
AcademicYear 1 --- * CohortTarget

Project 1 --- * ExperimentSession
ExperimentSession 1 --- * Booking
```

## RosterPerson

Current eligibility imported from CSV: email, name, role, optional cohort and active flag.

Eligibility is separate from `User` so a roster replacement can deactivate access without deleting historical participation.

## User

Application identity linked one-to-one to a `RosterPerson`.

Roles are `STUDENT`, `STAFF`, and `ADMIN`.

Current prototype users are synthetic demo accounts. Production account claiming/authentication can change without replacing the participation model.

## AuthSession

Browser login session. Only a hash of the random bearer token is stored. Sessions have an expiry and access also depends on the linked roster record remaining active.

## AcademicYear

Defines a reporting period with label, start/end, default target points and active flag.

Admin actions enforce one active academic year by deactivating all others before activating one.

## CohortTarget

Overrides the default academic-year points target for a named cohort.

Invariant: one row per `academicYearId + cohort`.

## Project

A research study with title, description, participation points, recruitment target, optional recruitment window, status, owner and academic year.

Statuses:
- `DRAFT`
- `OPEN`
- `CLOSED`
- `ARCHIVED`

Business rule: a project cannot be opened before at least one session exists.

## ExperimentSession

A scheduled bookable instance of a project with start, end, capacity and optional location.

Current rules:
- capacity >= 1;
- start/end are on the same local date when created through the application;
- end is after start.

Deleting a project cascades to sessions; deleting a session cascades to bookings. Treat deletion paths as destructive to historical data and do not introduce them casually.

## Booking

Durable relationship between a student and a session.

Statuses:
- `BOOKED`
- `WAITLISTED`
- `ATTENDED`
- `NO_SHOW`
- `CANCELLED`

The row retains booking time, cancellation time/reason, attendance time/marker and points awarded.

Database invariant: unique `sessionId + studentId`.

Application invariant: a student may not simultaneously hold another `BOOKED`, `WAITLISTED` or `ATTENDED` booking for another session in the same project.

Capacity currently counts `BOOKED` and `ATTENDED`. Cancellation is a state transition, not deletion.

## AuditLog

Append-only record for material application actions: optional actor, action, entity type/id, optional JSON metadata and timestamp.

## RosterUpload

Administrative history for roster replacements: filename, uploader, imported row count and timestamp.

## Database ownership boundary

StudyPool may run in a database or schema that also contains objects belonging to other applications. The model therefore owns only the tables and relationships defined for StudyPool; it does not imply ownership of the surrounding database or schema.

Prefer a dedicated PostgreSQL schema/namespace where possible. The current deployment uses `STUDYPOOL_DB_SCHEMA`, defaulting to `studypool`.

If a deployment shares a schema, schema-management operations must still be constrained to known StudyPool-owned objects. Unknown tables are not candidates for deletion or modification.

## Data-model change checklist

When changing `schema.prisma`:
1. classify the change as additive, transforming or destructive;
2. preserve booking/attendance/cancellation/audit history;
3. confirm the database operation is constrained to StudyPool-owned objects;
4. inspect any proposed destructive change before applying it;
5. never use `--accept-data-loss` or an equivalent destructive override;
6. update this document and affected product decisions;
7. run typecheck, tests and build.
