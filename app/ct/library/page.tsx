// src/app/ct/library/page.tsx
"use client";

import { useEffect, useState } from "react";

type DocItem = { id: string; title: string; url: string; kind: "pdf"|"link"|"planilla"; createdAt: string };
const LS_DOCS = "ct_docs_v1";

function read(): DocItem[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(LS_DOCS); const arr = raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; } catch { return []; }
}
function write(list: DocItem[]) { if (typeof window === "undefined") return; localStorage.setItem(LS_DOCS, JSON.stringify(list)); }
function listDocs() { return read().sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).reverse(); }
function addDoc(d: Omit<DocItem,"id"|"createdAt">) { const it: DocItem={...d,id:crypto.randomUUID(),createdAt:new Date().toISOString()}; write([it,...read()]); return it; }
function removeDoc(id: string) { write(read().filter(x=>x.id!==id)); }

export default function LibraryPage() {
  const [rows, setRows] = useState<DocItem[]>([]);
  const [form, setForm] = useState({ title: "", url: "", kind: "pdf" as DocItem["kind"] });

  function load(){ setRows(listDocs()); }
  useEffect(()=>{ load(); }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if(!form.title.trim()||!form.url.trim()){ alert("Completá título y URL"); return; }
    addDoc({ title: form.title.trim(), url: form.url.trim(), kind: form.kind });
    setForm({ title: "", url: "", kind: "pdf" });
    load();
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Biblioteca técnica (mínima)</h1>
          <p className="text-xs text-gray-500">Protocolos, tests, progresiones — enlaces o PDFs (URL).</p>
        </div>
        <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Dashboard</a>
      </header>

      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">Nuevo</div>
        <form onSubmit={save} className="p-3 grid md:grid-cols-4 gap-3">
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Título" value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))}/>
          <input className="rounded-md border px-2 py-1.5 text-sm md:col-span-2" placeholder="https://…" value={form.url} onChange={(e)=>setForm(f=>({...f,url:e.target.value}))}/>
          <select className="rounded-md border px-2 py-1.5 text-sm" value={form.kind} onChange={(e)=>setForm(f=>({...f,kind:e.target.value as any}))}>
            <option value="pdf">PDF</option>
            <option value="link">Link</option>
            <option value="planilla">Planilla</option>
          </select>
          <div className="md:col-span-4">
            <button className="px-3 py-1.5 rounded-xl text-xs bg-black text-white hover:opacity-90">Agregar</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">Lista</div>
        {rows.length===0 ? (
          <div className="p-4 text-gray-500">Sin documentos aún.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((d)=>(
              <li key={d.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.title}</div>
                  <div className="text-[12px] text-gray-500">Tipo: {d.kind} · <a className="underline text-emerald-700 break-all" href={d.url} target="_blank" rel="noreferrer">{d.url}</a></div>
                </div>
                <button className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50" onClick={()=>{ removeDoc(d.id); load(); }}>Borrar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
