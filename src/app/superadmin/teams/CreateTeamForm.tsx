
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTeamForm() {
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const [fieldError, setFieldError] = useState<string|null>(null);
  const router = useRouter();

  const validate = () => {
    if (!name.trim()) return "El nombre del equipo es obligatorio.";
    if (!adminName.trim()) return "El nombre del admin es obligatorio.";
    if (!adminEmail.trim()) return "El email del admin es obligatorio.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) return "El email no es válido.";
    if (!adminPassword.trim()) return "La contraseña del admin es obligatoria.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setFieldError(null);
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim().toLowerCase(),
          adminPassword: adminPassword.trim(),
        }),
      });
      if (res.status === 201) {
        setMsg("Equipo y admin creados correctamente.");
        setName("");
        setAdminName("");
        setAdminEmail("");
        setAdminPassword("");
        router.refresh();
      } else if (res.status === 409) {
        const data = await res.json();
        setMsg(data.error || "Ya existe un equipo o usuario con esos datos.");
      } else {
        let detail = "";
        try {
          const data = await res.json();
          if (data?.error) detail = ` (${data.error})`;
        } catch {}
        setMsg(`Error (${res.status})${detail}`);
      }
    } catch (err) {
      setMsg("Error de red o inesperado.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-4 p-4 border rounded bg-white max-w-xl">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre del equipo</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Ej: Club Atlético Demo" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Nombre del admin</label>
        <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Ej: Juan Pérez" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email del admin</label>
        <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="admin@email.com" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contraseña del admin</label>
        <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Contraseña segura" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
        {loading ? "Creando equipo..." : "Crear equipo"}
      </button>
      {fieldError && <div className="text-red-600 text-sm mt-2">{fieldError}</div>}
      {msg && <div className={msg.includes("correctamente") ? "text-green-600 text-sm mt-2" : "text-red-600 text-sm mt-2"}>{msg}</div>}
    </form>
  );
}
