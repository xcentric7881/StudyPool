import Link from "next/link";
import { BookingStatus, StudyStatus, UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { targetForStudent } from "@/lib/points";
import { formatDateTime } from "@/lib/time";
import { bookSessionAction, cancelBookingAction } from "@/lib/actions/project-actions";

const RESERVED = new Set<BookingStatus>([BookingStatus.BOOKED, BookingStatus.ATTENDED]);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const p = await searchParams;
  const error = typeof p.error === "string" ? p.error : null;
  const message = typeof p.message === "string" ? p.message : null;
  return <AppShell user={user}>
    {error && <div className="notice error" style={{ marginBottom: "1rem" }}>{error}</div>}
    {message && <div className="notice success" style={{ marginBottom: "1rem" }}>{message}</div>}
    {user.role === UserRole.STUDENT ? <StudentDashboard user={user} /> : <StaffDashboard user={user} />}
  </AppShell>;
}

async function StudentDashboard({ user }: { user: Awaited<ReturnType<typeof requireUser>> }) {
  const now = new Date();
  const activeYear = await db.academicYear.findFirst({ where: { active: true }, include: { cohortTargets: true } });
  const [points, ownBookings, projects] = await Promise.all([
    activeYear ? db.booking.aggregate({ where: { studentId: user.id, status: BookingStatus.ATTENDED, session: { project: { academicYearId: activeYear.id } } }, _sum: { pointsAwarded: true } }) : Promise.resolve({ _sum: { pointsAwarded: null } }),
    db.booking.findMany({ where: { studentId: user.id, status: { in: [BookingStatus.BOOKED, BookingStatus.WAITLISTED] }, session: { startsAt: { gte: now } } }, include: { session: { include: { project: true } } }, orderBy: { session: { startsAt: "asc" } } }),
    db.project.findMany({
      where: { status: StudyStatus.OPEN, AND: [{ OR: [{ startsOn: null }, { startsOn: { lte: now } }] }, { OR: [{ endsOn: null }, { endsOn: { gte: now } }] }], sessions: { some: { startsAt: { gte: now } } } },
      include: { sessions: { where: { startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, include: { bookings: { select: { status: true, studentId: true, id: true } } } } },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const earned = points._sum.pointsAwarded ?? 0;
  const cohort = user.rosterPerson.cohort;
  const target = activeYear ? targetForStudent(activeYear.defaultTargetPoints, cohort, activeYear.cohortTargets) : 0;
  const pct = target > 0 ? Math.min(100, Math.round((earned / target) * 100)) : 0;

  return <>
    <div className="hero"><div className="kicker">Student dashboard</div><h1>Welcome, {user.name}</h1><p className="muted">Book research sessions, manage your upcoming commitments and track your participation points.</p></div>
    <div className="grid cols-3" style={{ marginBottom: "1rem" }}>
      <section className="card"><div className="kicker">Points</div><div className="stat">{earned}{target ? ` / ${target}` : ""}</div><p className="muted">{activeYear ? `${activeYear.label}${cohort ? ` · cohort ${cohort}` : ""}` : "No active academic year has been configured."}</p>{target > 0 && <div className="progress"><span style={{ width: `${pct}%` }} /></div>}</section>
      <section className="card"><div className="kicker">Upcoming</div><div className="stat">{ownBookings.filter((b) => b.status === BookingStatus.BOOKED).length}</div><p className="muted">Confirmed future sessions</p></section>
      <section className="card"><div className="kicker">Waiting lists</div><div className="stat">{ownBookings.filter((b) => b.status === BookingStatus.WAITLISTED).length}</div><p className="muted">Waiting-list entries</p></section>
    </div>
    <section className="card" style={{ marginBottom: "1rem" }}>
      <div className="card-header"><div><h2>Your upcoming participation</h2><p className="muted">Cancellations are retained in the audit history and require a reason.</p></div></div>
      {ownBookings.length === 0 ? <div className="empty">You do not currently have any upcoming bookings or waiting-list entries.</div> : <div className="stack">
        {ownBookings.map((booking) => <div key={booking.id} className="session"><div className="card-header"><div><h3>{booking.session.project.title}</h3><div>{formatDateTime(booking.session.startsAt)}{booking.session.location ? ` · ${booking.session.location}` : ""}</div></div><StatusBadge value={booking.status} /></div><form action={cancelBookingAction.bind(null, booking.id)} className="inline"><input name="reason" required maxLength={500} placeholder="Reason for cancellation" aria-label="Cancellation reason" style={{ maxWidth: 360 }} /><button className="ghost" type="submit">Cancel</button></form></div>)}
      </div>}
    </section>
    <div className="hero" style={{ marginTop: "2rem" }}><div className="kicker">Open studies</div><h2>Experiments with upcoming sessions</h2></div>
    <div className="grid cols-2">
      {projects.length === 0 ? <section className="card empty">There are no open studies with future sessions at present.</section> : projects.map((project) => <section key={project.id} className="card">
        <div className="card-header"><div><h2>{project.title}</h2><p>{project.description}</p></div><span className="badge info">{project.points} points</span></div>
        <div className="stack">{(() => {
          const myProjectBooking = project.sessions.flatMap((s) => s.bookings).find((b) => b.studentId === user.id && [BookingStatus.BOOKED, BookingStatus.WAITLISTED, BookingStatus.ATTENDED].includes(b.status));
          return project.sessions.map((session) => {
            const mine = session.bookings.find((b) => b.studentId === user.id);
            const used = session.bookings.filter((b) => RESERVED.has(b.status)).length;
            const spaces = Math.max(0, session.capacity - used);
            const canBook = !myProjectBooking;
            return <div key={session.id} className="session"><div className="card-header"><div><strong>{formatDateTime(session.startsAt)}</strong><div className="muted">{session.location || "Location shown when confirmed"} · {spaces > 0 ? `${spaces} space${spaces === 1 ? "" : "s"}` : "Full — waiting list available"}</div></div>{mine && <StatusBadge value={mine.status} />}</div>{canBook && <form action={bookSessionAction.bind(null, session.id)}><button type="submit">{spaces > 0 ? "Book this session" : "Join waiting list"}</button></form>}</div>;
          });
        })()}</div>
      </section>)}
    </div>
  </>;
}

async function StaffDashboard({ user }: { user: Awaited<ReturnType<typeof requireUser>> }) {
  const where = user.role === UserRole.ADMIN ? {} : { ownerId: user.id };
  const [projects, activeYear, rosterCount] = await Promise.all([
    db.project.findMany({ where, include: { sessions: { include: { bookings: true } }, owner: true }, orderBy: { updatedAt: "desc" } }),
    db.academicYear.findFirst({ where: { active: true } }),
    user.role === UserRole.ADMIN ? db.rosterPerson.count({ where: { active: true } }) : Promise.resolve(null)
  ]);
  return <>
    <div className="hero"><div className="kicker">{user.role === UserRole.ADMIN ? "Administrator" : "Researcher"} dashboard</div><h1>Studies and participation</h1><p className="muted">Create studies, add session slots and record attendance. Points are awarded only when a participant is marked attended.</p></div>
    <div className="grid cols-3" style={{ marginBottom: "1rem" }}>
      <section className="card"><div className="kicker">Studies</div><div className="stat">{projects.length}</div><p className="muted">{user.role === UserRole.ADMIN ? "Across all researchers" : "Owned by you"}</p></section>
      <section className="card"><div className="kicker">Active year</div><div className="stat" style={{ fontSize: "1.3rem" }}>{activeYear?.label || "Not set"}</div><p className="muted">Participation points reporting period</p></section>
      <section className="card"><div className="kicker">{user.role === UserRole.ADMIN ? "Active roster" : "Open studies"}</div><div className="stat">{user.role === UserRole.ADMIN ? rosterCount : projects.filter((x) => x.status === StudyStatus.OPEN).length}</div><p className="muted">{user.role === UserRole.ADMIN ? <Link href="/admin/roster">Manage roster</Link> : "Currently recruiting"}</p></section>
    </div>
    <div className="card-header"><div><h2>{user.role === UserRole.ADMIN ? "All studies" : "Your studies"}</h2></div><Link className="button" href="/projects/new">Create study</Link></div>
    <div className="grid cols-2">
      {projects.length === 0 ? <section className="card empty">No studies yet. Create the first one.</section> : projects.map((project) => {
        const participants = new Set(project.sessions.flatMap((s) => s.bookings.filter((b) => b.status === BookingStatus.ATTENDED).map((b) => b.studentId))).size;
        const booked = project.sessions.reduce((sum, s) => sum + s.bookings.filter((b) => [BookingStatus.BOOKED, BookingStatus.ATTENDED].includes(b.status)).length, 0);
        return <Link key={project.id} href={`/projects/${project.id}`} className="card" style={{ color: "inherit" }}><div className="card-header"><div><h2>{project.title}</h2><p className="muted">{user.role === UserRole.ADMIN ? `Owner: ${project.owner.name} · ` : ""}{project.sessions.length} session{project.sessions.length === 1 ? "" : "s"} · {booked} booked</p></div><StatusBadge value={project.status} /></div><div className="inline"><span className="badge info">{project.points} points</span><span className="badge">{participants} attended / target {project.recruitmentTarget}</span></div></Link>;
      })}
    </div>
    {user.role === UserRole.ADMIN && <div className="actions" style={{ marginTop: "1.2rem" }}><Link className="button secondary" href="/admin/years">Academic years & targets</Link><Link className="button secondary" href="/admin/reports">Progress reports</Link></div>}
  </>;
}
