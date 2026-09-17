import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProjectAction } from "@/lib/actions/project-actions";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(UserRole.STAFF, UserRole.ADMIN);
  const years = await db.academicYear.findMany({ orderBy: [{ active: "desc" }, { startsOn: "desc" }] });
  const p = await searchParams;
  const error = typeof p.error === "string" ? p.error : null;
  return <AppShell user={user}>
    <div className="hero"><div className="kicker">Researcher</div><h1>Create a study</h1><p className="muted">Create the study first, then add one or more bookable sessions.</p></div>
    <section className="card narrow stack">
      {error && <div className="notice error">{error}</div>}
      {years.length === 0 && <div className="notice error">An administrator must create an academic year before studies can be added.</div>}
      <form action={createProjectAction} className="form-grid">
        <label className="full">Study title<input name="title" required maxLength={160} /></label>
        <label className="full">Description<textarea name="description" required maxLength={5000} placeholder="What will participants do? Include eligibility or preparation information where relevant." /></label>
        <label>People needed<input name="recruitmentTarget" type="number" min="1" required /></label>
        <label>Points<input name="points" type="number" min="0" defaultValue="10" required /></label>
        <label>Recruitment start <small>Optional</small><input name="startsOn" type="date" /></label>
        <label>Recruitment end <small>Optional</small><input name="endsOn" type="date" /></label>
        <label className="full">Academic year<select name="academicYearId" required defaultValue={years.find((y) => y.active)?.id || ""}><option value="" disabled>Select academic year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.label}{year.active ? " (active)" : ""}</option>)}</select></label>
        <div className="full actions"><button type="submit" disabled={years.length === 0}>Create study</button></div>
      </form>
    </section>
  </AppShell>;
}
