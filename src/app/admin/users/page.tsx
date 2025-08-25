"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const myEmail = session?.user?.email ?? "";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("JUGADOR");
  const [password, setPassword] = useState("");

  async function fetchUsers() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) throw new Error("Error al listar");
      const data = await res.json();
      setUsers(data.users);
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo crear");
      setEmail("");
      setName("");
      setRole("JUGADOR");
      setPassword("");
      await fetchUsers();
      alert("Usuario creado ✓");
    } catch (e: any) {
      setErr(e.message || "Error al crear");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar usuario? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "No se pudo borrar");
      return;
    }
    await fetchUsers();
  }

  async function onChangeRole(id: string, newRole: Role) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "No se pudo actualizar el rol");
      return;
    }
    await fetchUsers();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Usuarios</h2>
        <p className="text-sm text-white/70">Alta rápida y listado (solo Admin)</p>
      </div>

      {/* Alta */}
      <form onSubmit={onCreate} className="space-y-3 rounded-xl border border-white/10 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-white/60 mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border border-white/10 bg-black/30 p-2"
              placeholder="Nombre y apellido"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-white/10 bg-black/30 p-2"
              placeholder="persona@club.com"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded border border-white/10 bg-black/30 p-2"
            >
              <option value="ADMIN">Admin</option>
              <option value="CT">Cuerpo Técnico</option>
              <option value="MEDICO">Cuerpo Médico</option>
              <option value="JUGADOR">Jugador</option>
              <option value="DIRECTIVO">Directivo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Contraseña (mín. 6)</label>
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-white/10 bg-black/30 p-2"
              placeholder="••••••"
            />
          </div>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            className="rounded-2xl bg-brand-500 px-4 py-2 text-sm font-medium hover:bg-brand-600"
          >
            Crear usuario
          </button>
          {err && <span className="ml-3 text-sm text-red-300">{err}</span>}
        </div>
      </form>

      {/* Lista */}
      <div className="rounded-xl border border-white/10">
        <div className="grid grid-cols-6 gap-2 border-b border-white/10 p-3 text-xs text-white/60">
          <div>Nombre</div>
          <div>Email</div>
          <div>Rol</div>
          <div>Creado</div>
          <div className="col-span-2">Acciones</div>
        </div>
        {loading ? (
          <div className="p-4 text-white/70">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-white/70">Sin usuarios</div>
        ) : (
          users.map((u) => {
            const isMe = myEmail && u.email === myEmail;
            return (
              <div key={u.id} className="grid grid-cols-6 gap-2 border-t border-white/5 p-3 text-sm">
                <div>{u.name}</div>
                <div className="text-white/80">{u.email}</div>
                <div>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs">{u.role}</span>
                </div>
                <div className="text-white/60">
                  {new Date(u.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    defaultValue={u.role}
                    onChange={(e) => onChangeRole(u.id, e.target.value as Role)}
                    disabled={isMe}
                    className="rounded border border-white/10 bg-black/30 px-2 py-1 text-xs disabled:opacity-50"
                    title={isMe ? "No podés cambiar tu propio rol" : "Cambiar rol"}
                  >
                    {(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"] as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => onDelete(u.id)}
                    disabled={isMe}
                    className="rounded-2xl border border-red-600/40 px-3 py-1 text-xs text-red-300 hover:bg-red-600/10 disabled:opacity-50"
                    title={isMe ? "No podés borrarte a vos mismo" : "Eliminar"}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
