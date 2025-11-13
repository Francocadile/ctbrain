"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserRow({ user }: { user: any }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [teamId, setTeamId] = useState(user.teamId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const router = useRouter();

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/superadmin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, name, email, role, teamId }),
    });
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al editar usuario");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/superadmin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al eliminar usuario");
    }
    setLoading(false);
  };

  return (
    <tr className="border-t">
      <td className="px-4 py-2">
        {editing ? (
          <form onSubmit={handleEdit} className="flex gap-2 items-center">
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="border rounded px-2 py-1" />
            <select value={role} onChange={e => setRole(e.target.value)} className="border rounded px-2 py-1">
              <option value="SUPERADMIN">Superadmin</option>
              <option value="ADMIN">Admin</option>
              <option value="CT">CT</option>
              <option value="MEDICO">Médico</option>
              <option value="JUGADOR">Jugador</option>
              <option value="DIRECTIVO">Directivo</option>
            </select>
            <input type="text" value={teamId} onChange={e => setTeamId(e.target.value)} className="border rounded px-2 py-1" placeholder="ID equipo" />
            <button type="submit" disabled={loading || !email} className="bg-green-600 text-white px-2 py-1 rounded">Guardar</button>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-500 px-2 py-1">Cancelar</button>
          </form>
        ) : (
          <span>{user.name}</span>
        )}
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
      <td className="px-4 py-2 text-xs text-gray-500">{user.email}</td>
      <td className="px-4 py-2 text-xs text-gray-500">{user.role}</td>
      <td className="px-4 py-2 text-xs text-gray-500">{user.teamId || "Sin equipo"}</td>
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
