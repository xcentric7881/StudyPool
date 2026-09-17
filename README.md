# StudyPool — Render prototype

StudyPool is a prototype experiment-participation system for matching students to studies, managing bookings and waiting lists, recording attendance, and tracking participation points.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/xcentric7881/StudyPool)

This repository is deliberately the **prototype/test deployment**. It is configured as a single free Render Node web service using a local SQLite database. **Use synthetic data only.** The SQLite file lives on Render's ephemeral filesystem, so prototype data can be lost when the service is redeployed or replaced.

## What is in the prototype

- CSV-controlled roster with `student`, `staff`, and `admin` roles.
- Four fixed synthetic demo identities provide one-click role switching for safe prototype testing.
- Staff-owned studies with description, recruitment target, points (default 10), dates, and multiple sessions.
- Session capacity, student booking, cancellation with retained reason, and waiting lists.
- In this mail-free prototype, a cancelled confirmed place automatically promotes the first waiting-list participant.
- Staff attendance/no-show marking; points are awarded only for attendance and can be corrected.
- Academic years, cohort/global point targets, admin progress reports, and CSV export.
- Audit records for important actions.

## Deliberate prototype simplifications

There is no email or real-user authentication service in this branch. To keep the temporary Render deployment safe and dependency-free:

- no real credentials are collected; the login screen offers four fixed synthetic demo roles;
- email ownership verification and password reset are omitted;
- 3-day/day-of reminder emails are omitted;
- waiting-list promotion is automatic rather than emailed/accepted;
- PostgreSQL is replaced by SQLite for the temporary Render build.

The production design retains roster-based email claiming, password login, transactional reminders and PostgreSQL. These prototype changes do not alter the core Project / Session / Booking / points model.

## Seeded test roster

The Render start command idempotently seeds these **synthetic** identities:

| Email | Role |
| --- | --- |
| `admin@studypool.test` | admin |
| `staff@studypool.test` | staff |
| `student1@studypool.test` | student |
| `student2@studypool.test` | student |

Open the site and choose one of these roles on the prototype sign-in screen. No password is required. The prototype also seeds academic year `2026/27` with a 100-point target.

## Deploy to Render

The root `render.yaml` creates one free Node web service in Frankfurt. It sets `DATABASE_URL=file:./studypool.db`, synchronises the schema with `prisma db push`, seeds the synthetic roster on start, and exposes `/api/health` for checking the deployment.

No application secrets are required for this prototype. Render's free web service can sleep after inactivity and take roughly a minute to wake. The local SQLite database is intentionally disposable and is **not** suitable for real participant data or operational deployment.

## Local development

Copy `.env.example` to `.env`, then:

```bash
npm install
npx prisma db push
npm run prototype:seed
npm run dev
```

Open `http://localhost:3000`.

## Roster CSV

Admins can replace/update the roster through **Admin → Approved roster**. Example format:

```csv
name,email,role,cohort
Ada Admin,ada@example.test,admin,
Rory Researcher,rory@example.test,staff,
Sam Student,sam@example.test,student,2026
```

A replacement roster makes omitted people inactive but retains their user/history. The importing admin must remain present as an admin. In this prototype, uploaded real roster entries are for testing administration/reporting only; only the four seeded synthetic identities can sign in.

## Production migration

The production target remains portable: Next.js + PostgreSQL. For deployment on the Mac Studio or UK-hosted infrastructure, restore verified email claiming, password authentication and reminders using a transactional email provider; keep PostgreSQL private; add backups; and complete the university data-protection/security review. Render's Frankfurt prototype should not be treated as the UK-resident production service.
