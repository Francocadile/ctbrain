import { PrismaClient } from '@prisma/client';
import { guardarEstadisticas } from './actions';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Utilidad mínima segura
const asObj = <T extends Record<string, any> = Record<string, any>>(x: unknown): T =>
  typeof x === 'object' && x !== null ? (x as T) : ({} as T);

export default async function EstadisticasPage({
  params,
}: { params: { id: string } }) {
  const rival = await prisma.rival.findUnique({
    where: { id: params.id },
    select: { planReport: true, baseSystem: true, coach: true },
  });

  const pr = asObj<any>(rival?.planReport);
  const totals = asObj<any>(pr.totals);

  // Valores actuales
  const gf = totals.gf ?? '';
  const ga = totals.ga ?? '';
  const possession = totals.possession ?? '';
  const xg = totals.xg ?? '';
  const shots = totals.shots ?? '';
  const shotsOnTarget = totals.shotsOnTarget ?? '';

  async function action(formData: FormData) {
    'use server';
    return guardarEstadisticas(params.id, formData);
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Estadísticas</h1>
        <p className="text-sm text-gray-500">
          DT: {rival?.coach ?? '—'} · Sistema base: {rival?.baseSystem ?? '—'}
        </p>
      </div>

      <form action={action} className="space-y-6">
        {/* Totales principales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">GF</label>
            <input
              name="gf"
              type="number"
              step="1"
              defaultValue={gf}
              className="border rounded-md px-3 py-2"
              placeholder="Goles a favor"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">GA</label>
            <input
              name="ga"
              type="number"
              step="1"
              defaultValue={ga}
              className="border rounded-md px-3 py-2"
              placeholder="Goles en contra"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">% Posesión</label>
            <input
              name="possession"
              type="number"
              step="0.1"
              defaultValue={possession}
              className="border rounded-md px-3 py-2"
              placeholder="Ej: 52.3"
            />
          </div>
        </div>

        {/* Métricas extra si las tenemos (también editables) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">xG</label>
            <input
              name="xg"
              type="number"
              step="0.01"
              defaultValue={xg}
              className="border rounded-md px-3 py-2"
              placeholder="xG total"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Tiros</label>
            <input
              name="shots"
              type="number"
              step="1"
              defaultValue={shots}
              className="border rounded-md px-3 py-2"
              placeholder="Total de tiros"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Tiros al arco</label>
            <input
              name="shotsOnTarget"
              type="number"
              step="1"
              defaultValue={shotsOnTarget}
              className="border rounded-md px-3 py-2"
              placeholder="Tiros a puerta"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-md"
          >
            Guardar estadísticas
          </button>

          {/* Solo para mostrar de forma rápida lo que hay en totals */}
          <span className="text-sm text-gray-500 self-center">
            {Object.keys(totals).length
              ? 'Cargadas desde PDF.'
              : 'Aún no hay métricas en planReport.totals.'}
          </span>
        </div>
      </form>

      {/* Si en el futuro extraés “últimos partidos”, añadí aquí una tabla leyendo de pr.lastMatches */}
      <div className="pt-4 border-t">
        <h2 className="text-lg font-medium mb-2">Últimos partidos</h2>
        <p className="text-sm text-gray-500">
          (Aún no se importan del PDF. Se pueden ingresar manualmente si lo deseás).
        </p>
      </div>
    </div>
  );
}
