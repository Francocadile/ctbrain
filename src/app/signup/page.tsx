// src/app/signup/page.tsx
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-6 py-12">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Alta deshabilitada</h1>
          <p className="mt-2 text-sm text-gray-600">
            El alta pública de cuentas nuevas está deshabilitada.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Si necesitás acceso, pedilo a un <b>Admin</b> o al cuerpo técnico de tu equipo.
          </p>
          <div className="mt-6">
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Volver al login
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
