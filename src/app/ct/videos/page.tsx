// src/app/ct/videos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { addVideo, listVideos, removeVideo, type VideoItem } from "@/lib/videos";

export default function VideosPage() {
  const [rows, setRows] = useState<VideoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", scope: "equipo" as "equipo"|"individual", tag: "" });

  function load() { setRows(listVideos()); }
  useEffect(() => { load(); }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) { alert("Completá título y URL"); return; }
    setSaving(true);
    addVideo({ title: form.title.trim(), url: form.url.trim(), scope: form.scope, tag: form.tag.trim() || undefined });
    setForm({ title: "", url: "", scope: "equipo", tag: "" });
    setSaving(false);
    load();
  }
  function del(id: string) { if (confirm("¿Eliminar video?")) { removeVideo(id); load(); } }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Área de Video (mínimo)</h1>
          <p className="text-xs text-gray-500">Links a YouTube/Drive/etc. — MVP localStorage.</p>
        </div>
        <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Dashboard</a>
      </header>

      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">Nuevo</div>
        <form onSubmit={save} className="p-3 grid md:grid-cols-4 gap-3">
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Título" value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))}/>
          <input className="rounded-md border px-2 py-1.5 text-sm md:col-span-2" placeholder="https://…" value={form.url} onChange={(e)=>setForm(f=>({...f,url:e.target.value}))}/>
          <select className="rounded-md border px-2 py-1.5 text-sm" value={form.scope} onChange={(e)=>setForm(f=>({...f,scope: e.target.value as any}))}>
            <option value="equipo">Equipo</option>
            <option value="individual">Individual</option>
          </select>
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Tag opcional" value={form.tag} onChange={(e)=>setForm(f=>({...f,tag:e.target.value}))}/>
          <div className="md:col-span-4">
            <button disabled={saving} className={`px-3 py-1.5 rounded-xl text-xs ${saving?"bg-gray-200 text-gray-500":"bg-black text-white hover:opacity-90"}`}>{saving?"Guardando…":"Agregar"}</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">Lista</div>
        {rows.length === 0 ? (
          <div className="p-4 text-gray-500">Sin videos aún.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((v)=>(
              <li key={v.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{v.title}</div>
                  <div className="text-[12px] text-gray-500">
                    <span className="mr-2">Ámbito: {v.scope}</span>
                    {v.tag && <span className="mr-2">· Tag: {v.tag}</span>}
                    · <a className="underline text-emerald-700 break-all" href={v.url} target="_blank" rel="noreferrer">{v.url}</a>
                  </div>
                </div>
                <button className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50" onClick={()=>del(v.id)}>Borrar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
