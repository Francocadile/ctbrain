import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function RutinasCTPage() {
  const rutinas = await prisma.playerRoutine.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow p-6 mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-900">Planificador de rutinas</h2>
        <Link href="/ct/rutinas/nuevo" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Nueva rutina</Link>
      </div>
      <div className="bg-gray-50 rounded-xl shadow p-4">
        <table className="w-full border rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">Jugador</th>
              <th className="px-2 py-1 text-left">Día</th>
              <th className="px-2 py-1 text-left">Total ejercicios</th>
              <th className="px-2 py-1 text-left">Actualizada</th>
              <th className="px-2 py-1 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rutinas.map((rutina: any) => (
              <tr key={rutina.id} className="border-b">
                <td className="px-2 py-1 font-semibold text-blue-800">{rutina.userId}</td>
                <td className="px-2 py-1">{rutina.day instanceof Date ? rutina.day.toLocaleDateString() : String(rutina.day)}</td>
                <td className="px-2 py-1">{rutina.ejercicios && typeof rutina.ejercicios === 'object' && 'sections' in rutina.ejercicios && Array.isArray(rutina.ejercicios.sections) ? Object.values(rutina.ejercicios.sections).flat().length : 0}</td>
                <td className="px-2 py-1">{rutina.updatedAt instanceof Date ? rutina.updatedAt.toLocaleDateString() : String(rutina.updatedAt)}</td>
                <td className="px-2 py-1 space-x-2">
                  <Link href={`/ct/rutinas/${rutina.id}/edit`} className="bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition">Editar</Link>
                  <Link href={`/ct/rutinas/nuevo?copy=${rutina.id}`} className="bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition">Duplicar</Link>
                  <button className="bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition" onClick={() => {/* Eliminar con confirmación */}}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
