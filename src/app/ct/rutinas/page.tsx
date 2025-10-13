import Link from "next/link";
import { getJSON } from "@/lib/api";

export default async function RutinasCTPage() {
  const rutinas = await getJSON<any[]>("/api/routines");

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Rutinas de fuerza</h2>
        <Link href="/ct/rutinas/nuevo" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Nuevo</Link>
      </div>
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
          {rutinas.slice(0, 10).map(rutina => (
            <tr key={rutina.id} className="border-b">
              <td className="px-2 py-1">{rutina.userId}</td>
              <td className="px-2 py-1">{new Date(rutina.day).toLocaleDateString()}</td>
              <td className="px-2 py-1">{Array.isArray(rutina.ejercicios) ? rutina.ejercicios.length : 0}</td>
              <td className="px-2 py-1">{new Date(rutina.updatedAt).toLocaleDateString()}</td>
              <td className="px-2 py-1 space-x-2">
                <Link href={`/ct/rutinas/${rutina.id}/edit`} className="text-blue-600 underline">Editar</Link>
                <Link href={`/ct/rutinas/nuevo?copy=${rutina.id}`} className="text-gray-600 underline">Duplicar</Link>
                <button className="text-red-600 underline" onClick={() => {/* Eliminar con confirmación */}}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
