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
