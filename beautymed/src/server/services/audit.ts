import "server-only";
import { prisma } from "@/server/db";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, string | number | boolean | null>;
};

/** Record who did what. Never put secrets, codes or document contents in `meta`. */
export async function audit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      meta: entry.meta,
    },
  });
}
