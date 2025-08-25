import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getAdminToken(request: Request) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { token };
}

const PatchSchema = z.object({
  role: z.enum(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"]).optional(),
  name: z.string().min(1).max(80).optional(),
});

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { token, error } = await getAdminToken(req);
  if (error) return error;

  // evitar que el admin se borre a sí mismo
  if (token?.sub === params.id) {
    return NextResponse.json({ error: "No podés borrarte a vos mismo." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo borrar" }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { token, error } = await getAdminToken(req);
  if (error) return error;

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  // no permitir que el admin se saque el rol a sí mismo
  if (token?.sub === params.id && parsed.data.role && parsed.data.role !== "ADMIN") {
    return NextResponse.json({ error: "No podés cambiar tu propio rol a no-admin." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 400 });
  }
}
