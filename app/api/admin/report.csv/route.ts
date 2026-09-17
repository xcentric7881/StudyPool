import { BookingStatus, UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { targetForStudent } from "@/lib/points";

function csvCell(value: string | number | null | undefined) {
  const s = String(value ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireRole(UserRole.ADMIN);
  const url = new URL(request.url);
  const yearId = url.searchParams.get("year");
  if (!yearId) return new Response("Missing year", { status: 400 });
  const year = await db.academicYear.findUnique({ where: { id: yearId }, include: { cohortTargets: true } });
  if (!year) return new Response("Academic year not found", { status: 404 });
  const students = await db.rosterPerson.findMany({ where: { role: UserRole.STUDENT, active: true }, include: { user: true }, orderBy: { name: "asc" } });
  const totals = await db.booking.groupBy({ by: ["studentId"], where: { status: BookingStatus.ATTENDED, session: { project: { academicYearId: year.id } } }, _sum: { pointsAwarded: true } });
  const map = new Map(totals.map((x) => [x.studentId, x._sum.pointsAwarded || 0]));
  const lines = ["name,email,cohort,prototype_user,points,target,reached"];
  for (const student of students) {
    const earned = student.user ? (map.get(student.user.id) || 0) : 0;
    const target = targetForStudent(year.defaultTargetPoints, student.cohort, year.cohortTargets);
    lines.push([student.name, student.email, student.cohort, student.user ? "yes" : "no", earned, target, earned >= target ? "yes" : "no"].map(csvCell).join(","));
  }
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="study-progress-${year.label.replaceAll("/", "-")}.csv"` } });
}
