import Link from "next/link";
import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadRosterAction } from "@/lib/actions/admin-actions";

export default async function RosterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(UserRole.ADMIN);
  const [people, uploads] = await Promise.all([
    db.rosterPerson.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { user: true } }),
    db.rosterUpload.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
  ]);
  const p = await searchParams;
  const error = typeof p.error === "string" ? p.error : null;
  const message = typeof p.message === "string" ? p.message : null;
  return <AppShell user={user}>
    <div className="hero"><div className="kicker">Administration</div><h1>Approved roster</h1><p className="muted">The roster is the future production eligibility list. In this prototype only the four seeded demo identities can sign in. Replacing the roster never deletes existing users, bookings or participation history.</p></div>
    <div className="actions" style={{ marginBottom: "1rem" }}><Link className="button secondary" href="/admin/years">Academic years & targets</Link><Link className="button secondary" href="/admin/reports">Progress reports</Link></div>
    {error && <div className="notice error" style={{ marginBottom: "1rem" }}>{error}</div>}
    {message && <div className="notice success" style={{ marginBottom: "1rem" }}>{message}</div>}
    <section className="card" style={{ marginBottom: "1rem" }}>
      <div className="card-header"><div><h2>Replace/update roster from CSV</h2><p className="muted">Use name and email plus either a role column, or staff/student status with an optional admin marker. Cohort is optional. Roles are student, staff or admin. People omitted from the replacement file become inactive, but their history is retained.</p></div></div>
      <form action={uploadRosterAction} className="inline"><input type="file" name="roster" accept=".csv,text/csv" required style={{ maxWidth: 520 }} /><button type="submit">Import roster</button></form>
      <p className="muted">Safety check: your own email must remain present with the admin role.</p>
    </section>
    <section className="card" style={{ marginBottom: "1rem" }}>
      <div className="card-header"><h2>People</h2><span className="badge">{people.filter((x) => x.active).length} active</span></div>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Cohort</th><th>Prototype user</th><th>Status</th></tr></thead><tbody>
        {people.map((person) => <tr key={person.id}><td>{person.name}</td><td>{person.email}</td><td>{person.role.toLowerCase()}</td><td>{person.cohort || "—"}</td><td>{person.user ? "Available" : "Roster only"}</td><td><span className={`badge ${person.active ? "success" : "danger"}`}>{person.active ? "active" : "inactive"}</span></td></tr>)}
      </tbody></table></div>
    </section>
    <section className="card"><div className="card-header"><h2>Recent imports</h2></div>{uploads.length === 0 ? <div className="empty">No roster imports recorded.</div> : <div className="table-wrap"><table><thead><tr><th>When</th><th>File</th><th>By</th><th>Rows</th></tr></thead><tbody>{uploads.map((u) => <tr key={u.id}><td>{u.createdAt.toLocaleString("en-GB")}</td><td>{u.filename}</td><td>{u.uploadedBy}</td><td>{u.importedCount}</td></tr>)}</tbody></table></div>}</section>
  </AppShell>;
}
