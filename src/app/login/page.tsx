// src/app/login/page.tsx
"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { routeForRole } from "@/lib/roles";

export default function LoginPage() {
  const { status, data } = useSession();
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Si ya está logueado, lo llevo a su panel.
  useEffect(() => {
    if (status === "authenticated") {
      const role = (data?.user as any)?.role as string | undefined;
      const cb = search.get("callbackUrl");
      router.replace(cb || routeForRole(role));
    }
  }, [status, data, router, search]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password: pw,
        callbackUrl: search.get("callbackUrl") || "/",
      });

      if (res?.error) {
        setErr(res.error === "CredentialsSignin" ? "Email o contraseña inválidos." : res.error);
        return;
      }
      // el redirect lo maneja el useEffect al detectar sesión
      router.refresh();
    } finally {
      setSubmitting(false);
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
            disabled={submitting}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${
              submitting ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
            }`}
          >
            {submitting ? "Ingresando…" : "Ingresar"}
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
