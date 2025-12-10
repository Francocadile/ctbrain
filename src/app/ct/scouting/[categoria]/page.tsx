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
  const [estadoFilter, setEstadoFilter] = useState<"TODOS" | "ACTIVO" | "WATCHLIST" | "DESCARTADO">("TODOS");
  const [savingEstadoId, setSavingEstadoId] = useState<string | null>(null);

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
        const players = await listPlayers({ categoriaId: c.id, estado: estadoFilter === "TODOS" ? undefined : estadoFilter });
        setRows(players);
      } else {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug, estadoFilter]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      r.fullName.toLowerCase().includes(t) ||
      (r.club || "").toLowerCase().includes(t)
    );
  }, [q, rows]);

  function exportCsv() {
    const headers = ["Nombre", "Posición", "Club", "Contacto", "Video", "Estado", "Rating", "Actualizado"];
    const lines = filtered.map(r => {
      const pos = (r.positions || []).join("/");
      const contacto = r.agentPhone || r.playerPhone || r.agentEmail || r.playerEmail || "";
      const video = (r.videos || [])[0] || "";
      const upd = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "";
      const rating = (r as any).rating ?? "";
      return [r.fullName, pos, r.club || "", contacto, video, r.estado, rating, upd].map(x => `"${(x ?? "").toString().replace(/"/g, '""')}"`).join(",");
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

  async function handleChangeEstado(row: ScoutingPlayer, nuevo: "ACTIVO" | "WATCHLIST" | "DESCARTADO") {
    if (!cat) return;
    if (row.estado === nuevo) return;

    const prevEstado = row.estado;
    setSavingEstadoId(row.id);
    // feedback optimista
    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, estado: nuevo } : r)));

    try {
      const payload = {
        id: row.id,
        fullName: row.fullName,
        positions: row.positions ?? [],
        club: row.club ?? null,
        estado: nuevo,
        categoriaId: row.categoriaId ?? cat.id,
        agentName: row.agentName ?? null,
        agentPhone: row.agentPhone ?? null,
        agentEmail: row.agentEmail ?? null,
        playerPhone: row.playerPhone ?? null,
        playerEmail: row.playerEmail ?? null,
        instagram: row.instagram ?? null,
        videos: row.videos ?? [],
        notes: row.notes ?? null,
        rating: row.rating ?? null,
        tags: row.tags ?? [],
      } as const;

      const updated = await upsertPlayer(payload as any);
      if (!updated) {
        throw new Error("Respuesta vacía al actualizar jugador");
      }

      // aseguramos estado sincronizado con respuesta
      setRows(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
    } catch (e: any) {
      console.error("Error al cambiar estado de scouting player", e);
      alert(e?.message || "No se pudo actualizar el estado");
      // revertir en memoria
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, estado: prevEstado } : r)));
    } finally {
      setSavingEstadoId(current => (current === row.id ? null : current));
    }
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

      {/* Filtros de estado */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1">
          {([
            { key: "TODOS", label: "Todos" },
            { key: "ACTIVO", label: "Activo" },
            { key: "WATCHLIST", label: "Watchlist" },
            { key: "DESCARTADO", label: "Descartado" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setEstadoFilter(opt.key)}
              className={
                "px-2.5 py-1 rounded-full text-[11px] border transition " +
                (estadoFilter === opt.key
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-gray-500">
          Mostrando: {estadoFilter === "TODOS" ? "Todos" : estadoFilter} ({filtered.length})
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
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 border text-[10px] " +
                          (r.estado === "ACTIVO"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : r.estado === "WATCHLIST"
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-red-50 border-red-200 text-red-800")
                        }
                      >
                        {r.estado === "ACTIVO"
                          ? "Activo"
                          : r.estado === "WATCHLIST"
                          ? "Watchlist"
                          : "Descartado"}
                      </span>
                      <select
                        className="rounded-md border px-1.5 py-0.5 text-[11px] bg-white disabled:opacity-50"
                        value={r.estado}
                        disabled={savingEstadoId === r.id}
                        onChange={(e) =>
                          handleChangeEstado(
                            r,
                            e.target.value as "ACTIVO" | "WATCHLIST" | "DESCARTADO"
                          )
                        }
                      >
                        <option value="ACTIVO">Activo</option>
                        <option value="WATCHLIST">Watchlist</option>
                        <option value="DESCARTADO">Descartado</option>
                      </select>
                      {savingEstadoId === r.id && (
                        <span className="text-[10px] text-gray-400">Guardando...</span>
                      )}
                    </div>
                  </td>
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
