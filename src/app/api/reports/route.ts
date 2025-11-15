import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import { isReportType, listReportsForTeam, reportSelect } from "@/lib/reports";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const reports = await listReportsForTeam({ req });
    return NextResponse.json({ data: reports });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("reports GET error", error);
    return jsonError("Error al listar informes", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const typeRaw = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";

    if (!title) return jsonError("El título es obligatorio");
    if (!content) return jsonError("El contenido es obligatorio");
    if (!isReportType(typeRaw)) return jsonError("Tipo de informe inválido");

    const { prisma, team, user } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const created = await prisma.report.create({
      data: {
        teamId: team.id,
        title,
        summary: summary || null,
        content,
        type: typeRaw,
        authorId: user.id,
      },
      select: reportSelect,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("reports POST error", error);
    return jsonError("No se pudo crear el informe", 500);
  }
}

export function PATCH() {
  return jsonError("No implementado", 405);
}

export function DELETE() {
  return jsonError("No implementado", 405);
}
