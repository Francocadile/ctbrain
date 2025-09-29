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

  // ⛳️ SOFT-GUARD de aprobación:
  // Si la propiedad no existe aún en la sesión/DB, asumimos aprobado (true).
  const isApprovedRaw = (session.user as any).isApproved;
  const isApproved =
    typeof isApprovedRaw === "boolean" ? isApprovedRaw : true;

  // (Opcional) Si en algún momento querés forzar el uso del gate,
  // podés setear NEXT_PUBLIC_REQUIRE_APPROVAL="1" y entonces
  // los no aprobados (salvo ADMIN) irán a /pending-approval.
  const requireApproval =
    process.env.NEXT_PUBLIC_REQUIRE_APPROVAL === "1";

  if (requireApproval && !isApproved && role !== "ADMIN") {
    redirect("/pending-approval");
  }

  // Enviar al home de su rol
  redirect(homeFor(role));
}
