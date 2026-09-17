import { StudyStatus, UserRole } from "@prisma/client";
import { db } from "../lib/db";

async function main() {
  if (process.env.PROTOTYPE_MODE !== "true") {
    console.log("[prototype seed] skipped (PROTOTYPE_MODE is not true)");
    return;
  }

  const people = [
    { email: "admin@studypool.test", name: "Prototype Admin", role: UserRole.ADMIN, cohort: null },
    { email: "staff@studypool.test", name: "Prototype Researcher", role: UserRole.STAFF, cohort: null },
    { email: "student1@studypool.test", name: "Aisha Khan", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student2@studypool.test", name: "Ben Carter", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student3@studypool.test", name: "Chloe Evans", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student4@studypool.test", name: "Daniel Okafor", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student5@studypool.test", name: "Ella Morris", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student6@studypool.test", name: "Farah Ali", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student7@studypool.test", name: "George Wilson", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student8@studypool.test", name: "Hannah Lewis", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student9@studypool.test", name: "Isaac Brown", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student10@studypool.test", name: "Jasmine Patel", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student11@studypool.test", name: "Kai Thompson", role: UserRole.STUDENT, cohort: "2026" },
    { email: "student12@studypool.test", name: "Lucy Green", role: UserRole.STUDENT, cohort: "2026" }
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

  const researcher = await db.user.findUniqueOrThrow({ where: { email: "staff@studypool.test" } });

  const studySeeds = [
    {
      title: "How people interpret AI-generated explanations",
      description: "A usability study comparing different ways an AI system explains its recommendations. Participants complete short decision tasks and discuss which explanations they find clearest and most trustworthy.",
      points: 10,
      recruitmentTarget: 12,
      status: StudyStatus.OPEN,
      sessions: [
        ["2026-09-22T10:00:00.000Z", "2026-09-22T11:00:00.000Z", 4, "HCI Lab 1"],
        ["2026-09-22T14:00:00.000Z", "2026-09-22T15:00:00.000Z", 4, "HCI Lab 1"],
        ["2026-09-24T11:00:00.000Z", "2026-09-24T12:00:00.000Z", 4, "HCI Lab 1"]
      ]
    },
    {
      title: "Mobile notification timing and attention",
      description: "A short interaction study examining how the timing and wording of mobile notifications affects interruption, recall and willingness to act.",
      points: 8,
      recruitmentTarget: 16,
      status: StudyStatus.OPEN,
      sessions: [
        ["2026-09-23T09:30:00.000Z", "2026-09-23T10:30:00.000Z", 8, "UX Studio"],
        ["2026-09-25T13:30:00.000Z", "2026-09-25T14:30:00.000Z", 8, "UX Studio"]
      ]
    },
    {
      title: "Finding information in a redesigned university website",
      description: "Participants use two alternative navigation designs to complete realistic information-finding tasks. We record task success, time and comments about the interface.",
      points: 12,
      recruitmentTarget: 10,
      status: StudyStatus.OPEN,
      sessions: [
        ["2026-09-29T10:00:00.000Z", "2026-09-29T11:00:00.000Z", 5, "Computer Science 245"],
        ["2026-09-29T15:00:00.000Z", "2026-09-29T16:00:00.000Z", 5, "Computer Science 245"]
      ]
    },
    {
      title: "Voice assistants for planning everyday tasks",
      description: "An exploratory study of how people use conversational voice interfaces to plan a set of everyday activities. The study includes a short interview after the interaction.",
      points: 15,
      recruitmentTarget: 8,
      status: StudyStatus.DRAFT,
      sessions: [
        ["2026-10-06T11:00:00.000Z", "2026-10-06T12:00:00.000Z", 4, "HCI Lab 2"],
        ["2026-10-08T14:00:00.000Z", "2026-10-08T15:00:00.000Z", 4, "HCI Lab 2"]
      ]
    }
  ] as const;

  for (const seed of studySeeds) {
    let project = await db.project.findFirst({
      where: { title: seed.title, ownerId: researcher.id }
    });

    if (!project) {
      project = await db.project.create({
        data: {
          title: seed.title,
          description: seed.description,
          points: seed.points,
          recruitmentTarget: seed.recruitmentTarget,
          status: seed.status,
          ownerId: researcher.id,
          academicYearId: year.id,
          startsOn: new Date("2026-09-17T00:00:00.000Z"),
          endsOn: new Date("2027-06-30T23:59:59.999Z")
        }
      });
    }

    for (const [startsAt, endsAt, capacity, location] of seed.sessions) {
      const existing = await db.experimentSession.findFirst({
        where: { projectId: project.id, startsAt: new Date(startsAt) }
      });
      if (!existing) {
        await db.experimentSession.create({
          data: {
            projectId: project.id,
            startsAt: new Date(startsAt),
            endsAt: new Date(endsAt),
            capacity,
            location
          }
        });
      }
    }
  }

  console.log(`[prototype seed] ready with ${people.length} synthetic accounts and ${studySeeds.length} example studies`);
}

main()
  .catch((error) => {
    console.error("[prototype seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
