import { parse } from "csv-parse/sync";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/security";

type RosterRow = { name: string; email: string; role: UserRole; cohort: string | null };

function parseRole(value: string): UserRole {
  const v = value.trim().toUpperCase();
  if (v === "STUDENT") return UserRole.STUDENT;
  if (v === "STAFF") return UserRole.STAFF;
  if (v === "ADMIN") return UserRole.ADMIN;
  throw new Error(`Unknown role '${value}'. Use student, staff or admin.`);
}

export function parseRosterCsv(csv: string): RosterRow[] {
  const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[];
  const rows = records.map((record, index) => {
    const lower = Object.fromEntries(Object.entries(record).map(([k, v]) => [k.toLowerCase().trim(), v]));
    const name = (lower.name || "").trim();
    const email = normalizeEmail(lower.email || "");
    const roleRaw = (lower.role || lower.status || "").trim();
    const adminRaw = (lower.admin || lower.is_admin || lower.administrator || "").trim().toLowerCase();
    const cohort = (lower.cohort || "").trim() || null;
    const isAdmin = ["1", "true", "yes", "y", "admin"].includes(adminRaw);
    if (!name || !email || !email.includes("@") || (!roleRaw && !isAdmin)) throw new Error(`Invalid roster row ${index + 2}: name, email and staff/student status (or admin) are required.`);
    return { name, email, role: isAdmin ? UserRole.ADMIN : parseRole(roleRaw), cohort };
  });
  const duplicates = rows.filter((row, i) => rows.findIndex((x) => x.email === row.email) !== i);
  if (duplicates.length) throw new Error(`Duplicate email in roster: ${duplicates[0].email}`);
  return rows;
}

export async function replaceRoster(rows: RosterRow[], uploadedBy: string, filename: string, protectAdminEmail?: string) {
  if (protectAdminEmail) {
    const protectedRow = rows.find((r) => r.email === normalizeEmail(protectAdminEmail));
    if (!protectedRow || protectedRow.role !== UserRole.ADMIN) throw new Error("The replacement roster must retain your current email as an admin to prevent accidental lockout.");
  }
  await db.$transaction(async (tx) => {
    await tx.rosterPerson.updateMany({ data: { active: false } });
    for (const row of rows) {
      const existing = await tx.rosterPerson.findUnique({ where: { email: row.email }, include: { user: true } });
      await tx.rosterPerson.upsert({ where: { email: row.email }, create: { ...row, active: true }, update: { name: row.name, role: row.role, cohort: row.cohort, active: true } });
      if (existing?.user) await tx.user.update({ where: { id: existing.user.id }, data: { name: row.name, role: row.role } });
    }
    await tx.rosterUpload.create({ data: { filename, uploadedBy, importedCount: rows.length } });
  });
}
