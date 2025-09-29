// Server Component
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

function homeFor(role?: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CT":
      return "/ct";
    case "MEDICO":
      return "/medico";
    case "JUGADOR":
      return "/jugador";
    case "DIRECTIVO":
      return "/directivo";
    default:
      return "/";
  }
}

export default async function RedirectByRolePage() {
  const session = await getServerSession(authOptions);

  // No logueado → login
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as any).role as Role | undefined;
  const isApproved = Boolean((session.user as any).isApproved);

  // Si no está aprobado (y no es admin), a "pendiente de aprobación"
  if (!isApproved && role !== "ADMIN") {
    redirect("/pending-approval");
  }

  // Enviar al home de su rol
  redirect(homeFor(role));
}
