import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const expected = process.env.ADMIN_SETUP_TOKEN || "";

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = (process.env.DEFAULT_ADMIN_EMAIL || "").trim().toLowerCase();
  const pass  = process.env.DEFAULT_ADMIN_PASSWORD || "";

  if (!email || !pass) {
    return NextResponse.json({ error: "Missing DEFAULT_ADMIN_* envs" }, { status: 400 });
  }

  const hash = await bcrypt.hash(pass, 10);

  // Si ya existe ese email: lo promovemos/actualizamos a ADMIN aprobado.
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      isApproved: true,
      password: hash,
      name: "Administrador",
    },
    create: {
      email,
      name: "Administrador",
      role: "ADMIN",
      isApproved: true,
      password: hash,
    },
    select: { id: true, email: true, role: true, isApproved: true },
  });

  return NextResponse.json({ ok: true, admin });
}
