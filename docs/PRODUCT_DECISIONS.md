# Product decisions

This document records durable product behaviour agreed for StudyPool. It distinguishes product requirements from temporary prototype shortcuts.

## Purpose

StudyPool supports university research participation:
- faculty/staff publish studies;
- students find studies and book a session;
- researchers manage participants and attendance;
- administrators manage eligibility, targets and oversight.

## Roles

### Student

A student can browse open studies, choose a session, join a waiting list when full, cancel an eligible booking, and see participation history and points/progress.

### Staff / researcher

A staff user can create studies, define sessions, open/close studies, see participants for studies they own, record attendance/no-show, and export participant information where the UI provides it.

Staff should normally be restricted to their own studies.

### Admin

An admin can oversee all studies and participants and manage roster eligibility, academic years, default points targets and cohort-specific targets.

The longer-term requirement includes administrative control over staff access/approval. The current prototype does not yet model a separate staff-approval state.

## Eligibility and accounts

Access is roster-controlled. There is no open public signup.

The roster contains at least name, email, role, optional cohort and active/inactive state.

Replacing a roster may deactivate omitted people but must not delete their historical records.

### Prototype exception

The current hosted prototype uses fixed synthetic demo identities and does not send email or collect real passwords.

### Intended production direction

The latest intended direction is:
1. a person claims an email already present in the approved roster;
2. an email link verifies ownership and allows account setup;
3. the user subsequently signs in to the account.

Mail provider, password recovery and production identity details remain implementation work rather than settled infrastructure choices.

## Studies

A study has title, description, owner, participation points, recruitment target, optional recruitment start/end dates, academic year and lifecycle status.

Default points for a new study are currently 10 unless changed.

A study may not be opened until it has at least one bookable session.

## Sessions

A study may have multiple sessions. Each has start/end date-time, capacity and optional location.

Current rule: start and end are on the same date and end must be later than start.

UI convention: when creating a session, the end time should default to one hour after the chosen start time where the interface supports that convenience. Validation remains authoritative.

## Booking

A student should have at most one current participation choice within a study.

A future session on an open/recruiting study:
- books immediately if capacity is available;
- otherwise creates a waiting-list place.

Capacity decisions must be concurrency-safe.

## Cancellation

Students may cancel a confirmed or waitlisted booking.

Cancellation:
- requires a reason;
- preserves the booking record;
- records cancellation time/reason;
- removes any points award;
- if a confirmed place was freed, attempts to promote the earliest waitlisted person.

## Waiting list

Waiting lists are FIFO by booking time in the current prototype.

Promotion is automatic in the prototype because there is no transactional mail service. A future production implementation may add notification/acceptance behaviour without discarding the existing place/history.

## Attendance and points

A booking can end as `ATTENDED`, `NO_SHOW`, or `CANCELLED`.

Only `ATTENDED` awards the study's points. Staff may correct attendance status; points must track corrected status rather than accumulating duplicate awards.

## Participation targets

Participation is tracked in points.

Each academic year has one default target plus optional cohort-specific overrides. A student's cohort override takes precedence over the default.

## Audit and historical integrity

Material changes should be auditable, including roster replacement, study/session changes, booking/cancellation, attendance/points, and academic-year/target changes.

Operational convenience must not erase historical participation records.

## UI principles

- Student views prioritise studies, bookings and progress.
- Staff views prioritise owned studies, sessions and participant state.
- Admin views prioritise oversight and configuration.
- Avoid exposing internal implementation terminology.
- Prefer sensible defaults over unnecessary form entry.
- Validation errors should explain how to correct the problem.

## Not yet fixed as production choices

Do not treat these as settled merely because the prototype uses one implementation:
- final mail provider;
- final production hosting provider/location;
- exact account-recovery mechanism;
- exact staff-approval data model;
- reminder-email schedule;
- whether production waitlist promotion requires explicit acceptance.

When one becomes a product decision, update this file.
