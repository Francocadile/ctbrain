// src/components/auth/TopRightLogout.tsx
"use client";

import { signOut } from "next-auth/react";

export default function TopRightLogout() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
      Logout
    </button>
  );
}
