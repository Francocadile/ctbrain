// src/app/redirect/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function RedirectPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session) {
    redirect("/login");
  }

  const map: Record<string, string> = {
    ADMIN: "/admin",
    CT: "/ct",
    MEDICO: "/medico",
    JUGADOR: "/jugador",
    DIRECTIVO: "/directivo",
  };

  redirect(map[role as string] ?? "/login");
}
