"use client";

import { signOut, useSession } from "next-auth/react";

export default function TopRightLogout() {
  const { status } = useSession();

  if (status !== "authenticated") return null;

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="fixed right-4 top-4 rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
      aria-label="Cerrar sesión"
    >
      Salir
    </button>
  );
}
