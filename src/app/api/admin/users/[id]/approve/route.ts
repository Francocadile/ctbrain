import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { isApproved } = await req.json().catch(() => ({}));
  if (typeof isApproved !== "boolean") {
    return NextResponse.json({ error: "isApproved (boolean) requerido" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { isApproved },
    select: { id: true, email: true, name: true, role: true, isApproved: true },
  });

  return NextResponse.json({ ok: true, data: user });
}

// Soporte para formulario HTML que usa POST desde la UI server component
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Para el formulario de /admin/users/pending no enviamos body; asumimos aprobar.
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { isApproved: true },
    select: { id: true, email: true, name: true, role: true, isApproved: true },
  });

  // Redirigimos de vuelta a la lista de pendientes
  return NextResponse.redirect(new URL("/admin/users/pending", req.url));
}
