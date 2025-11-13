

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";


export default function CreateTeamForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError("Todos los campos son obligatorios");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(adminEmail)) {
      setError("El email no es válido");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, adminName: name, adminEmail, adminPassword }),
      });
      if (res.status === 201) {
        setName("");
        setAdminEmail("");
        setAdminPassword("");
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || `Error ${res.status}`);
      }
    } catch {
      setError("Error de red o inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="text-sm font-medium">Nombre del equipo</label>
      <input
        type="text"
        className="border rounded-lg px-4 py-3 text-base"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre del equipo"
        autoFocus
      />
      <label className="text-sm font-medium">Email del admin</label>
      <input
        type="email"
        className="border rounded-lg px-4 py-3 text-base"
        value={adminEmail}
        onChange={e => setAdminEmail(e.target.value)}
        placeholder="Email del admin"
      />
      <label className="text-sm font-medium">Contraseña del admin</label>
      <input
        type="password"
        className="border rounded-lg px-4 py-3 text-base"
        value={adminPassword}
        onChange={e => setAdminPassword(e.target.value)}
        placeholder="Contraseña"
      />
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      <button
        type="submit"
        className="bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold mt-2 hover:bg-blue-700 transition"
        disabled={loading}
      >
        {loading ? "Creando equipo..." : "Crear equipo"}
      </button>
    </form>
  );
}

