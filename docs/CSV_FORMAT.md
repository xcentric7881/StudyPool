# Roster CSV format

The roster is the authoritative list of people permitted to use the production service.

## Columns

Required: `name`, `email`, and either `role` or `status` for normal rows. Optional columns are `admin` and `cohort`.

`role`/`status` may be `student`, `staff`, or `admin`. Values such as `yes`, `true` or `1` in `admin` make the row an administrator regardless of staff/student status. Column names are case-insensitive.

```csv
name,email,status,admin,cohort
Alex Admin,alex.admin@example.ac.uk,staff,yes,staff
Sam Researcher,sam.researcher@example.ac.uk,staff,no,staff
Jamie Student,jamie.student@example.ac.uk,student,no,2026
```

## Replacement semantics

Every upload is treated as the new active roster. Rows in the upload are inserted or updated and marked active; omitted entries are marked inactive. User records, bookings, attendance and points are not deleted. Existing linked user name/role values are updated from the roster. The administrator performing a web upload must still appear in the file with the `admin` role.

## Prototype bootstrap

The Render prototype seeds four synthetic identities automatically. Run `npm run prototype:seed` for local testing. An administrator can upload a CSV from **Admin → Approved roster** after signing in as the seeded prototype administrator. Uploaded non-demo identities cannot sign in to this temporary prototype; this lets roster/reporting behaviour be tested without collecting real credentials.
