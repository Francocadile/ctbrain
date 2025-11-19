import { dbScope } from "@/lib/dbScope";
import prisma from "@/lib/prisma";
import Link from "next/link";
import type { PlayerWithUser } from "@/app/ct/plantel/components/PlantelTable";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({ params }: { params: { playerId: string } }) {
  const { team } = await dbScope({});

  const player: PlayerWithUser | null = await (prisma as any).player.findFirst({
    where: { id: params.playerId, teamId: team.id },
    include: {
      user: true,
    },
  });

  if (!player) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <p className="text-sm text-gray-500">Jugador no encontrado.</p>
      </main>
    );
  }

  // TODO: conectar con wellness, RPE, feedback y GPS cuando estén modelados

  return (
    <main className="px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {player.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400">Sin foto</span>
            )}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{player.name}</h1>
            <div className="text-sm text-gray-600 flex flex-wrap gap-2">
              {player.shirtNumber && <span>Dorsal {player.shirtNumber}</span>}
              {player.position && <span>· {player.position}</span>}
              <span>· {player.status}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <Link
            href={`/ct/plantel`}
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
          >
            ← Volver al plantel
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Resumen</h2>
          <dl className="space-y-1 text-sm">
            <div>
              <dt className="text-gray-500">Nombre</dt>
              <dd>{player.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Dorsal</dt>
              <dd>{player.shirtNumber ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Posición</dt>
              <dd>{player.position ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Estado</dt>
              <dd>{player.status}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Acciones</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Estos botones pueden engancharse a los mismos flows de edición y acceso que en la tabla */}
            <Link
              href={`/ct/plantel`}
              className="px-3 py-1.5 rounded-md border hover:bg-gray-50"
            >
              Editar
            </Link>
            {!player.userId && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border hover:bg-gray-50"
              >
                Activar acceso
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Últimos wellness / RPE</h2>
          <p className="text-xs text-gray-400">Pendiente de conectar con métricas.</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Feedback</h2>
          <p className="text-xs text-gray-400">Pendiente de conectar con PlayerFeedback.</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">GPS última sesión</h2>
        <p className="text-xs text-gray-400">Pendiente de integrar con módulo GPS.</p>
      </section>
    </main>
  );
}
