"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseRosterCsv, replaceRoster } from "@/lib/roster";

export async function uploadRosterAction(formData: FormData) {
  const user = await requireRole(UserRole.ADMIN);
  const entry = formData.get("roster");
  if (!(entry instanceof File)) redirect("/admin/roster?error=Choose+a+CSV+file.");
  const file = entry as File;
  if (file.size === 0) redirect("/admin/roster?error=Choose+a+CSV+file.");
  if (file.size > 1_000_000) redirect("/admin/roster?error=Roster+file+is+too+large.");
  try {
    const rows = parseRosterCsv(await file.text());
    await replaceRoster(rows, user.email, file.name, user.email);
    await audit(user.id, "ROSTER_REPLACED", "Roster", undefined, { count: rows.length, filename: file.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import roster.";
    redirect(`/admin/roster?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/roster");
  redirect("/admin/roster?message=Roster+updated.");
}

export async function createAcademicYearAction(formData: FormData) {
  const user = await requireRole(UserRole.ADMIN);
  const label = String(formData.get("label") || "").trim();
  const startsOn = String(formData.get("startsOn") || "");
  const endsOn = String(formData.get("endsOn") || "");
  const target = Number(formData.get("defaultTargetPoints"));
  const active = formData.get("active") === "on";
  if (!label || !startsOn || !endsOn || !Number.isInteger(target) || target < 0) redirect("/admin/years?error=Complete+all+academic+year+fields.");
  const start = new Date(`${startsOn}T00:00:00.000Z`);
  const end = new Date(`${endsOn}T23:59:59.999Z`);
  if (end <= start) redirect("/admin/years?error=The+academic+year+end+date+must+be+after+the+start+date.");
  if (active) await db.academicYear.updateMany({ data: { active: false } });
  const year = await db.academicYear.create({ data: { label, startsOn: start, endsOn: end, defaultTargetPoints: target, active } });
  await audit(user.id, "ACADEMIC_YEAR_CREATED", "AcademicYear", year.id, { label, target, active });
  revalidatePath("/admin/years");
  redirect("/admin/years?message=Academic+year+created.");
}

export async function setActiveAcademicYearAction(id: string) {
  const user = await requireRole(UserRole.ADMIN);
  await db.$transaction([
    db.academicYear.updateMany({ data: { active: false } }),
    db.academicYear.update({ where: { id }, data: { active: true } })
  ]);
  await audit(user.id, "ACADEMIC_YEAR_ACTIVATED", "AcademicYear", id);
  revalidatePath("/admin/years");
  revalidatePath("/dashboard");
}

export async function setCohortTargetAction(formData: FormData) {
  const user = await requireRole(UserRole.ADMIN);
  const academicYearId = String(formData.get("academicYearId") || "");
  const cohort = String(formData.get("cohort") || "").trim();
  const targetPoints = Number(formData.get("targetPoints"));
  if (!academicYearId || !cohort || !Number.isInteger(targetPoints) || targetPoints < 0) redirect("/admin/years?error=Enter+a+cohort+and+target.");
  const target = await db.cohortTarget.upsert({
    where: { academicYearId_cohort: { academicYearId, cohort } },
    create: { academicYearId, cohort, targetPoints },
    update: { targetPoints }
  });
  await audit(user.id, "COHORT_TARGET_SET", "CohortTarget", target.id, { cohort, targetPoints });
  revalidatePath("/admin/years");
  redirect("/admin/years?message=Cohort+target+saved.");
}
