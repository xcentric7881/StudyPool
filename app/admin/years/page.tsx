import Link from "next/link";
import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAcademicYearAction, setActiveAcademicYearAction, setCohortTargetAction } from "@/lib/actions/admin-actions";
import { formatDate } from "@/lib/time";

export default async function YearsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(UserRole.ADMIN);
  const years = await db.academicYear.findMany({ include: { cohortTargets: true }, orderBy: { startsOn: "desc" } });
  const cohorts = (await db.rosterPerson.findMany({ where: { active: true, role: UserRole.STUDENT, cohort: { not: null } }, select: { cohort: true }, distinct: ["cohort"] })).map((x) => x.cohort!).sort();
  const p = await searchParams;
  const error = typeof p.error === "string" ? p.error : null;
  const message = typeof p.message === "string" ? p.message : null;
  return <AppShell user={user}>
    <div className="hero"><div className="kicker">Administration</div><h1>Academic years and points targets</h1><p className="muted">Each academic year has a default target. Cohort-specific targets can override it.</p></div>
    <div className="actions" style={{ marginBottom: "1rem" }}><Link className="button secondary" href="/admin/roster">Roster</Link><Link className="button secondary" href="/admin/reports">Progress reports</Link></div>
    {error && <div className="notice error" style={{ marginBottom: "1rem" }}>{error}</div>}
    {message && <div className="notice success" style={{ marginBottom: "1rem" }}>{message}</div>}
    <div className="grid cols-2">
      <section className="card"><div className="card-header"><h2>Create academic year</h2></div><form action={createAcademicYearAction} className="stack">
        <label>Label<input name="label" placeholder="2026/27" required /></label>
        <div className="form-grid"><label>Starts<input type="date" name="startsOn" required /></label><label>Ends<input type="date" name="endsOn" required /></label></div>
        <label>Default points target<input type="number" min="0" name="defaultTargetPoints" required /></label>
        <label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input type="checkbox" name="active" style={{ width: "auto" }} /> Make this the active academic year</label>
        <button type="submit">Create year</button>
      </form></section>
      <section className="card"><div className="card-header"><h2>Cohort override</h2></div><form action={setCohortTargetAction} className="stack">
        <label>Academic year<select name="academicYearId" required><option value="">Select year</option>{years.map((y) => <option value={y.id} key={y.id}>{y.label}</option>)}</select></label>
        <label>Cohort<input name="cohort" list="cohorts" required /><datalist id="cohorts">{cohorts.map((c) => <option key={c} value={c} />)}</datalist></label>
        <label>Target points<input type="number" min="0" name="targetPoints" required /></label>
        <button type="submit">Save cohort target</button>
      </form></section>
    </div>
    <div className="stack" style={{ marginTop: "1rem" }}>{years.map((year) => <section className="card" key={year.id}><div className="card-header"><div><h2>{year.label}</h2><p className="muted">{formatDate(year.startsOn)} – {formatDate(year.endsOn)} · default target {year.defaultTargetPoints}</p></div><div className="actions">{year.active ? <span className="badge success">active</span> : <form action={setActiveAcademicYearAction.bind(null, year.id)}><button className="secondary" type="submit">Make active</button></form>}</div></div>{year.cohortTargets.length > 0 && <div className="inline">{year.cohortTargets.map((t) => <span className="badge info" key={t.id}>{t.cohort}: {t.targetPoints}</span>)}</div>}</section>)}</div>
  </AppShell>;
}
