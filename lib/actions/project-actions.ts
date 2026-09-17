"use server";

import { BookingStatus, Prisma, StudyStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { localDateTimeToUtc } from "@/lib/time";
import { promoteNextWaitlisted } from "@/lib/waitlist";

async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error("Transaction retry limit reached");
}

function asInt(value: FormDataEntryValue | null, fallback?: number) {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    if (fallback !== undefined) return fallback;
    throw new Error("Expected a whole number");
  }
  return n;
}

export async function createProjectAction(formData: FormData) {
  const user = await requireRole(UserRole.STAFF, UserRole.ADMIN);
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const points = asInt(formData.get("points"), 10);
  const recruitmentTarget = asInt(formData.get("recruitmentTarget"));
  const academicYearId = String(formData.get("academicYearId") || "");
  const starts = String(formData.get("startsOn") || "");
  const ends = String(formData.get("endsOn") || "");
  if (!title || !description || !academicYearId || points < 0 || recruitmentTarget < 1) redirect("/projects/new?error=Please+complete+all+required+fields.");
  const project = await db.project.create({
    data: {
      title,
      description,
      points,
      recruitmentTarget,
      academicYearId,
      ownerId: user.id,
      startsOn: starts ? new Date(`${starts}T00:00:00.000Z`) : null,
      endsOn: ends ? new Date(`${ends}T23:59:59.999Z`) : null
    }
  });
  await audit(user.id, "PROJECT_CREATED", "Project", project.id, { points, recruitmentTarget });
  redirect(`/projects/${project.id}?message=Study+created.+Add+sessions+and+open+it+when+ready.`);
}

export async function addSessionAction(projectId: string, formData: FormData) {
  const user = await requireRole(UserRole.STAFF, UserRole.ADMIN);
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || (user.role !== UserRole.ADMIN && project.ownerId !== user.id)) redirect("/dashboard");
  const startsValue = String(formData.get("startsAt") || "");
  const endsValue = String(formData.get("endsAt") || "");
  const location = String(formData.get("location") || "").trim() || null;
  const capacity = asInt(formData.get("capacity"));
  if (!startsValue || !endsValue || capacity < 1) redirect(`/projects/${projectId}/sessions/new?error=Please+complete+the+session+details.`);
  const startsAt = localDateTimeToUtc(startsValue);
  const endsAt = localDateTimeToUtc(endsValue);
  if (endsAt <= startsAt) redirect(`/projects/${projectId}/sessions/new?error=The+end+time+must+be+after+the+start+time.`);
  const session = await db.experimentSession.create({ data: { projectId, startsAt, endsAt, location, capacity } });
  await audit(user.id, "SESSION_CREATED", "ExperimentSession", session.id, { projectId, capacity });
  redirect(`/projects/${projectId}?message=Session+added.`);
}

export async function setProjectStatusAction(projectId: string, status: StudyStatus) {
  const user = await requireRole(UserRole.STAFF, UserRole.ADMIN);
  const project = await db.project.findUnique({ where: { id: projectId }, include: { sessions: true } });
  if (!project || (user.role !== UserRole.ADMIN && project.ownerId !== user.id)) redirect("/dashboard");
  if (status === StudyStatus.OPEN && project.sessions.length === 0) redirect(`/projects/${projectId}?error=Add+at+least+one+session+before+opening+the+study.`);
  await db.project.update({ where: { id: projectId }, data: { status } });
  await audit(user.id, "PROJECT_STATUS_CHANGED", "Project", projectId, { status });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function bookSessionAction(sessionId: string) {
  const user = await requireRole(UserRole.STUDENT);
  const result = await serializable(async (tx) => {
    const session = await tx.experimentSession.findUnique({ where: { id: sessionId }, include: { project: true, bookings: true } });
    if (!session || session.project.status !== StudyStatus.OPEN || session.startsAt <= new Date()) return { error: "That session is not available." } as const;
    const now = new Date();
    if ((session.project.startsOn && session.project.startsOn > now) || (session.project.endsOn && session.project.endsOn < now)) return { error: "Recruitment is not currently open for that study." } as const;
    const existingProjectBooking = await tx.booking.findFirst({
      where: {
        studentId: user.id,
        session: { projectId: session.projectId },
        status: { in: [BookingStatus.BOOKED, BookingStatus.WAITLISTED, BookingStatus.ATTENDED] }
      }
    });
    if (existingProjectBooking) return { error: "You already have a session selected for that study." } as const;
    const reserved = session.bookings.filter((b) => [BookingStatus.BOOKED, BookingStatus.ATTENDED].includes(b.status)).length;
    const status = reserved < session.capacity ? BookingStatus.BOOKED : BookingStatus.WAITLISTED;
    const booking = await tx.booking.upsert({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
      create: { sessionId, studentId: user.id, status },
      update: { status, bookedAt: new Date(), cancelledAt: null, cancellationReason: null, attendanceMarkedAt: null, attendanceMarkedById: null, pointsAwarded: 0 }
    });
    return { booking, status } as const;
  });
  if ("error" in result && result.error) redirect(`/dashboard?error=${encodeURIComponent(result.error)}`);
  await audit(user.id, "SESSION_SELECTED", "Booking", result.booking.id, { sessionId, status: result.status });
  revalidatePath("/dashboard");
}

export async function cancelBookingAction(bookingId: string, formData: FormData) {
  const user = await requireRole(UserRole.STUDENT);
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) redirect("/dashboard?error=Please+give+a+brief+reason+for+cancelling.");
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { session: true } });
  if (!booking || booking.studentId !== user.id) redirect("/dashboard");
  if (![BookingStatus.BOOKED, BookingStatus.WAITLISTED].includes(booking.status)) redirect("/dashboard?error=That+booking+cannot+be+cancelled.");
  const wasReserved = booking.status === BookingStatus.BOOKED;
  await db.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason, pointsAwarded: 0 } });
  await audit(user.id, "BOOKING_CANCELLED", "Booking", booking.id, { reason });
  if (wasReserved) {
    try { await promoteNextWaitlisted(booking.sessionId); } catch (error) { console.error(`[waitlist] promotion after cancellation failed for session ${booking.sessionId}`, error); }
  }
  revalidatePath("/dashboard");
}

export async function markAttendanceAction(bookingId: string, status: BookingStatus) {
  const user = await requireRole(UserRole.STAFF, UserRole.ADMIN);
  if (![BookingStatus.ATTENDED, BookingStatus.NO_SHOW, BookingStatus.BOOKED].includes(status)) redirect("/dashboard");
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { session: { include: { project: true } } } });
  if (!booking) redirect("/dashboard");
  if (user.role !== UserRole.ADMIN && booking.session.project.ownerId !== user.id) redirect("/dashboard");
  if (![BookingStatus.BOOKED, BookingStatus.ATTENDED, BookingStatus.NO_SHOW].includes(booking.status)) redirect(`/projects/${booking.session.project.id}?error=Attendance+can+only+be+recorded+for+confirmed+participants.`);
  const pointsAwarded = status === BookingStatus.ATTENDED ? booking.session.project.points : 0;
  await db.booking.update({
    where: { id: booking.id },
    data: { status, pointsAwarded, attendanceMarkedAt: status === BookingStatus.BOOKED ? null : new Date(), attendanceMarkedById: status === BookingStatus.BOOKED ? null : user.id }
  });
  await audit(user.id, "ATTENDANCE_MARKED", "Booking", booking.id, { status, pointsAwarded });
  revalidatePath(`/projects/${booking.session.project.id}`);
  revalidatePath("/dashboard");
}
