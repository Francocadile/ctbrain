"use client";

import { signOut, useSession } from "next-auth/react";

type TopRightLogoutProps = {
  className?: string;
};

export default function TopRightLogout({ className = "" }: TopRightLogoutProps) {
  const { status } = useSession();

  if (status !== "authenticated") return null;

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={`rounded-md border px-3 py-1 text-sm hover:bg-gray-50 ${className}`}
      aria-label="Cerrar sesión"
    >
      Salir
    </button>
  );
}
