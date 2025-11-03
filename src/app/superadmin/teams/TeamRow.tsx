"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeamRow({ team }: { team: { id: string; name: string } }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const router = useRouter();

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/superadmin/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id, name }),
    });
    if (res.ok) {
      setSuccess("Equipo actualizado");
      setEditing(false);
      setTimeout(() => setSuccess(null), 2000);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al editar equipo");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar este equipo?")) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/superadmin/teams", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id }),
    });
    if (res.ok) {
      setSuccess("Equipo eliminado");
      setTimeout(() => setSuccess(null), 2000);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al eliminar equipo");
    }
    setLoading(false);
  };

  return (
    <tr className="border-t group hover:bg-blue-50 transition">
      <td className="px-4 py-2 min-w-[180px]">
        {editing ? (
          <form onSubmit={handleEdit} className="flex gap-2 items-center">
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={loading || !name} className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition flex items-center">
              {loading ? <span className="loader mr-2" /> : null} Guardar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-500 px-2 py-1 hover:underline">Cancelar</button>
          </form>
        ) : (
          <span className="font-medium text-gray-800">{team.name}</span>
        )}
        {error && <div className="text-xs text-red-600 mt-1 font-semibold">{error}</div>}
        {success && <div className="text-xs text-green-600 mt-1 font-semibold">{success}</div>}
      </td>
      <td className="px-4 py-2 text-xs text-gray-500 font-mono">{team.id}</td>
      <td className="px-4 py-2">
        {!editing && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="text-blue-600 hover:underline font-semibold">Editar</button>
            <button onClick={handleDelete} className="text-red-600 hover:underline font-semibold">Eliminar</button>
          </div>
        )}
      </td>
    </tr>
  );
}
