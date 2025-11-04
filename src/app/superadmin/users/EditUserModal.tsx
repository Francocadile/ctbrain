"use client";
import { useState } from "react";

export default function EditUserModal({ user, teams }: { user: any, teams: any[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [teamId, setTeamId] = useState(user.teamId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/superadmin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, name, email, role, teamId }),
    });
    if (res.ok) {
      setOpen(false);
      window.location.reload();
    } else {
      const data = await res.json();
      setError(data.error || "Error al editar usuario");
    }
    setLoading(false);
  };

  return (
    <>
      <button className="text-blue-600 hover:underline" onClick={() => setOpen(true)}>Editar</button>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form onSubmit={handleSave} className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] flex flex-col gap-3">
            <h2 className="text-lg font-bold mb-2">Editar usuario</h2>
            <label>
              Nombre
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="border rounded px-2 py-1 w-full" />
            </label>
            <label>
              Rol
              <select value={role} onChange={e => setRole(e.target.value)} className="border rounded px-2 py-1 w-full">
                <option value="SUPERADMIN">SUPERADMIN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="CT">CT</option>
                <option value="MEDICO">MEDICO</option>
                <option value="JUGADOR">JUGADOR</option>
                <option value="DIRECTIVO">DIRECTIVO</option>
              </select>
            </label>
            <label>
              Equipo
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className="border rounded px-2 py-1 w-full">
                <option value="">Sin equipo</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
            <div className="flex gap-2 mt-2">
              <button type="submit" disabled={loading} className="bg-green-600 text-white px-3 py-1 rounded">Guardar</button>
              <button type="button" onClick={() => setOpen(false)} className="bg-gray-300 px-3 py-1 rounded">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
