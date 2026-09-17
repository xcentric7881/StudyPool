import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SessionTimeFields } from "@/components/SessionTimeFields";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { addSessionAction } from "@/lib/actions/project-actions";

export default async function NewSessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(UserRole.STAFF, UserRole.ADMIN);
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || (user.role !== UserRole.ADMIN && project.ownerId !== user.id)) redirect("/dashboard");
  const p = await searchParams;
  const error = typeof p.error === "string" ? p.error : null;
  return <AppShell user={user}>
    <div className="hero"><div className="kicker">{project.title}</div><h1>Add a session</h1><p className="muted">Times are entered and displayed in the configured application timezone (Europe/London by default).</p></div>
    <section className="card narrow stack">
      {error && <div className="notice error">{error}</div>}
      <form action={addSessionAction.bind(null, project.id)} className="form-grid">
        <SessionTimeFields />
        <label>Capacity<input name="capacity" type="number" min="1" required /></label>
        <label>Location <small>Optional</small><input name="location" maxLength={250} /></label>
        <div className="full"><button type="submit">Add session</button></div>
      </form>
    </section>
  </AppShell>;
}
