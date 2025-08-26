"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = params.get("callbackUrl") || "/";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false, // manejamos redirección manual
    });

    setPending(false);

    if (!res) {
      setError("Error inesperado. Intenta de nuevo.");
      return;
    }

    if (res.error) {
      setError("Email o contraseña inválidos.");
      return;
    }

    // si no hay error, redirigimos
    if (res.url) {
      window.location.href = res.url;
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow p-6">
        <h1 className="text-2xl font-semibold mb-1">Iniciar sesión</h1>
        <p className="text-sm text-gray-500 mb-6">
          Usá tu email y contraseña.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ctbrain.local"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500">
          <p>
            ¿Olvidaste tu contraseña?{" "}
            <span className="font-medium">Contactá al admin.</span>
          </p>
          <p className="mt-2">
            Volver al{" "}
            <Link href="/" className="underline">
              inicio
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

