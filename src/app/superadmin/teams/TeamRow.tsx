"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeamRow({ team }: { team: { id: string; name: string } }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const router = useRouter();

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/superadmin/api/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id, name }),
    });
    if (res.ok) {
      setEditing(false);
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
    const res = await fetch("/superadmin/api/teams", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al eliminar equipo");
    }
    setLoading(false);
  };

  return (
    <tr className="border-t">
      <td className="px-4 py-2">
        {editing ? (
          <form onSubmit={handleEdit} className="flex gap-2 items-center">
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1" />
            <button type="submit" disabled={loading || !name} className="bg-green-600 text-white px-2 py-1 rounded">Guardar</button>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-500 px-2 py-1">Cancelar</button>
          </form>
        ) : (
          <span>{team.name}</span>
        )}
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
      <td className="px-4 py-2 text-xs text-gray-500">{team.id}</td>
      <td className="px-4 py-2">
        {!editing && (
          <>
            <button onClick={() => setEditing(true)} className="text-blue-600 hover:underline mr-2">Editar</button>
            <button onClick={handleDelete} className="text-red-600 hover:underline">Eliminar</button>
          </>
        )}
      </td>
    </tr>
  );
}
