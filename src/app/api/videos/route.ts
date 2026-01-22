import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import { isVideoType, listTeamVideos, teamVideoSelect } from "@/lib/videos";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    // Mantener comportamiento actual para CT/ADMIN/DIRECTIVO.
    // Para Jugador, listTeamVideos aplica filtro por audiencia.
    const videos = await listTeamVideos({ req });
    return NextResponse.json({ data: videos });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("videos GET error", error);
    return jsonError("No se pudieron obtener los videos", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
    const typeInput = typeof payload.type === "string" ? payload.type.trim() : "";
    const visibleToDirectivo =
      typeof payload.visibleToDirectivo === "boolean" ? payload.visibleToDirectivo : true;
    const audienceModeInput = typeof payload.audienceMode === "string" ? payload.audienceMode.trim() : "ALL";
    const selectedUserIds = Array.isArray(payload.selectedUserIds)
      ? (payload.selectedUserIds.filter((v) => typeof v === "string") as string[])
      : [];

    if (!title) return jsonError("El título es obligatorio");
    if (!url) return jsonError("La URL es obligatoria");
    if (!isVideoType(typeInput)) return jsonError("Tipo de video inválido");

  type AudienceMode = (typeof import("@prisma/client").TeamVideoAudienceMode)[keyof typeof import("@prisma/client").TeamVideoAudienceMode];
  const audienceMode: AudienceMode = audienceModeInput === "SELECTED" ? "SELECTED" : "ALL";
    if (audienceMode === "SELECTED" && selectedUserIds.length === 0) {
      return jsonError("Seleccioná al menos 1 jugador para audiencia SELECTED");
    }

    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const data = {
      team: { connect: { id: team.id } },
      title,
      url,
      type: typeInput,
      notes: notes || null,
      visibleToDirectivo,
      audienceMode,
      ...(audienceMode === "SELECTED"
        ? {
            audience: {
              create: Array.from(new Set(selectedUserIds)).map((userId) => ({
                userId,
              })),
            },
          }
        : {}),
    } satisfies Prisma.TeamVideoCreateInput;

    const created = await prisma.teamVideo.create({
      data,
      select: teamVideoSelect,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("videos POST error", error);
    return jsonError("No se pudo crear el video", 500);
  }
}

export function DELETE() {
  return jsonError("No implementado", 405);
}

export function PATCH() {
  return jsonError("No implementado", 405);
}
