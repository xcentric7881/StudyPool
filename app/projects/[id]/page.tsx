import Link from "next/link";
import { BookingStatus, StudyStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { markAttendanceAction, setProjectStatusAction } from "@/lib/actions/project-actions";

const RESERVED = new Set<BookingStatus>([BookingStatus.BOOKED, BookingStatus.ATTENDED]);
const ATTENDANCE_ELIGIBLE = new Set<BookingStatus>([BookingStatus.BOOKED, BookingStatus.ATTENDED, BookingStatus.NO_SHOW]);
const ATTENDANCE_MARKED = new Set<BookingStatus>([BookingStatus.ATTENDED, BookingStatus.NO_SHOW]);

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(UserRole.STAFF, UserRole.ADMIN);
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, include: { owner: true, academicYear: true, sessions: { orderBy: { startsAt: "asc" }, include: { bookings: { orderBy: { bookedAt: "asc" }, include: { student: { include: { rosterPerson: true } } } } } } } });
  if (!project || (user.role !== UserRole.ADMIN && project.ownerId !== user.id)) redirect("/dashboard");
  const p = await searchParams;
  const error = typeof p.error === "string" ? p.error : null;
  const message = typeof p.message === "string" ? p.message : null;
  const attended = new Set(project.sessions.flatMap((s) => s.bookings.filter((b) => b.status === BookingStatus.ATTENDED).map((b) => b.studentId))).size;
  return <AppShell user={user}>
    {error && <div className="notice error" style={{ marginBottom: "1rem" }}>{error}</div>}
    {message && <div className="notice success" style={{ marginBottom: "1rem" }}>{message}</div>}
    <div className="card-header hero"><div><div className="kicker">{project.academicYear.label} · {project.owner.name}</div><h1>{project.title}</h1><p>{project.description}</p><div className="inline"><StatusBadge value={project.status} /><span className="badge info">{project.points} points</span><span className="badge">{attended} attended / target {project.recruitmentTarget}</span></div></div><div className="actions"><Link className="button" href={`/projects/${project.id}/sessions/new`}>Add session</Link></div></div>
    <section className="card" style={{ marginBottom: "1rem" }}><div className="card-header"><div><h2>Recruitment status</h2><p className="muted">Opening a study makes future sessions visible to students.</p></div></div><div className="actions">{project.status !== StudyStatus.OPEN && <form action={setProjectStatusAction.bind(null, project.id, StudyStatus.OPEN)}><button type="submit">Open recruitment</button></form>}{project.status === StudyStatus.OPEN && <form action={setProjectStatusAction.bind(null, project.id, StudyStatus.CLOSED)}><button className="danger" type="submit">Close recruitment</button></form>}{project.status === StudyStatus.CLOSED && <form action={setProjectStatusAction.bind(null, project.id, StudyStatus.OPEN)}><button type="submit">Re-open recruitment</button></form>}</div></section>
    <div className="stack">{project.sessions.length === 0 ? <section className="card empty">No sessions yet. Add at least one before opening recruitment.</section> : project.sessions.map((session) => {
      const activeBookings = session.bookings.filter((b) => b.status !== BookingStatus.CANCELLED);
      return <section className="card" key={session.id}><div className="card-header"><div><h2>{formatDateTime(session.startsAt)}</h2><p className="muted">Ends {formatDateTime(session.endsAt)} · {session.location || "No location supplied"} · capacity {session.capacity}</p></div><span className="badge">{activeBookings.filter((b) => RESERVED.has(b.status)).length} reserved</span></div>{session.bookings.length === 0 ? <div className="empty">No participants have selected this session.</div> : <div className="table-wrap"><table><thead><tr><th>Participant</th><th>Status</th><th>Booked</th><th>Points</th><th>Attendance</th></tr></thead><tbody>{session.bookings.map((booking) => <tr key={booking.id}><td><strong>{booking.student.name}</strong><div className="muted">{booking.student.email}{booking.student.rosterPerson.cohort ? ` · ${booking.student.rosterPerson.cohort}` : ""}</div>{booking.cancellationReason && <div className="muted">Cancellation: {booking.cancellationReason}</div>}</td><td><StatusBadge value={booking.status} /></td><td>{formatDateTime(booking.bookedAt)}</td><td>{booking.pointsAwarded}</td><td>{ATTENDANCE_ELIGIBLE.has(booking.status) ? <div className="actions"><form action={markAttendanceAction.bind(null, booking.id, BookingStatus.ATTENDED)}><button type="submit">Attended</button></form><form action={markAttendanceAction.bind(null, booking.id, BookingStatus.NO_SHOW)}><button className="ghost" type="submit">No-show</button></form>{ATTENDANCE_MARKED.has(booking.status) && <form action={markAttendanceAction.bind(null, booking.id, BookingStatus.BOOKED)}><button className="secondary" type="submit">Undo</button></form>}</div> : <span className="muted">Not applicable</span>}</td></tr>)}</tbody></table></div>}</section>;
    })}</div>
  </AppShell>;
}
