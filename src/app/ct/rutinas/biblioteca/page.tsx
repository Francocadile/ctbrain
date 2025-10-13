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
      <div className="card mb-6">
        <h1 className="h1 text-ink-900 mb-2 tracking-tight">Biblioteca de rutinas prearmadas</h1>
        <p className="text-ink-700 mb-4">Gestiona, edita y asigna rutinas generales a jugadores. Mantén tu biblioteca organizada y profesional.</p>
        <Link href="/ct/rutinas/nuevo" className="btn-primary ui-min">Crear nueva rutina</Link>
      </div>
      <div className="card">
        <table className="w-full table-zebra rounded-lg">
          <thead>
            <tr className="bg-base-50">
              <th className="px-2 py-1 text-left label-ui">Nombre</th>
              <th className="px-2 py-1 text-left label-ui">Última edición</th>
              <th className="px-2 py-1 text-left label-ui">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rutinas.map((rutina: any) => (
              <tr key={rutina.id} className="border-b">
                <td className="px-2 py-1 font-semibold text-ink-700">{rutina.day}</td>
                <td className="px-2 py-1 tabular">{rutina.updatedAt instanceof Date ? rutina.updatedAt.toLocaleDateString() : String(rutina.updatedAt)}</td>
                <td className="px-2 py-1 space-x-2">
                  <Link href={`/ct/rutinas/${rutina.id}/edit`} className="btn-secondary">Editar</Link>
                  <Link href={`/ct/rutinas/asignar?id=${rutina.id}`} className="btn-secondary">Asignar a jugadores</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
