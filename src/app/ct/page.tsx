// src/app/ct/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Dashboard de CT: redirige siempre al Editor de Semana
export default async function CTIndex() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  // Editor como página principal (sin header)
  redirect("/ct/plan-semanal?hideHeader=1");
}
