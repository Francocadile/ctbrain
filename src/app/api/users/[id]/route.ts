import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin(request: Request) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// PATCH → cambiar rol
const UpdateRoleSchema = z.object({
  role: z.enum(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = UpdateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role: parsed.data.role },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ ok: true, user });
}

// DELETE → eliminar usuario
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Usuario no encontrado o no se pudo eliminar" },
      { status: 404 }
    );
  }
}
