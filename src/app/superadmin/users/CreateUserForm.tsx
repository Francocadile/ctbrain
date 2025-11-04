"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function CreateUserForm({ teams }: { teams: any[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("JUGADOR");
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/superadmin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, teamId }),
    });
    if (res.ok) {
      setMsg("Usuario creado correctamente");
      setName("");
      setEmail("");
      setPassword("");
  setRole("JUGADOR");
  setTeamId("");
      router.refresh();
    } else {
      const data = await res.json();
      setMsg(data.error || "Error al crear usuario");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="border rounded px-2 py-1" placeholder="Nombre" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded px-2 py-1" placeholder="Email" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="border rounded px-2 py-1" placeholder="Contraseña" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Rol</label>
        <select value={role} onChange={e => setRole(e.target.value)} className="border rounded px-2 py-1">
          <option value="SUPERADMIN">SUPERADMIN</option>
          <option value="ADMIN">ADMIN</option>
          <option value="CT">CT</option>
          <option value="MEDICO">MEDICO</option>
          <option value="JUGADOR">JUGADOR</option>
          <option value="DIRECTIVO">DIRECTIVO</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Equipo</label>
        <select value={teamId} onChange={e => setTeamId(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Sin equipo</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={loading || !name || !email || !password || !teamId} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
        {loading ? "Creando..." : "Crear usuario"}
      </button>
      {msg && <span className="ml-4 text-sm text-gray-600">{msg}</span>}
    </form>
  );
}
