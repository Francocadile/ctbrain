"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

type CTUser = { id: string; email: string };
type TeamRowProps = {
  team: { id: string; name: string; cts?: CTUser[] };
  adminEmail?: string;
  rowProps?: Record<string, any>;
};

export default function TeamRow({ team, adminEmail }: TeamRowProps) {
  const { rowProps } = arguments[0];
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const router = useRouter();

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/superadmin/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id, name }),
    });
    if (res.ok) {
      setSuccess("Equipo actualizado");
      setEditing(false);
      setTimeout(() => setSuccess(null), 2000);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al editar equipo");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar este equipo?")) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/superadmin/teams", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id }),
    });
    if (res.ok) {
      setSuccess("Equipo eliminado");
      setTimeout(() => setSuccess(null), 2000);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al eliminar equipo");
    }
    setLoading(false);
  };

  // Mostrar CTs asignados
  const cts = team.cts || [];
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [ctUsers, setCtUsers] = useState<CTUser[]>([]);
  const [selectedCtIds, setSelectedCtIds] = useState<string[]>(cts.map(ct => ct.id));
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string|null>(null);

  // Cargar usuarios CT al abrir el modal
  React.useEffect(() => {
    if (showAssignModal) {
      setModalLoading(true);
      setModalError(null);
      fetch("/api/superadmin/users?role=CT")
        .then(r => r.ok ? r.json() : Promise.reject("Error al cargar CTs"))
        .then(data => {
          setCtUsers(data.users || []);
        })
        .catch(() => setModalError("No se pudieron cargar los usuarios CT"))
        .finally(() => setModalLoading(false));
    }
  }, [showAssignModal]);

  return (
    <tr className="border-t group hover:bg-blue-50 transition" {...(rowProps || {})}>
      {/* Logo y colores */}
      <td className="px-4 py-2">
        {team.logoUrl ? (
          <img src={team.logoUrl} alt="Logo" className="h-10 w-10 rounded-full border shadow" style={{ background: team.primaryColor || '#f3f4f6' }} />
        ) : (
          <div className="h-10 w-10 rounded-full flex items-center justify-center border bg-gray-100 text-gray-400 font-bold" style={{ background: team.primaryColor || '#f3f4f6', color: team.secondaryColor || '#888' }}>
            {team.name?.charAt(0) || "?"}
          </div>
        )}
      </td>
      {/* Nombre editable */}
      <td className="px-4 py-2 min-w-[180px]">
        {editing ? (
          <form onSubmit={handleEdit} className="flex gap-2 items-center">
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={loading || !name} className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition flex items-center">
              {loading ? <span className="loader mr-2" /> : null} Guardar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-500 px-2 py-1 hover:underline">Cancelar</button>
          </form>
        ) : (
          <span className="font-medium text-gray-800">{team.name}</span>
        )}
        {error && <div className="text-xs text-red-600 mt-1 font-semibold">{error}</div>}
        {success && <div className="text-xs text-green-600 mt-1 font-semibold">{success}</div>}
      </td>
      <td className="px-4 py-2 text-xs text-gray-500 font-mono">{team.id}</td>
      <td className="px-4 py-2 text-xs text-gray-700">{adminEmail || "-"}</td>
      <td className="px-4 py-2 text-xs">
        {cts.length === 0 ? (
          <span className="text-gray-400">Sin CT asignado</span>
        ) : (
          <ul className="space-y-0.5">
            {cts.map(ct => (
              <li key={ct.id} className="text-blue-700 font-medium">{ct.email}</li>
            ))}
          </ul>
        )}
      </td>
      <td className="px-4 py-2">
        {!editing && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="text-blue-600 hover:underline font-semibold">Editar</button>
            <button onClick={handleDelete} className="text-red-600 hover:underline font-semibold">Eliminar</button>
            <button onClick={() => setShowAssignModal(true)} className="text-green-600 hover:underline font-semibold">Asignar CT</button>
          </div>
        )}
        {/* Modal de asignación CT (placeholder) */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl min-w-[340px]">
              <h2 className="text-lg font-bold mb-2">Asignar CT a equipo</h2>
              {modalLoading ? (
                <div className="text-gray-500">Cargando usuarios CT…</div>
              ) : modalError ? (
                <div className="text-red-600">{modalError}</div>
              ) : (
                <form className="space-y-3">
                  <div className="mb-2 text-sm text-gray-600">Selecciona los usuarios CT que estarán asignados a este equipo:</div>
                  <div className="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                    {ctUsers.length === 0 ? (
                      <div className="text-gray-400">No hay usuarios CT disponibles.</div>
                    ) : (
                      ctUsers.map(ct => (
                        <label key={ct.id} className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedCtIds.includes(ct.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedCtIds(ids => [...ids, ct.id]);
                              } else {
                                setSelectedCtIds(ids => ids.filter(id => id !== ct.id));
                              }
                            }}
                          />
                          <span className="text-blue-700 font-medium">{ct.email}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {/* Feedback visual */}
                  {success && <div className="text-green-600 text-sm font-semibold mt-2">{success}</div>}
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300">Cerrar</button>
                    <button
                      type="button"
                      className={`px-4 py-1 rounded bg-green-600 text-white hover:bg-green-700 flex items-center ${modalLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={modalLoading || JSON.stringify(selectedCtIds) === JSON.stringify(cts.map(ct => ct.id))}
                      onClick={async () => {
                        setModalLoading(true);
                        setModalError(null);
                        setSuccess(null);
                        try {
                          const res = await fetch("/api/superadmin/teams", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ teamId: team.id, ctUserIds: selectedCtIds }),
                          });
                          if (!res.ok) throw new Error("Error al asignar CTs");
                          setSuccess("CTs asignados correctamente");
                          setTimeout(() => {
                            setShowAssignModal(false);
                            setSuccess(null);
                            router.refresh();
                          }, 1200);
                        } catch (e: any) {
                          setModalError(e.message || "Error al asignar CTs");
                        } finally {
                          setModalLoading(false);
                        }
                      }}
                    >
                      {modalLoading ? <span className="loader mr-2" /> : null}
                      Guardar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
