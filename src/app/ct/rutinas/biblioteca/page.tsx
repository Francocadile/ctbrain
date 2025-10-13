import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function BibliotecaRutinasPage() {
  // Obtener rutinas prearmadas (tipo: general)
  const rutinas = await prisma.playerRoutine.findMany({
    where: { feedback: "prearmada" },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Biblioteca de rutinas prearmadas</h1>
        <p className="text-blue-700 mb-4">Gestiona, edita y asigna rutinas generales a jugadores. Mantén tu biblioteca organizada y profesional.</p>
        <Link href="/ct/rutinas/nuevo" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Crear nueva rutina</Link>
      </div>
      <div className="bg-gray-50 rounded-xl shadow p-4">
        <table className="w-full border rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">Nombre</th>
              <th className="px-2 py-1 text-left">Última edición</th>
              <th className="px-2 py-1 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rutinas.map((rutina: any) => (
              <tr key={rutina.id} className="border-b">
                <td className="px-2 py-1 font-semibold text-blue-800">{rutina.day}</td>
                <td className="px-2 py-1">{rutina.updatedAt instanceof Date ? rutina.updatedAt.toLocaleDateString() : String(rutina.updatedAt)}</td>
                <td className="px-2 py-1 space-x-2">
                  <Link href={`/ct/rutinas/${rutina.id}/edit`} className="bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition">Editar</Link>
                  <Link href={`/ct/rutinas/asignar?id=${rutina.id}`} className="bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition">Asignar a jugadores</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
