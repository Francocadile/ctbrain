import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin(request: Request) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return token as any; // devolvemos el token usable
}

const UpdateRoleSchema = z.object({
  role: z.enum(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"]),
});

// PATCH → cambiar rol (prohibido sobre sí mismo)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const token = await requireAdmin(request);
  if (token instanceof NextResponse) return token;

  const meId = (token.sub as string | undefined) ?? null;
  const meEmail = (token.email as string | undefined) ?? null;

  let myUserId: string | null = meId;
  if (!myUserId && meEmail) {
    const me = await prisma.user.findUnique({
      where: { email: meEmail },
      select: { id: true },
    });
    myUserId = me?.id ?? null; // ✅ fijamos null si es undefined
  }

  if (myUserId && params.id === myUserId) {
    return NextResponse.json(
      { error: "No podés cambiar tu propio rol." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = UpdateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role: parsed.data.role },
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
}

// DELETE → eliminar usuario (prohibido sobre sí mismo)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const token = await requireAdmin(request);
  if (token instanceof NextResponse) return token;

  const meId = (token.sub as string | undefined) ?? null;
  const meEmail = (token.email as string | undefined) ?? null;

  let myUserId: string | null = meId;
  if (!myUserId && meEmail) {
    const me = await prisma.user.findUnique({
      where: { email: meEmail },
      select: { id: true },
    });
    myUserId = me?.id ?? null; // ✅ fijamos null si es undefined
  }

  if (myUserId && params.id === myUserId) {
    return NextResponse.json(
      { error: "No podés eliminar tu propia cuenta." },
      { status: 400 }
    );
  }

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
