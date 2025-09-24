// src/app/jugador/registro/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegistroJugadorPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/jugador/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pw }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Error"));
      setMsg("Cuenta creada. Revisá tu email o iniciá sesión.");
    } catch (e: any) {
      setErr(e?.message || "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Crear usuario (Jugador)</h1>
        <p className="text-gray-600 mt-1">
          Si ya tenés cuenta, <Link href="/login" className="underline">iniciá sesión</Link>.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="text-[12px] text-gray-500">Nombre</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Email</label>
            <input
              type="email"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Contraseña</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}
          {msg && <div className="text-sm text-emerald-700">{msg}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
              loading
                ? "bg-gray-200 text-gray-500"
                : "bg-black text-white hover:opacity-90"
            }`}
          >
            {loading ? "Creando…" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
