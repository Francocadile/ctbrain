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
      <h1 className="text-3xl font-bold mb-6">Biblioteca de rutinas prearmadas</h1>
      <div className="mb-4">
        <Link href="/ct/rutinas/nuevo" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Crear nueva rutina</Link>
      </div>
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
              <td className="px-2 py-1">{rutina.day}</td>
              <td className="px-2 py-1">{rutina.updatedAt instanceof Date ? rutina.updatedAt.toLocaleDateString() : String(rutina.updatedAt)}</td>
              <td className="px-2 py-1 space-x-2">
                <Link href={`/ct/rutinas/${rutina.id}/edit`} className="text-blue-600 underline">Editar</Link>
                <Link href={`/ct/rutinas/asignar?id=${rutina.id}`} className="text-green-600 underline">Asignar a jugadores</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
