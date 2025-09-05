"use client";

import { useEffect, useMemo, useState } from "react";
import { listKinds } from "@/lib/settings";
import {
  searchExercises,
  deleteExercise,
  importAllFromSessions,
  type ExerciseDTO,
  type SearchParams,
} from "@/lib/api/exercises";

type Order = "createdAt" | "title";
type Dir = "asc" | "desc";

export default function ExercisesLibraryPage() {
  const [kinds, setKinds] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string>(""); // guarda el NOMBRE seleccionado
  const [order, setOrder] = useState<Order>("createdAt");
  const [dir, setDir] = useState<Dir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExerciseDTO[]>([]);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      // NOTA: SearchParams hoy acepta kindId. Como en la UI tenemos sólo NOMBRES de kind,
      // mandamos ese string en 'kindId' para no romper el tipo. El backend puede ignorarlo
      // o también aceptar filtro por nombre (si ya lo implementaste).
      const params: SearchParams = {
        q,
        kindId: kindFilter || undefined,
        order,
        dir,
        page,
        pageSize,
      };
      const { data, meta } = await searchExercises(params);
      setRows(data);
      setTotal(meta.total);
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const k = await listKinds();
        setKinds(k);
      } catch {
        setKinds([]);
      }
    })();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, kindFilter, order, dir, page]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ejercicios</h1>
          <p className="text-sm text-gray-500">Tu base de datos personal de tareas</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="rounded-xl border px-3 py-1.5 text-sm"
            placeholder="Buscar (título, descripción, espacio, jugadores)"
          />

          <select
            value={kindFilter}
            onChange={(e) => {
              setPage(1);
              setKindFilter(e.target.value);
            }}
            className="rounded-xl border px-2 py-1.5 text-sm"
            title="Tipo de ejercicio"
          >
            <option value="">Todos los tipos</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl border overflow-hidden">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as Order)}
              className="px-2 py-1.5 text-xs"
              title="Ordenar por"
            >
              <option value="createdAt">Fecha</option>
              <option value="title">Título</option>
            </select>
            <div className="w-px bg-gray-200" />
            <select
              value={dir}
              onChange={(e) => setDir(e.target.value as Dir)}
              className="px-2 py-1.5 text-xs"
              title="Dirección"
            >
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
          </div>

          {/* Importar desde sesiones */}
          <button
            onClick={async () => {
              if (!confirm("¿Importar/actualizar ejercicios desde todas las sesiones?")) return;
              try {
                const res = await importAllFromSessions();
                alert(`Importados: ${res.created} · Actualizados: ${res.updated}`);
                setPage(1);
                load();
              } catch (e) {
                console.error(e);
                alert("No se pudo importar desde sesiones");
              }
            }}
            className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            title="Crea/actualiza ejercicios leyendo las secciones [EXERCISES] de cada sesión"
          >
            Importar desde sesiones
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">No hay ejercicios que coincidan.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((ex) => (
            <li
              key={ex.id}
              className="rounded-xl border p-3 shadow-sm bg-white flex items-start justify-between"
            >
              <div className="min-w-0">
                <a href={`/ct/exercises/${ex.id}`} className="font-semibold text-[15px] hover:underline">
                  {ex.title || "(Sin título)"}
                </a>
                <div className="text-xs text-gray-500 mt-1 space-x-3">
                  <span>📅 {new Date(ex.createdAt).toLocaleString()}</span>
                  {ex.kind?.name && <span>🏷 {ex.kind.name}</span>}
                  {ex.space && <span>📍 {ex.space}</span>}
                  {ex.players && <span>👥 {ex.players}</span>}
                  {ex.duration && <span>⏱ {ex.duration}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/ct/exercises/${ex.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                >
                  Ver
                </a>
                <button
                  onClick={async () => {
                    if (!confirm("¿Eliminar este ejercicio?")) return;
                    try {
                      await deleteExercise(ex.id);
                      load();
                    } catch (e) {
                      console.error(e);
                      alert("No se pudo eliminar");
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Paginado */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {total} ejercicios · página {page} / {pages}
        </div>
        <div className="inline-flex rounded-xl border overflow-hidden">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            ◀ Anterior
          </button>
          <div className="w-px bg-gray-200" />
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente ▶
          </button>
        </div>
      </div>
    </div>
  );
}
