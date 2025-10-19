"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginClient() {
  const [email, setEmail] = useState("superadmin@ctbrain.app");
  const [password, setPassword] = useState("ChangeMeNow!2025");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/admin";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email: email.trim().toLowerCase(),
      password,
    });

    if (!res || res.error) {
      setError("Email o contraseña inválidos.");
      return;
    }

    startTransition(() => {
      router.push(from);
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Card: Login */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header>
            <h1 className="text-2xl font-bold">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-gray-600">
              Accedé con tu email y contraseña.
            </p>
          </header>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contraseña</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {/* CTA a signup */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">¿No tenés cuenta?</p>
            <a
              href="/signup"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              title="Crear una cuenta"
            >
              Crear una cuenta
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
