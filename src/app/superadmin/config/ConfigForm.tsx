"use client";
import { useState, useEffect } from "react";

export default function ConfigForm() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/superadmin/config")
      .then(res => res.json())
      .then(data => { setConfig(data); setLoading(false); });
  }, []);

  const handleChange = (e: any) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/superadmin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) setMsg("Configuración guardada");
    else setMsg("Error al guardar");
  };

  if (loading) return <div>Cargando configuración…</div>;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="card p-4 rounded-xl border bg-white">
        <h2 className="font-bold mb-2">General</h2>
        <label className="block mb-1">Nombre del sistema</label>
        <input name="systemName" value={config.systemName || ""} onChange={handleChange} className="border rounded px-2 py-1 w-full" />
        <label className="block mt-2 mb-1">Logo</label>
        <input name="logoUrl" value={config.logoUrl || ""} onChange={handleChange} className="border rounded px-2 py-1 w-full" />
        <label className="block mt-2 mb-1">Color principal</label>
        <input name="mainColor" value={config.mainColor || ""} onChange={handleChange} className="border rounded px-2 py-1 w-full" />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Guardar cambios</button>
      {msg && <div className="mt-2 text-sm text-gray-600">{msg}</div>}
    </form>
  );
}
