// src/app/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Si ya está logueado, mandamos al router por rol
  if (session?.user?.id) {
    redirect("/redirect");
  }

  // Si no, al login único
  redirect("/login");
}
