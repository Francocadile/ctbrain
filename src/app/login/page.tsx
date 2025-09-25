// src/app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { routeForRole } from "@/lib/roles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Si ya está logueado, mandalo directo a su panel
  useEffect(() => {
    (async () => {
      try {
        const s = await getSession();
        const role = (s?.user as any)?.role as string | undefined;
        if (role) window.location.href = routeForRole(role);
      } catch {}
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password: pw,
        redirect: false, // manejamos el redirect acá
      });

      if (!res || !res.ok) {
        throw new Error("Credenciales inválidas");
      }

      // Recuperamos la session para conocer el rol y redirigir
      const s = await getSession();
      const role = (s?.user as any)?.role as string | undefined;
      const next = role ? routeForRole(role) : "/ct";
      window.location.href = next;
    } catch (e: any) {
      setErr(e?.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Iniciar sesión</h1>
        <p className="text-gray-600 mt-1">Accedé con tu email y contraseña.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div className="space-y-1">
            <label className="text-[12px] text-gray-500">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="tu@club.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] text-gray-500">Contraseña</label>
            <input
              type="password"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${
              loading
                ? "bg-gray-200 text-gray-500"
                : "bg-black text-white hover:opacity-90"
            }`}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          ¿Sos jugador y no tenés cuenta?{" "}
          <Link href="/jugador/registro" className="underline">
            Crear usuario
          </Link>
        </div>
      </div>
    </div>
  );
}
