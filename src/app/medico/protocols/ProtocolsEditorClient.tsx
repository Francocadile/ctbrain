"use client";

import * as React from "react";
import PlayerSelectMed from "@/components/PlayerSelectMed";
import HelpTip from "@/components/HelpTip";

type ProtocolStatus = "DRAFT" | "ACTIVE" | "FINISHED";

type ProtocolSummary = {
  id: string;
  playerId: string;
  playerName: string;
  createdByName: string;
  title: string | null;
  injuryContext: string | null;
  status: ProtocolStatus;
};

type ProtocolBlock = {
  id: string;
  order: number;
  type: string;
  content: string;
  intensity: string | null;
  volume: string | null;
  notes: string | null;
};

type ProtocolStage = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string | null;
  order: number;
  notes: string | null;
  blocks: ProtocolBlock[];
};

type ProtocolDetail = {
  id: string;
  playerId: string;
  playerName: string;
  createdByName: string;
  title: string | null;
  injuryContext: string | null;
  status: ProtocolStatus;
  stages: ProtocolStage[];
};

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function ProtocolsEditorClient() {
  const [list, setList] = React.useState<ProtocolSummary[]>([]);
  const [loadingList, setLoadingList] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ProtocolDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const [newPlayerId, setNewPlayerId] = React.useState("");
  const [newTitle, setNewTitle] = React.useState("");
  const [newInjuryContext, setNewInjuryContext] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function loadList() {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch("/api/medico/protocols", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json.items) ? json.items : [];
      const mapped: ProtocolSummary[] = items.map((p: any) => ({
        id: String(p.id),
        playerId: String(p.playerId),
        playerName: String(p.playerName || "Jugador"),
        createdByName: String(p.createdByName || "Médico"),
        title: p.title ?? null,
        injuryContext: p.injuryContext ?? null,
        status: (p.status as ProtocolStatus) ?? "ACTIVE",
      }));
      setList(mapped);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los protocolos.");
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }

  React.useEffect(() => {
    loadList();
  }, []);

  async function loadDetail(id: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/medico/protocols/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const stages: ProtocolStage[] = Array.isArray(json.stages)
        ? json.stages.map((s: any) => ({
            id: String(s.id),
            date: typeof s.date === "string" ? s.date : toYMD(new Date(s.date)),
            title: s.title ?? null,
            order: Number(s.order ?? 0),
            notes: s.notes ?? null,
            blocks: Array.isArray(s.blocks)
              ? s.blocks.map((b: any) => ({
                  id: String(b.id),
                  order: Number(b.order ?? 0),
                  type: String(b.type || "OTHER"),
                  content: String(b.content || ""),
                  intensity: b.intensity ?? null,
                  volume: b.volume ?? null,
                  notes: b.notes ?? null,
                }))
              : [],
          }))
        : [];

      setDetail({
        id: String(json.id),
        playerId: String(json.playerId),
        playerName: String(json.playerName || "Jugador"),
        createdByName: String(json.createdByName || "Médico"),
        title: json.title ?? null,
        injuryContext: json.injuryContext ?? null,
        status: (json.status as ProtocolStatus) ?? "ACTIVE",
        stages,
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el protocolo.");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newPlayerId) {
      setError("Seleccioná un jugador.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/medico/protocols", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          playerId: newPlayerId,
          title: newTitle,
          injuryContext: newInjuryContext,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`No se pudo crear el protocolo (${res.status}) ${txt}`);
      }
      const json = await res.json();
      const id = String(json.id);
      setNewPlayerId("");
      setNewTitle("");
      setNewInjuryContext("");
      await loadList();
      setSelectedId(id);
      await loadDetail(id);
    } catch (e: any) {
      setError(e?.message || "No se pudo crear el protocolo.");
    } finally {
      setCreating(false);
    }
  }

  async function handleHeaderSave() {
    if (!detail) return;
    setError(null);
    try {
      const res = await fetch(`/api/medico/protocols/${encodeURIComponent(detail.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: detail.title ?? "",
          injuryContext: detail.injuryContext ?? "",
          status: detail.status,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadList();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar el encabezado.");
    }
  }

  async function handleDeleteProtocol() {
    if (!detail) return;
    const ok = window.confirm(
      "¿Seguro que querés eliminar este protocolo? Se borrarán también sus etapas y bloques.",
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/medico/protocols/${encodeURIComponent(detail.id)}` , {
        method: "DELETE",
      });

      let bodyText: string | null = null;
      try {
        bodyText = await res.text();
      } catch {
        bodyText = null;
      }

      if (!res.ok) {
        console.error("Error DELETE /api/medico/protocols/[id]", {
          status: res.status,
          body: bodyText,
        });
        window.alert("No se pudo eliminar el protocolo.");
        return;
      }

      setSelectedId(null);
      setDetail(null);
      await loadList();
    } catch (e) {
      console.error("Error de red eliminando protocolo", e);
      window.alert("No se pudo eliminar el protocolo.");
    }
  }

  async function addStage() {
    if (!detail) return;
    setError(null);
    try {
      const today = toYMD(new Date());
      const res = await fetch(`/api/medico/protocols/${encodeURIComponent(detail.id)}/stages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: today, title: "Nueva etapa" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.message || "No se pudo agregar la etapa.");
    }
  }

  async function updateStage(stage: ProtocolStage, patch: Partial<ProtocolStage>) {
    setError(null);
    try {
      const res = await fetch(`/api/medico/protocols/stages/${encodeURIComponent(stage.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: patch.title ?? stage.title ?? "",
          notes: patch.notes ?? stage.notes ?? "",
          order: patch.order ?? stage.order,
          date: patch.date ?? stage.date,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (detail) await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar la etapa.");
    }
  }

  async function deleteStage(stage: ProtocolStage) {
    if (!detail) return;
    if (!confirm("¿Eliminar esta etapa y sus bloques?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/medico/protocols/stages/${encodeURIComponent(stage.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.message || "No se pudo eliminar la etapa.");
    }
  }

  async function addBlock(stage: ProtocolStage) {
    setError(null);
    try {
      const res = await fetch(
        `/api/medico/protocols/stages/${encodeURIComponent(stage.id)}/blocks`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "GYM", content: "Nuevo bloque" }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (detail) await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.message || "No se pudo agregar el bloque.");
    }
  }

  async function updateBlock(stage: ProtocolStage, block: ProtocolBlock, patch: Partial<ProtocolBlock>) {
    setError(null);
    try {
      const res = await fetch(`/api/medico/protocols/blocks/${encodeURIComponent(block.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: patch.content ?? block.content,
          intensity: patch.intensity ?? block.intensity ?? "",
          volume: patch.volume ?? block.volume ?? "",
          notes: patch.notes ?? block.notes ?? "",
          order: patch.order ?? block.order,
          type: patch.type ?? block.type,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (detail) await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar el bloque.");
    }
  }

  async function deleteBlock(stage: ProtocolStage, block: ProtocolBlock) {
    if (!detail) return;
    setError(null);
    try {
      const res = await fetch(`/api/medico/protocols/blocks/${encodeURIComponent(block.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.message || "No se pudo eliminar el bloque.");
    }
  }

  function renderTimeline() {
    if (!detail) {
      return (
        <div className="rounded-xl border bg-white p-4 text-sm text-gray-500">
          Seleccioná un protocolo de la izquierda o creá uno nuevo.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <header className="rounded-xl border bg-white p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Protocolo médico</h1>
              <p className="text-sm text-gray-600">
                Jugador: <b>{detail.playerName}</b> · Médico: <b>{detail.createdByName}</b>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border px-2 text-sm"
                value={detail.status}
                onChange={(e) => setDetail({ ...detail, status: e.target.value as ProtocolStatus })}
              >
                <option value="DRAFT">Borrador</option>
                <option value="ACTIVE">Activo</option>
                <option value="FINISHED">Finalizado</option>
              </select>
              <button
                type="button"
                className="h-9 rounded-md border px-3 text-sm"
                onClick={handleHeaderSave}
              >
                Guardar encabezado
              </button>
              <button
                type="button"
                className="h-9 rounded-md border px-3 text-sm text-red-600 hover:bg-red-50"
                onClick={handleDeleteProtocol}
              >
                Eliminar protocolo
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Título del protocolo</label>
              <input
                className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                value={detail.title ?? ""}
                onChange={(e) => setDetail({ ...detail, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                Contexto de lesión
                <HelpTip text="Resumen corto: diagnóstico clave, fase actual, criterios de retorno." />
              </label>
              <input
                className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                value={detail.injuryContext ?? ""}
                onChange={(e) => setDetail({ ...detail, injuryContext: e.target.value })}
              />
            </div>
          </div>
        </header>

        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Timeline clínico</h2>
            <button
              type="button"
              className="h-8 rounded-md border px-3 text-xs"
              onClick={addStage}
            >
              + Agregar etapa
            </button>
          </div>

          {detail.stages.length === 0 ? (
            <p className="text-sm text-gray-500">Sin etapas aún. Agregá la primera para empezar.</p>
          ) : (
            <div className="space-y-4">
              {detail.stages
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((stage) => (
                  <div key={stage.id} className="flex gap-3">
                    <div className="flex flex-col items-center pt-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div className="flex-1 w-px bg-emerald-100" />
                    </div>
                    <div className="flex-1 rounded-lg border bg-gray-50 p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            className="h-8 rounded-md border px-2 text-xs"
                            value={stage.date}
                            onChange={(e) =>
                              updateStage(stage, { date: e.target.value || stage.date })
                            }
                          />
                          <input
                            className="h-8 rounded-md border px-2 text-xs min-w-[160px]"
                            placeholder="Título de la etapa"
                            defaultValue={stage.title ?? ""}
                            onBlur={(e) => updateStage(stage, { title: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <button
                            type="button"
                            className="h-7 rounded-md border px-2"
                            onClick={() => deleteStage(stage)}
                          >
                            Eliminar etapa
                          </button>
                        </div>
                      </div>

                      <textarea
                        className="w-full rounded-md border px-2 py-1 text-xs min-h-[50px]"
                        placeholder="Notas breves de la etapa (objetivos, criterios, observaciones)"
                        defaultValue={stage.notes ?? ""}
                        onBlur={(e) => updateStage(stage, { notes: e.target.value })}
                      />

                      <div className="space-y-2">
                        {stage.blocks
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((block, idx, arr) => (
                            <div
                              key={block.id}
                              className="flex flex-col gap-2 rounded-md border bg-white p-2 text-xs"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  className="h-7 rounded-md border px-2 text-[11px]"
                                  defaultValue={block.type}
                                  onChange={(e) =>
                                    updateBlock(stage, block, { type: e.target.value })
                                  }
                                >
                                  <option value="GYM">Gimnasio</option>
                                  <option value="FIELD">Campo</option>
                                  <option value="POOL">Pileta</option>
                                  <option value="THERAPY">Tratamiento</option>
                                  <option value="MOBILITY">Movilidad / elongación</option>
                                  <option value="SUPPLEMENT">Suplementación</option>
                                  <option value="OTHER">Otro</option>
                                </select>
                                <input
                                  className="h-7 flex-1 rounded-md border px-2 text-[11px] min-w-[140px]"
                                  defaultValue={block.content}
                                  placeholder="Contenido principal (ej: circuito fuerza, técnica campo…)"
                                  onBlur={(e) =>
                                    updateBlock(stage, block, { content: e.target.value })
                                  }
                                />
                                <input
                                  className="h-7 w-24 rounded-md border px-2 text-[11px]"
                                  defaultValue={block.intensity ?? ""}
                                  placeholder="Intensidad"
                                  onBlur={(e) =>
                                    updateBlock(stage, block, { intensity: e.target.value })
                                  }
                                />
                                <input
                                  className="h-7 w-24 rounded-md border px-2 text-[11px]"
                                  defaultValue={block.volume ?? ""}
                                  placeholder="Volumen"
                                  onBlur={(e) =>
                                    updateBlock(stage, block, { volume: e.target.value })
                                  }
                                />
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <textarea
                                  className="flex-1 rounded-md border px-2 py-1 text-[11px] min-h-[36px]"
                                  placeholder="Notas breves (opcional)"
                                  defaultValue={block.notes ?? ""}
                                  onBlur={(e) =>
                                    updateBlock(stage, block, { notes: e.target.value })
                                  }
                                />
                                <div className="flex items-center gap-1 text-[11px]">
                                  <button
                                    type="button"
                                    className="h-7 rounded-md border px-2 disabled:opacity-40"
                                    disabled={idx === 0}
                                    onClick={() => {
                                      if (idx === 0) return;
                                      const prev = arr[idx - 1];
                                      updateBlock(stage, block, { order: prev.order });
                                    }}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="h-7 rounded-md border px-2 disabled:opacity-40"
                                    disabled={idx === arr.length - 1}
                                    onClick={() => {
                                      if (idx === arr.length - 1) return;
                                      const next = arr[idx + 1];
                                      updateBlock(stage, block, { order: next.order });
                                    }}
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="h-7 rounded-md border px-2"
                                    onClick={() => deleteBlock(stage, block)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        <button
                          type="button"
                          className="h-7 rounded-md border px-3 text-[11px]"
                          onClick={() => addBlock(stage)}
                        >
                          + Agregar bloque
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px),1fr]">
      <section className="rounded-xl border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
              Protocolos
            </h2>
            <p className="text-xs text-gray-500">
              Línea de tiempo editable por lesión. Plantillas reutilizables por jugador.
            </p>
          </div>
          <button
            type="button"
            className="h-8 rounded-md border px-3 text-xs"
            onClick={loadList}
            disabled={loadingList}
          >
            {loadingList ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-2 rounded-lg border bg-gray-50 p-3">
          <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
            Nuevo protocolo
            <HelpTip text="Seleccioná jugador y añadí un título/contexto. Luego podés armar la línea de tiempo por etapas." />
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-medium">Jugador</label>
              <div className="mt-1">
                <PlayerSelectMed value={newPlayerId} onChange={setNewPlayerId} disabled={creating} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium">Título (opcional)</label>
              <input
                className="mt-1 h-8 w-full rounded-md border px-2 text-xs"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium">Contexto de lesión (opcional)</label>
              <input
                className="mt-1 h-8 w-full rounded-md border px-2 text-xs"
                value={newInjuryContext}
                onChange={(e) => setNewInjuryContext(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="h-8 rounded-md bg-black px-4 text-xs font-medium text-white disabled:opacity-60"
              disabled={creating}
            >
              {creating ? "Creando…" : "Crear protocolo"}
            </button>
          </div>
        </form>

        <div className="max-h-[360px] overflow-auto border-t pt-3 mt-2">
          {list.length === 0 ? (
            <p className="text-xs text-gray-500">
              Sin protocolos aún. Creá el primero para este equipo.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md px-2 py-1 text-left hover:bg-gray-50 border ${
                      selectedId === p.id ? "border-black bg-gray-50" : "border-transparent"
                    }`}
                    onClick={() => {
                      setSelectedId(p.id);
                      loadDetail(p.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{p.playerName}</span>
                      <span className="text-[10px] uppercase text-gray-500">{p.status}</span>
                    </div>
                    {p.title ? (
                      <div className="text-[11px] text-gray-600 truncate">{p.title}</div>
                    ) : null}
                    {p.injuryContext ? (
                      <div className="text-[11px] text-gray-500 truncate">{p.injuryContext}</div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="text-[11px] text-red-600 border-t pt-2 mt-1">{error}</div>
        )}
      </section>

      <section>{loadingDetail && selectedId ? <p className="text-sm text-gray-500">Cargando…</p> : renderTimeline()}</section>
    </div>
  );
}
