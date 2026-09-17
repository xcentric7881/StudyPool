import Link from "next/link";
import { BookingStatus, UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { targetForStudent } from "@/lib/points";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(UserRole.ADMIN);
  const years = await db.academicYear.findMany({ orderBy: { startsOn: "desc" } });
  const p = await searchParams;
  const requested = typeof p.year === "string" ? p.year : null;
  const year = (requested && years.find((y) => y.id === requested)) || years.find((y) => y.active) || years[0];
  const students = await db.rosterPerson.findMany({ where: { role: UserRole.STUDENT, active: true }, include: { user: true }, orderBy: { name: "asc" } });
  const targets = year ? await db.cohortTarget.findMany({ where: { academicYearId: year.id } }) : [];
  const totals = year ? await db.booking.groupBy({ by: ["studentId"], where: { status: BookingStatus.ATTENDED, session: { project: { academicYearId: year.id } } }, _sum: { pointsAwarded: true } }) : [];
  const totalMap = new Map(totals.map((x) => [x.studentId, x._sum.pointsAwarded || 0]));
  const rows = students.map((student) => {
    const target = year ? targetForStudent(year.defaultTargetPoints, student.cohort, targets) : 0;
    const earned = student.user ? (totalMap.get(student.user.id) || 0) : 0;
    return { student, target, earned, reached: target > 0 ? earned >= target : false };
  });
  return <AppShell user={user}>
    <div className="hero"><div className="kicker">Administration</div><h1>Student progress</h1><p className="muted">Progress is calculated from attended bookings only. Corrections to attendance update totals immediately.</p></div>
    <div className="actions" style={{ marginBottom: "1rem" }}><Link className="button secondary" href="/admin/roster">Roster</Link><Link className="button secondary" href="/admin/years">Academic years & targets</Link>{year && <a className="button" href={`/api/admin/report.csv?year=${year.id}`}>Download CSV</a>}</div>
    <section className="card" style={{ marginBottom: "1rem" }}><form method="get" className="inline"><label style={{ minWidth: 260 }}>Academic year<select name="year" defaultValue={year?.id || ""}>{years.map((y) => <option value={y.id} key={y.id}>{y.label}{y.active ? " (active)" : ""}</option>)}</select></label><button type="submit">View</button></form></section>
    {!year ? <section className="card empty">Create an academic year before running reports.</section> : <>
      <div className="grid cols-3" style={{ marginBottom: "1rem" }}><section className="card"><div className="kicker">Students</div><div className="stat">{rows.length}</div></section><section className="card"><div className="kicker">Reached target</div><div className="stat">{rows.filter((r) => r.reached).length}</div></section><section className="card"><div className="kicker">Not yet reached</div><div className="stat">{rows.filter((r) => !r.reached).length}</div></section></div>
      <section className="card"><div className="table-wrap"><table><thead><tr><th>Student</th><th>Cohort</th><th>Points</th><th>Target</th><th>Progress</th></tr></thead><tbody>{rows.map(({ student, earned, target, reached }) => <tr key={student.id}><td><strong>{student.name}</strong><div className="muted">{student.email}{student.user ? "" : " · roster only"}</div></td><td>{student.cohort || "—"}</td><td>{earned}</td><td>{target}</td><td><span className={`badge ${reached ? "success" : "warning"}`}>{reached ? "reached" : "not yet"}</span></td></tr>)}</tbody></table></div></section>
    </>}
  </AppShell>;
}
