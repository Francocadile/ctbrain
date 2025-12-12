"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserForm({ teams }: { teams: any[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("JUGADOR");
  const [teamId, setTeamId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/superadmin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CT-CSRF": "1",
      },
      body: JSON.stringify({ name, email, role, teamId, password }),
    });
    if (res.ok) {
      setMsg("Usuario creado correctamente");
      setName(""); setEmail(""); setRole("JUGADOR"); setTeamId(""); setPassword("");
      router.refresh();
    } else {
      const data = await res.json();
      setMsg(data.error || "Error al crear usuario");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2 items-end">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Rol</label>
        <select value={role} onChange={e => setRole(e.target.value)} className="border rounded px-2 py-1">
          <option value="SUPERADMIN">Superadmin</option>
          <option value="ADMIN">Admin</option>
          <option value="CT">CT</option>
          <option value="MEDICO">Médico</option>
          <option value="JUGADOR">Jugador</option>
          <option value="DIRECTIVO">Directivo</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Equipo</label>
        <select value={teamId} onChange={e => setTeamId(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Sin equipo</option>
          {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="border rounded px-2 py-1" />
      </div>
      <button type="submit" disabled={loading || !email || !password} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
        {loading ? "Creando..." : "Crear usuario"}
      </button>
      {msg && <span className="ml-4 text-sm text-gray-600">{msg}</span>}
    </form>
  );
}
