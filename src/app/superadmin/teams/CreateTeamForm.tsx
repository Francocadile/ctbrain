

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    // Validación básica
    if (!name.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
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
        body: JSON.stringify({ name, adminName, adminEmail, adminPassword }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setSuccess("Equipo y admin creados correctamente");
        setName("");
        setAdminName("");
        setAdminEmail("");
        setAdminPassword("");
        router.refresh();
      } else if (res.status === 409) {
        setError(data.error || "Ya existe un equipo o usuario con ese nombre/email");
      } else {
        setError(data.error ? `${res.status}: ${data.error}` : `Error ${res.status}`);
      }
    } catch (err) {
      setError("Error de red o inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="bg-white rounded-lg shadow p-6 mb-6 flex flex-col gap-4" onSubmit={handleSubmit}>
      <h2 className="text-lg font-bold mb-2">Crear nuevo equipo</h2>
      {success && <div className="text-green-600 font-semibold mb-2">{success}</div>}
      {error && <div className="text-red-600 font-semibold mb-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del equipo</label>
          <input type="text" className="input input-bordered w-full" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del equipo" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del admin</label>
          <input type="text" className="input input-bordered w-full" value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Nombre del admin" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email del admin</label>
          <input type="email" className="input input-bordered w-full" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="Email del admin" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña del admin</label>
          <input type="password" className="input input-bordered w-full" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Contraseña" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary mt-4" disabled={loading}>{loading ? "Creando..." : "Crear equipo"}</button>
    </form>
  );
}

