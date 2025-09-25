// src/app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { routeForRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

type MeResponse = { ok: boolean; user?: { role?: string | null } };
type LoginResponse = { ok?: boolean; redirectTo?: string; role?: string };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Si ya está logueado, mandalo directo a su panel
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const j = (await r.json().catch(() => ({}))) as MeResponse;
        const role = j?.user?.role || undefined;
        if (j?.ok && role) window.location.href = routeForRole(role);
      } catch {}
    })();
  }, []);

  function getCallbackUrl(): string | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const cb = params.get("callbackUrl");
      return cb && cb.startsWith("/") ? cb : null; // sanitiza
    } catch {
      return null;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Credenciales inválidas");
      }

      const data = (await res.json().catch(() => ({}))) as LoginResponse;
      const cb = getCallbackUrl();
      const next =
        cb ||
        data?.redirectTo ||
        (data?.role ? routeForRole(data.role) : "/ct");

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
