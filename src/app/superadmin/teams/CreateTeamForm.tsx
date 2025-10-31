"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTeamForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/superadmin/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setMsg("Equipo creado correctamente");
      setName("");
      setTimeout(() => setMsg(null), 2000);
      router.refresh();
    } else {
      const data = await res.json();
      setMsg(data.error || "Error al crear equipo");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2 items-end">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre del equipo</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="border rounded px-2 py-1" placeholder="Ej: Club Atlético Demo" />
      </div>
      <button type="submit" disabled={loading || !name} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
        {loading ? "Creando..." : "Crear equipo"}
      </button>
      {msg && <span className="ml-4 text-sm text-gray-600">{msg}</span>}
    </form>
  );
}
