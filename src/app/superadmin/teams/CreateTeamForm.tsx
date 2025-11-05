"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTeamForm() {
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File|null>(null);
  const [logoPreview, setLogoPreview] = useState<string|null>(null);
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    let logoUrl = null;
    if (logoFile) {
      // Simulación: subir a Cloudinary, S3, etc. Aquí solo se simula y se usa un objeto local
      // En producción, deberías enviar el archivo a un endpoint que lo suba y devuelva la URL
      // Por ahora, lo omitimos y dejamos logoUrl en null
    }
    const res = await fetch("/api/superadmin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, adminEmail, logoUrl, primaryColor, secondaryColor }),
    });
    if (res.ok) {
      const data = await res.json();
      setMsg(`Equipo y ADMIN creados correctamente.\nEmail: ${adminEmail}\nContraseña: ${data.adminPassword}`);
      setName("");
      setAdminEmail("");
      setLogoFile(null);
      setLogoPreview(null);
      setPrimaryColor("#000000");
      setSecondaryColor("#ffffff");
      router.refresh();
    } else {
      const data = await res.json();
      setMsg(data.error || "Error al crear equipo");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre del equipo</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="border rounded px-2 py-1" placeholder="Ej: Club Atlético Demo" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email del ADMIN responsable</label>
        <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required className="border rounded px-2 py-1" placeholder="admin@club.com" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Escudo / Logo</label>
        <input type="file" accept="image/*" onChange={e => {
          const file = e.target.files?.[0] || null;
          setLogoFile(file);
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
          } else {
            setLogoPreview(null);
          }
        }} className="border rounded px-2 py-1" />
        {logoPreview && (
          <img src={logoPreview} alt="Preview escudo" className="mt-2 h-12 w-12 object-contain rounded border" />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Color principal</label>
        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 p-0 border-none" />
        <span className="ml-2 text-xs">{primaryColor}</span>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Color secundario</label>
        <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-10 h-10 p-0 border-none" />
        <span className="ml-2 text-xs">{secondaryColor}</span>
      </div>
      <button type="submit" disabled={loading || !name || !adminEmail} className="bg-black text-white px-4 py-2 rounded-md shadow hover:bg-gray-800 transition font-semibold">
        {loading ? "Creando..." : "Crear equipo y ADMIN"}
      </button>
      {msg && (
        <pre className="ml-4 text-sm text-green-700 whitespace-pre-line bg-green-50 p-2 rounded border border-green-200 max-w-xl">{msg}</pre>
      )}
    </form>
  );
}
