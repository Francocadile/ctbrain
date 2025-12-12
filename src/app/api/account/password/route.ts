import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { dbScope } from "@/lib/dbScope";

// POST /api/account/password
// Cambia la contraseña del usuario autenticado validando la contraseña actual.
export async function POST(req: Request) {
  try {
    const { prisma, user } = await dbScope({ req });

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });

    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json(
        { error: "Usuario sin credenciales locales. Contactá al administrador." },
        { status: 400 },
      );
    }

    const ok = await bcryptjs.compare(currentPassword, dbUser.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
    }

    const newHash = await bcryptjs.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: newHash, passwordChangedAt: new Date() },
    });

    return NextResponse.json({ ok: true, requiresLogout: true });
  } catch (e: any) {
    console.error("POST /api/account/password error", e);
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
