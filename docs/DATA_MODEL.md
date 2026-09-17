# Data model

## RosterPerson
The current eligibility record imported from CSV. It stores name, email, role, optional cohort, and active/inactive state. Eligibility remains separate from the user record so a roster replacement can deactivate access without deleting history.

## User
An application identity linked one-to-one to `RosterPerson`. In this Render prototype, four synthetic users are seeded and selected from the sign-in screen; no real credentials are collected. The production build can restore roster-verified account claiming without changing the participation model.

## AuthSession
A short-lived authenticated browser session. Only a hash of the random bearer token is persisted.

## AcademicYear / CohortTarget
Defines the reporting period and default participation-points target, with optional cohort-specific overrides.

## Project
A research study with owner, description, points, recruitment target, optional recruitment window, status, and academic year.

## ExperimentSession
A scheduled bookable instance of a project, with start/end times, capacity, and optional location.

## Booking
The durable student/session relationship. Status is `BOOKED`, `WAITLISTED`, `ATTENDED`, `NO_SHOW`, or `CANCELLED`. It retains cancellation reason, attendance metadata, and points awarded. In the prototype, a cancelled booked place automatically promotes the earliest waiting-list participant.

## AuditLog
Append-only records for material application actions.

## RosterUpload
Administrative history of roster imports: filename, uploader, row count, and timestamp.
