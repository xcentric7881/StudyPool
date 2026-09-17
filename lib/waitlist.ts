import { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
const RESERVED_STATUSES: BookingStatus[] = [BookingStatus.BOOKED, BookingStatus.ATTENDED];
export async function promoteNextWaitlisted(sessionId: string): Promise<boolean> {
  const session = await db.experimentSession.findUnique({ where: { id: sessionId }, include: { bookings: { orderBy: { bookedAt: "asc" } } } });
  if (!session || session.startsAt <= new Date()) return false;
  const reserved = session.bookings.filter((b) => RESERVED_STATUSES.includes(b.status)).length;
  if (reserved >= session.capacity) return false;
  const next = session.bookings.find((b) => b.status === BookingStatus.WAITLISTED);
  if (!next) return false;
  const updated = await db.booking.updateMany({ where: { id: next.id, status: BookingStatus.WAITLISTED }, data: { status: BookingStatus.BOOKED } });
  return updated.count === 1;
}
