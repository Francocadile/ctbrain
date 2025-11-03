"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTeamForm() {
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/superadmin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, adminEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      setMsg(`Equipo y ADMIN creados correctamente.\nEmail: ${adminEmail}\nContraseña: ${data.adminPassword}`);
      setName("");
      setAdminEmail("");
      // No ocultar el mensaje automáticamente para que el SUPERADMIN pueda copiar la contraseña
      router.refresh();
    } else {
      const data = await res.json();
      setMsg(data.error || "Error al crear equipo");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre del equipo</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="border rounded px-2 py-1" placeholder="Ej: Club Atlético Demo" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email del ADMIN responsable</label>
        <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required className="border rounded px-2 py-1" placeholder="admin@club.com" />
      </div>
      <button type="submit" disabled={loading || !name || !adminEmail} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
        {loading ? "Creando..." : "Crear equipo y ADMIN"}
      </button>
      {msg && (
        <pre className="ml-4 text-sm text-green-700 whitespace-pre-line bg-green-50 p-2 rounded border border-green-200 max-w-xl">{msg}</pre>
      )}
    </form>
  );
}
