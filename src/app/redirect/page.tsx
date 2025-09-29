// Server Component
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

function roleHome(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CT":
      return "/ct";
    case "MEDICO":
      return "/medico";
    case "JUGADOR":
      return "/jugador";   // 👈 usamos /jugador (coincide con tus rutas)
    case "DIRECTIVO":
      return "/directivo";
    default:
      return "/";
  }
}

export default async function RedirectByRolePage() {
  const session = await getServerSession(authOptions);

  // Si no hay sesión, volver al login
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as any)?.role as string | undefined;

  // Nota futura: si luego agregás `approved` en el token/usuario,
  // acá podrías hacer:
  // if (approved === false) redirect("/pending-approval");

  redirect(roleHome(role));
}
