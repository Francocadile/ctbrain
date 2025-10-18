import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  actorId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  meta?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        meta: params.meta ?? null,
      },
    });
  } catch (e) {
    // no romper el flujo si falla la auditoría
    console.error("Audit error:", e);
  }
}
