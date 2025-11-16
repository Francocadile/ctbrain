import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import { isVideoType, listTeamVideos, teamVideoSelect } from "@/lib/videos";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
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
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
    const typeInput = typeof payload.type === "string" ? payload.type.trim() : "";

    if (!title) return jsonError("El título es obligatorio");
    if (!url) return jsonError("La URL es obligatoria");
    if (!isVideoType(typeInput)) return jsonError("Tipo de video inválido");

    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const created = await prisma.teamVideo.create({
      data: {
        teamId: team.id,
        title,
        url,
        type: typeInput,
        notes: notes || null,
      },
      select: teamVideoSelect,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
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
