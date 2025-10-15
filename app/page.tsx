import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role === "SUPERADMIN") {
    redirect("/superadmin");
  }

  const teamId = (session.user as any).teamId as string | null;
  if (!teamId) {
    redirect("/select-team");
  }

  const role = (session.user as any).role as string;
  const map: Record<string, string> = {
    ADMIN: "/admin",
    CT: "/ct",
    MEDICO: "/medico",
    JUGADOR: "/jugador",
    DIRECTIVO: "/directivo",
  };

  redirect(map[role] ?? "/login");
}
