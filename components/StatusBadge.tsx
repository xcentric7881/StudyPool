import { BookingStatus, StudyStatus } from "@prisma/client";

export function StatusBadge({ value }: { value: BookingStatus | StudyStatus | string }) {
  const normal = String(value).toLowerCase().replaceAll("_", " ");
  let cls = "badge";
  if (["attended", "open", "booked"].includes(normal)) cls += " success";
  if (["waitlisted", "draft"].includes(normal)) cls += " warning";
  if (["no show", "cancelled", "closed"].includes(normal)) cls += " danger";
  return <span className={cls}>{normal}</span>;
}
