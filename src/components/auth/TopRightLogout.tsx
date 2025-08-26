"use client";

import { useSession, signOut } from "next-auth/react";

export default function TopRightLogout() {
  const { data } = useSession();

  if (!data?.user) return null;

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="fixed top-4 right-4 rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
      aria-label="Cerrar sesión"
    >
      Cerrar sesión
    </button>
  );
}
