"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: true
    });
    // si redirect: true, NextAuth maneja navegación; si falla no hay resuse
    setLoading(false);
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-brand-700/40 p-6 shadow-aura">
      <h1 className="mb-4 text-2xl font-semibold">Iniciar sesión</h1>
      {err && <div className="mb-3 rounded bg-red-500/10 p-2 text-sm text-red-300">{err}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/80">Email</label>
          <input
            type="email"
            className="w-full rounded border border-white/10 bg-black/40 p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tu@correo.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Contraseña</label>
          <input
            type="password"
            className="w-full rounded border border-white/10 bg-black/40 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-brand-500 px-4 py-2 font-medium hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-white/60">
        Serás redirigido a tu panel según tu rol.
      </p>
    </div>
  );
}
