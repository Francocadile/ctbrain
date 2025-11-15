import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
const teamSelection = {
  id: true,
  name: true,
  slug: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

function slugify(input: string) {
  return (input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "equipo";
}

async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function handleException(err: unknown, context: string) {
  if (err instanceof Response) return err;
  console.error(`[superadmin/teams] ${context}`, err);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { prisma } = await dbScope({ req, roles: [Role.SUPERADMIN] });
    const teams = await prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      select: teamSelection,
    });
    return NextResponse.json(teams);
  } catch (err) {
    return handleException(err, "GET error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prisma } = await dbScope({ req, roles: [Role.SUPERADMIN] });
    const body = await readJson(req);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const slugInput = typeof body?.slug === "string" ? body.slug.trim() : "";

    if (!name) return errorResponse("El nombre es obligatorio");

    const nameExists = await prisma.team.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (nameExists) return errorResponse("Ya existe un equipo con ese nombre", 409);

    const slug = slugify(slugInput || name);
    const slugExists = await prisma.team.findUnique({ where: { slug }, select: { id: true } });
    if (slugExists) return errorResponse("Ya existe un equipo con ese slug", 409);

    const team = await prisma.team.create({
      data: { name, slug, isActive: true },
      select: teamSelection,
    });

    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    return handleException(err, "POST error");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { prisma } = await dbScope({ req, roles: [Role.SUPERADMIN] });
    const body = await readJson(req);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) return errorResponse("ID requerido");

    const data: Record<string, any> = {};

    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return errorResponse("El nombre es obligatorio");
      data.name = name;
      const duplicate = await prisma.team.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true },
      });
      if (duplicate) return errorResponse("Ya existe un equipo con ese nombre", 409);
    }

    if ("slug" in body) {
      const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";
      if (!slugRaw) return errorResponse("El slug es obligatorio");
      const slug = slugify(slugRaw);
      data.slug = slug;
      const duplicateSlug = await prisma.team.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
      });
      if (duplicateSlug) return errorResponse("Ya existe un equipo con ese slug", 409);
    }

    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") {
        return errorResponse("isActive debe ser booleano");
      }
      data.isActive = body.isActive;
    }

    if (!Object.keys(data).length) return errorResponse("No hay cambios para aplicar");

    const team = await prisma.team.update({
      where: { id },
      data,
      select: teamSelection,
    });

    return NextResponse.json(team);
  } catch (err) {
    if ((err as any)?.code === "P2025") {
      return errorResponse("Equipo no encontrado", 404);
    }
    return handleException(err, "PATCH error");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { prisma } = await dbScope({ req, roles: [Role.SUPERADMIN] });
    const body = await readJson(req);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) return errorResponse("ID requerido");

    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as any)?.code === "P2025") {
      return errorResponse("Equipo no encontrado", 404);
    }
    return handleException(err, "DELETE error");
  }
}
