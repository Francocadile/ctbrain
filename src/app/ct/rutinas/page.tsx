import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function RutinasCTPage() {
  const rutinas = await prisma.playerRoutine.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="card mb-6 flex items-center justify-between">
        <h2 className="h2 text-ink-900 tracking-tight">Planificador de rutinas</h2>
        <Link href="/ct/rutinas/nuevo" className="btn-primary ui-min">Nueva rutina</Link>
      </div>
      <div className="card">
        <table className="w-full table-zebra rounded-lg">
          <thead>
            <tr className="bg-base-50">
              <th className="px-2 py-1 text-left label-ui">Jugador</th>
              <th className="px-2 py-1 text-left label-ui">Día</th>
              <th className="px-2 py-1 text-left label-ui">Total ejercicios</th>
              <th className="px-2 py-1 text-left label-ui">Actualizada</th>
              <th className="px-2 py-1 text-left label-ui">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rutinas.map((rutina: any) => (
              <tr key={rutina.id} className="border-b">
                <td className="px-2 py-1 font-semibold text-ink-700">{rutina.userId}</td>
                <td className="px-2 py-1 tabular">{rutina.day instanceof Date ? rutina.day.toLocaleDateString() : String(rutina.day)}</td>
                <td className="px-2 py-1 tabular">{rutina.ejercicios && typeof rutina.ejercicios === 'object' && 'sections' in rutina.ejercicios && Array.isArray(rutina.ejercicios.sections) ? Object.values(rutina.ejercicios.sections).flat().length : 0}</td>
                <td className="px-2 py-1 tabular">{rutina.updatedAt instanceof Date ? rutina.updatedAt.toLocaleDateString() : String(rutina.updatedAt)}</td>
                <td className="px-2 py-1 space-x-2">
                  <Link href={`/ct/rutinas/${rutina.id}/edit`} className="btn-secondary">Editar</Link>
                  <Link href={`/ct/rutinas/nuevo?copy=${rutina.id}`} className="btn-secondary">Duplicar</Link>
                  <button className="badge-error px-2 py-1 rounded" onClick={() => {/* Eliminar con confirmación */}}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
