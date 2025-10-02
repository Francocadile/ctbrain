// src/app/first-login/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function roleHome(role?: string) {
  switch (role) {
    case "ADMIN": return "/admin";
    case "CT": return "/ct";
    case "MEDICO": return "/medico"; // mapping actual del proyecto
    case "JUGADOR": return "/jugador";
    case "DIRECTIVO": return "/directivo";
    default: return "/login";
  }
}

async function changePassword(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (newPassword.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }
  if (newPassword !== confirm) {
    throw new Error("Las contraseñas no coinciden.");
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hash, mustChangePassword: false },
  });

  // Redirigir al home del rol
  const home = await roleHome((session.user as any).role);
  redirect(home);
}

export default async function FirstLoginPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Si ya no requiere cambio, mandamos a su home
  if (!(session.user as any).mustChangePassword) {
    redirect(await roleHome((session.user as any).role));
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-6 py-12">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold">Cambiar contraseña</h1>
          <p className="mt-1 text-sm text-gray-600">
            Por seguridad, debés establecer una nueva contraseña antes de continuar.
          </p>

          <form action={changePassword} className="mt-6 space-y-3">
            <input
              type="password"
              name="newPassword"
              placeholder="Nueva contraseña (mín. 6)"
              className="w-full rounded-lg border px-3 py-2"
              required
              minLength={6}
            />
            <input
              type="password"
              name="confirm"
              placeholder="Repetir contraseña"
              className="w-full rounded-lg border px-3 py-2"
              required
              minLength={6}
            />

            <button
              type="submit"
              className="w-full rounded-lg border bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Guardar y continuar
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
