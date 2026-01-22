// src/app/jugador/layout.tsx
"use client";

import Link from "next/link";

export default function JugadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
          <Link href="/jugador" className="font-semibold">Jugador — Panel</Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/jugador/videos"
              className="text-sm rounded-lg border px-2 py-1 hover:bg-gray-50"
            >
              Videos
            </Link>
            <a
              href="/api/auth/signout?callbackUrl=/jugador"
              className="text-sm rounded-lg border px-2 py-1 hover:bg-gray-50"
            >
              Salir
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
