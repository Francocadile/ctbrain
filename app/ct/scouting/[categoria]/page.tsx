// src/app/ct/scouting/[categoria]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  listCategories,
  listPlayers,
  upsertPlayer,
  deletePlayer,
  type ScoutingCategory,
  type ScoutingPlayer,
} from "@/lib/scouting";
import Container from "@/components/ui/container";

export default function ScoutingListPage({ params }: { params: { categoria: string } }) {
  const slug = params.categoria;
  const [cats, setCats] = useState<ScoutingCategory[]>([]);
  const [cat, setCat] = useState<ScoutingCategory | null>(null);
  const [rows, setRows] = useState<ScoutingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // form mínimo
  const [newRow, setNewRow] = useState<{
    fullName: string;
    positions: string;
    club: string;
    agentPhone: string;
    playerPhone: string;
    video: string;
  }>({ fullName: "", positions: "", club: "", agentPhone: "", playerPhone: "", video: "" });

  async function load() {
    setLoading(true);
    try {
      const cs = await listCategories();
      setCats(cs);
      const c = cs.find(x => x.slug === slug) ?? null;
      setCat(c);
      if (c) {
        const players = await listPlayers({ categoriaId: c.id });
        setRows(players);
      } else {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      r.fullName.toLowerCase().includes(t) ||
      (r.club || "").toLowerCase().includes(t)
    );
  }, [q, rows]);

  function exportCsv() {
    const headers = ["Nombre", "Posición", "Club", "Contacto", "Video", "Estado", "Actualizado"];
    const lines = filtered.map(r => {
      const pos = (r.positions || []).join("/");
      const contacto = r.agentPhone || r.playerPhone || r.agentEmail || r.playerEmail || "";
      const video = (r.videos || [])[0] || "";
      const upd = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "";
      return [r.fullName, pos, r.club || "", contacto, video, r.estado, upd].map(x => `"${(x ?? "").toString().replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scouting_${cat?.slug || "lista"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function addQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!cat) return;
    if (!newRow.fullName.trim()) return alert("Nombre requerido");
    if (!newRow.agentPhone && !newRow.playerPhone) return alert("Cargar contacto (agente o jugador)");
    const positions = newRow.positions.split(/[,\s/]+/).filter(Boolean);
    const videoUrl = newRow.video.trim();
    await upsertPlayer({
      fullName: newRow.fullName.trim(),
      club: newRow.club.trim() || null,
      positions,
      categoriaId: cat.id,
      agentPhone: newRow.agentPhone.trim() || null,
      playerPhone: newRow.playerPhone.trim() || null,
      videos: videoUrl ? [videoUrl] : [],
      estado: "ACTIVO",
    });
    setNewRow({ fullName: "", positions: "", club: "", agentPhone: "", playerPhone: "", video: "" });
    await load();
  }

  async function del(r: ScoutingPlayer) {
    const ok = confirm(`¿Eliminar a "${r.fullName}"?`);
    if (!ok) return;
    await deletePlayer(r.id);
    await load();
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            {cat ? `Scouting — ${cat.nombre}` : "Scouting"}
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Lista simple: nombre, posición, club, contacto, video, estado.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={"/ct/scouting" as Route} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">← Volver</Link>
          <button onClick={exportCsv} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Exportar CSV</button>
        </div>
      </div>

      {/* Alta rápida */}
      {cat && (
        <form onSubmit={addQuick} className="grid md:grid-cols-6 gap-2 rounded-2xl border bg-white p-3 mb-4">
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Nombre y apellido"
            value={newRow.fullName} onChange={e=>setNewRow(s=>({...s, fullName: e.target.value}))}/>
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Posición (ej: DEF/VOL)"
            value={newRow.positions} onChange={e=>setNewRow(s=>({...s, positions: e.target.value}))}/>
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Club"
            value={newRow.club} onChange={e=>setNewRow(s=>({...s, club: e.target.value}))}/>
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Tel. agente"
            value={newRow.agentPhone} onChange={e=>setNewRow(s=>({...s, agentPhone: e.target.value}))}/>
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Tel. jugador"
            value={newRow.playerPhone} onChange={e=>setNewRow(s=>({...s, playerPhone: e.target.value}))}/>
          <div className="flex gap-2">
            <input className="flex-1 rounded-md border px-2 py-1.5 text-sm" placeholder="Video (URL)"
              value={newRow.video} onChange={e=>setNewRow(s=>({...s, video: e.target.value}))}/>
            <button className="px-3 py-1.5 rounded-xl text-xs bg-black text-white hover:opacity-90">Agregar</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 mb-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Sin resultados</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-left px-3 py-2">Posición</th>
                <th className="text-left px-3 py-2">Club</th>
                <th className="text-left px-3 py-2">Contacto</th>
                <th className="text-left px-3 py-2">Video</th>
                <th className="text-left px-3 py-2">Estado</th>
                <th className="text-right px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{r.fullName}</td>
                  <td className="px-3 py-2">{(r.positions || []).join("/")}</td>
                  <td className="px-3 py-2">{r.club || "—"}</td>
                  <td className="px-3 py-2">
                    {r.agentPhone || r.playerPhone || r.agentEmail || r.playerEmail || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.videos?.[0] ? (
                      <a className="underline text-emerald-700 break-all" href={r.videos[0]} target="_blank">Ver</a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">{r.estado}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/ct/scouting/player/${r.id}` as Route}
                        className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                      >
                        Ficha
                      </Link>
                      <button
                        className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                        onClick={() => del(r)}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Container>
  );
}
