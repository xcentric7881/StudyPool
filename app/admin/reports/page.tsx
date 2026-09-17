import Link from "next/link";
import { BookingStatus, UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { targetForStudent } from "@/lib/points";
import { formatDateTime } from "@/lib/time";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(UserRole.ADMIN);
  const years = await db.academicYear.findMany({ orderBy: { startsOn: "desc" } });
  const p = await searchParams;
  const requested = typeof p.year === "string" ? p.year : null;
  const year = (requested && years.find((y) => y.id === requested)) || years.find((y) => y.active) || years[0];

  const students = await db.rosterPerson.findMany({
    where: { role: UserRole.STUDENT, active: true },
    include: { user: true },
    orderBy: { name: "asc" }
  });

  const targets = year ? await db.cohortTarget.findMany({ where: { academicYearId: year.id } }) : [];
  const bookings = year ? await db.booking.findMany({
    where: {
      status: { in: [BookingStatus.BOOKED, BookingStatus.WAITLISTED, BookingStatus.ATTENDED] },
      session: { project: { academicYearId: year.id } }
    },
    include: { session: { include: { project: true } } },
    orderBy: { session: { startsAt: "asc" } }
  }) : [];

  const bookingMap = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const existing = bookingMap.get(booking.studentId) || [];
    existing.push(booking);
    bookingMap.set(booking.studentId, existing);
  }

  const rows = students.map((student) => {
    const target = year ? targetForStudent(year.defaultTargetPoints, student.cohort, targets) : 0;
    const studentBookings = student.user ? (bookingMap.get(student.user.id) || []) : [];
    const completed = studentBookings.filter((b) => b.status === BookingStatus.ATTENDED);
    const booked = studentBookings.filter((b) => b.status === BookingStatus.BOOKED);
    const waitlisted = studentBookings.filter((b) => b.status === BookingStatus.WAITLISTED);
    const earned = completed.reduce((sum, b) => sum + b.pointsAwarded, 0);
    const bookedPoints = booked.reduce((sum, b) => sum + b.session.project.points, 0);
    return {
      student,
      target,
      earned,
      bookedPoints,
      completed,
      booked,
      waitlisted,
      reached: target > 0 ? earned >= target : false
    };
  });

  return <AppShell user={user}>
    <div className="hero">
      <div className="kicker">Administration</div>
      <h1>Student progress</h1>
      <p className="muted">Completed points are earned from attended sessions. Booked points are prospective and do not count towards progress until attendance is recorded.</p>
    </div>

    <div className="actions" style={{ marginBottom: "1rem" }}>
      <Link className="button secondary" href="/admin/roster">Roster</Link>
      <Link className="button secondary" href="/admin/years">Academic years & targets</Link>
      {year && <a className="button" href={`/api/admin/report.csv?year=${year.id}`}>Download CSV</a>}
    </div>

    <section className="card" style={{ marginBottom: "1rem" }}>
      <form method="get" className="inline">
        <label style={{ minWidth: 260 }}>Academic year
          <select name="year" defaultValue={year?.id || ""}>
            {years.map((y) => <option value={y.id} key={y.id}>{y.label}{y.active ? " (active)" : ""}</option>)}
          </select>
        </label>
        <button type="submit">View</button>
      </form>
    </section>

    {!year ? <section className="card empty">Create an academic year before running reports.</section> : <>
      <div className="grid cols-3" style={{ marginBottom: "1rem" }}>
        <section className="card"><div className="kicker">Students</div><div className="stat">{rows.length}</div></section>
        <section className="card"><div className="kicker">Reached target</div><div className="stat">{rows.filter((r) => r.reached).length}</div></section>
        <section className="card"><div className="kicker">Not yet reached</div><div className="stat">{rows.filter((r) => !r.reached).length}</div></section>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Cohort</th>
                <th>Completed points</th>
                <th>Booked points</th>
                <th>Target</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, earned, bookedPoints, target, reached, booked, completed, waitlisted }) => <tr key={student.id}>
                <td style={{ minWidth: 300 }}>
                  <strong>{student.name}</strong>
                  <div className="muted">{student.email}{student.user ? "" : " · roster only"}</div>
                  {student.user && <details style={{ marginTop: "0.55rem" }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>View sessions</summary>
                    <div className="stack" style={{ marginTop: "0.65rem" }}>
                      <div>
                        <strong>Upcoming booked sessions</strong>
                        {booked.length === 0 ? <div className="muted">None</div> : booked.map((b) => <div key={b.id} className="session" style={{ marginTop: "0.4rem" }}>
                          <div><strong>{b.session.project.title}</strong></div>
                          <div className="muted">{formatDateTime(b.session.startsAt)}{b.session.location ? ` · ${b.session.location}` : ""} · {b.session.project.points} points</div>
                        </div>)}
                      </div>
                      <div>
                        <strong>Completed sessions</strong>
                        {completed.length === 0 ? <div className="muted">None</div> : completed.map((b) => <div key={b.id} className="session" style={{ marginTop: "0.4rem" }}>
                          <div><strong>{b.session.project.title}</strong></div>
                          <div className="muted">{formatDateTime(b.session.startsAt)}{b.session.location ? ` · ${b.session.location}` : ""} · {b.pointsAwarded} points awarded</div>
                        </div>)}
                      </div>
                      <div>
                        <strong>Waitlisted sessions</strong>
                        {waitlisted.length === 0 ? <div className="muted">None</div> : waitlisted.map((b) => <div key={b.id} className="session" style={{ marginTop: "0.4rem" }}>
                          <div><strong>{b.session.project.title}</strong></div>
                          <div className="muted">{formatDateTime(b.session.startsAt)}{b.session.location ? ` · ${b.session.location}` : ""} · {b.session.project.points} points if booked and completed</div>
                        </div>)}
                      </div>
                    </div>
                  </details>}
                </td>
                <td>{student.cohort || "—"}</td>
                <td>{earned}</td>
                <td>{bookedPoints}</td>
                <td>{target}</td>
                <td><span className={`badge ${reached ? "success" : "warning"}`}>{reached ? "reached" : "not yet"}</span></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </>}
  </AppShell>;
}
