import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function audit(actorId: string | null, action: string, entityType: string, entityId?: string, metadata?: unknown) {
  await db.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata: metadata === undefined ? undefined : (metadata as Prisma.InputJsonValue)
    }
  });
}
