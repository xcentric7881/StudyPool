import { UserRole } from "@prisma/client";
import { db } from "../lib/db";

if (process.env.PROTOTYPE_MODE !== "true") {
  console.log("[prototype seed] skipped (PROTOTYPE_MODE is not true)");
  await db.$disconnect();
  process.exit(0);
}

const people = [
  { email: "admin@studypool.test", name: "Prototype Admin", role: UserRole.ADMIN, cohort: null },
  { email: "staff@studypool.test", name: "Prototype Researcher", role: UserRole.STAFF, cohort: null },
  { email: "student1@studypool.test", name: "Prototype Student One", role: UserRole.STUDENT, cohort: "2026" },
  { email: "student2@studypool.test", name: "Prototype Student Two", role: UserRole.STUDENT, cohort: "2026" }
];

for (const person of people) {
  const roster = await db.rosterPerson.upsert({
    where: { email: person.email },
    update: { name: person.name, role: person.role, cohort: person.cohort, active: true },
    create: { ...person, active: true }
  });
  await db.user.upsert({
    where: { email: person.email },
    update: { name: person.name, role: person.role, rosterPersonId: roster.id },
    create: { email: person.email, name: person.name, role: person.role, rosterPersonId: roster.id }
  });
}

const year = await db.academicYear.upsert({
  where: { label: "2026/27" },
  update: { startsOn: new Date("2026-09-01T00:00:00.000Z"), endsOn: new Date("2027-08-31T23:59:59.999Z"), defaultTargetPoints: 100, active: true },
  create: { label: "2026/27", startsOn: new Date("2026-09-01T00:00:00.000Z"), endsOn: new Date("2027-08-31T23:59:59.999Z"), defaultTargetPoints: 100, active: true }
});
await db.academicYear.updateMany({ where: { id: { not: year.id } }, data: { active: false } });
await db.cohortTarget.upsert({
  where: { academicYearId_cohort: { academicYearId: year.id, cohort: "2026" } },
  update: { targetPoints: 100 },
  create: { academicYearId: year.id, cohort: "2026", targetPoints: 100 }
});
console.log("[prototype seed] ready with four synthetic demo accounts");
await db.$disconnect();
