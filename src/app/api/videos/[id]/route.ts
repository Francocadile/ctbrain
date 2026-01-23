import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";
import { isVideoType, teamVideoSelect } from "@/lib/videos";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getIdFromUrl(req: NextRequest) {
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export async function PATCH(req: NextRequest) {
  try {
    assertCsrf(req);

    const id = getIdFromUrl(req);
    if (!id) return jsonError("ID inválido", 400);

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
    const typeInput = typeof payload.type === "string" ? payload.type.trim() : "";
    const visibleToDirectivo =
      typeof payload.visibleToDirectivo === "boolean" ? payload.visibleToDirectivo : undefined;

    const audienceModeInput = typeof payload.audienceMode === "string" ? payload.audienceMode.trim() : undefined;
    const selectedUserIds = Array.isArray(payload.selectedUserIds)
      ? (payload.selectedUserIds.filter((v) => typeof v === "string") as string[])
      : undefined;

    if (typeInput && !isVideoType(typeInput)) return jsonError("Tipo de video inválido");

    type AudienceMode =
      (typeof import("@prisma/client").TeamVideoAudienceMode)[keyof typeof import("@prisma/client").TeamVideoAudienceMode];

    const nextAudienceMode: AudienceMode | undefined =
      audienceModeInput === "ALL" || audienceModeInput === "SELECTED"
        ? (audienceModeInput as AudienceMode)
        : undefined;

    if (nextAudienceMode === "SELECTED" && (selectedUserIds?.length ?? 0) === 0) {
      return jsonError("Seleccioná al menos 1 jugador para audiencia SELECTED");
    }

    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    // Verifico ownership team-scoped
    const existing = await prisma.teamVideo.findFirst({
      where: { id, teamId: team.id },
      select: { id: true },
    });
    if (!existing) return jsonError("Video no encontrado", 404);

    // Actualizar campos (solo si vienen)
    const updated = await prisma.teamVideo.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(url ? { url } : {}),
        ...(typeInput ? { type: typeInput } : {}),
        ...(payload.notes !== undefined ? { notes: notes || null } : {}),
        ...(visibleToDirectivo !== undefined ? { visibleToDirectivo } : {}),
        ...(nextAudienceMode ? { audienceMode: nextAudienceMode } : {}),
      },
      select: teamVideoSelect,
    });

    // Reemplazo de audiencia (si mandan audienceMode o selectedUserIds)
    const shouldTouchAudience = nextAudienceMode !== undefined || selectedUserIds !== undefined;
    if (shouldTouchAudience) {
      // TEMP LOGS: diagnosticar error runtime al editar audiencia
      try {
        console.log("[videos/[id] PATCH] audience replace start", {
          id,
          teamId: team.id,
          nextAudienceMode,
          audienceModeInput,
          selectedUserIds,
          selectedUserIdsType: typeof selectedUserIds,
          selectedUserIdsIsArray: Array.isArray(selectedUserIds),
          selectedUserIdsLength: selectedUserIds?.length ?? null,
          selectedUserIdsHasInvalid: Array.isArray(selectedUserIds)
            ? selectedUserIds.some((v) => typeof v !== "string" || v.trim().length === 0)
            : null,
        });

        if (Array.isArray(selectedUserIds)) {
          if (selectedUserIds.some((v) => v === undefined || v === null || v === "")) {
            console.error("[videos/[id] PATCH] INVALID selectedUserIds values", selectedUserIds);
          }

          // Validar que pertenezcan al team actual (solo diagnóstico)
          // Nota: multi-tenant => la relación es vía UserTeam
          const uniqueIds = Array.from(new Set(selectedUserIds));
          const users = await prisma.user.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, email: true, name: true, role: true },
          });
          const byId = new Map(users.map((u) => [u.id, u] as const));
          const missing = uniqueIds.filter((uid) => !byId.has(uid));
          if (missing.length) {
            console.error("[videos/[id] PATCH] selectedUserIds missing users", { missing });
          }

          const memberships = await prisma.userTeam.findMany({
            where: { teamId: team.id, userId: { in: uniqueIds } },
            select: { userId: true },
          });
          const inTeam = new Set(memberships.map((m) => m.userId));
          const notInTeam = uniqueIds.filter((uid) => !inTeam.has(uid));
          if (notInTeam.length) {
            console.error(
              "[videos/[id] PATCH] selectedUserIds NOT in current team",
              notInTeam.map((uid) => ({
                userId: uid,
                email: byId.get(uid)?.email,
                role: byId.get(uid)?.role,
              }))
            );
          }
        }
      } catch (logErr) {
        console.error("[videos/[id] PATCH] audience debug logging failed", logErr);
      }

      if (nextAudienceMode === "ALL") {
        console.log("[videos/[id] PATCH] deleteMany (ALL)", { id, teamVideoId: id });
        await prisma.teamVideoAudience.deleteMany({ where: { teamVideoId: id } });
      } else {
        const dedup = Array.from(new Set(selectedUserIds ?? []));
        console.log("[videos/[id] PATCH] deleteMany (before createMany)", { id, teamVideoId: id, dedupLength: dedup.length });
        await prisma.teamVideoAudience.deleteMany({ where: { teamVideoId: id } });
        if (dedup.length) {
          console.log("[videos/[id] PATCH] createMany", {
            id,
            teamVideoId: id,
            dedupLength: dedup.length,
            sample: dedup.slice(0, 10),
          });
          await prisma.teamVideoAudience.createMany({
            data: dedup.map((userId) => ({ teamVideoId: id, userId })),
            skipDuplicates: true,
          });
        }
      }
    }

    const fresh = await prisma.teamVideo.findUnique({ where: { id }, select: teamVideoSelect });
    return NextResponse.json({ data: fresh ?? updated });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("videos/[id] PATCH error", error);
    return jsonError("No se pudo actualizar el video", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    assertCsrf(req);

    const id = getIdFromUrl(req);
    if (!id) return jsonError("ID inválido", 400);

    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const existing = await prisma.teamVideo.findFirst({
      where: { id, teamId: team.id },
      select: { id: true },
    });
    if (!existing) return jsonError("Video no encontrado", 404);

    await prisma.teamVideoAudience.deleteMany({ where: { teamVideoId: id } });
    await prisma.teamVideo.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("videos/[id] DELETE error", error);
    return jsonError("No se pudo borrar el video", 500);
  }
}
