// src/app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { routeForRole } from "@/lib/roles";

export default function LoginPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string | undefined>(undefined);

  // Lee callbackUrl sin useSearchParams (evita el error de Suspense en build)
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const c = u.searchParams.get("callbackUrl") || undefined;
      setCallbackUrl(c);
    } catch {}
  }, []);

  // Ya logueado → redirigir a su panel
  useEffect(() => {
    const role = (session?.user as any)?.role as string | undefined;
    if (role) {
      window.location.href = callbackUrl || routeForRole(role);
    }
  }, [session, callbackUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password: pw,
      redirect: false,
      callbackUrl: callbackUrl || "/",
    });

    setLoading(false);

    if (!res) {
      setErr("No se pudo conectar con el servidor.");
      return;
    }
    if (res.ok) {
      window.location.href = res.url || "/";
      return;
    }
    // NextAuth pone detalle en res.error
    setErr(res.error || "Credenciales inválidas");
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
