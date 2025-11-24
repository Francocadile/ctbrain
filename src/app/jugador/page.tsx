import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import type { Session, Team } from "@prisma/client";

type PlayerWithTeam = {
  id: string;
  teamId: string;
  userId: string | null;
  name: string;
  shirtNumber: number | null;
  position: string | null;
  photoUrl: string | null;
  birthDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  team: Team | null;
};

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default async function JugadorHomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "JUGADOR") {
    redirect("/");
  }

  const player: PlayerWithTeam | null = await (prisma as any).player.findFirst({
    where: { userId: session.user.id },
    include: { team: true },
  });

  if (!player) {
    return (
      <RoleGate allow={["JUGADOR"]}>
        <main className="min-h-screen px-4 py-6 md:px-6 md:py-8 flex items-center justify-center">
          <div className="max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold mb-2">Bienvenido a CTBrain</h1>
            <p className="text-sm text-gray-600">
              Tu perfil de jugador todavía no está configurado. Avisá a tu cuerpo técnico para que complete tus datos.
            </p>
          </div>
        </main>
      </RoleGate>
    );
  }

  const [lastRpe, lastWellness, feedbacks] = await Promise.all([
    prisma.rPEEntry.findFirst({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    }),
    prisma.wellnessEntry.findFirst({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    }),
    prisma.playerFeedback.findMany({
      where: {
        teamId: player.teamId,
        playerId: player.id,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  // Entrenamiento de hoy para el equipo del jugador
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const training: Session | null = await (prisma as any).session.findFirst({
    where: {
      teamId: player.teamId,
      date: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    orderBy: { date: "desc" },
  });

  const fakeMinutes = [90, 75, 30, 0, 90]; // TODO: conectar con módulo de partidos

  let rpeLabel = "No cargado";
  let rpeClass = "text-gray-500";
  if (lastRpe && isToday(lastRpe.date)) {
    if (lastRpe.rpe <= 3) {
      rpeLabel = `${lastRpe.rpe} (baja carga)`;
      rpeClass = "text-green-600";
    } else if (lastRpe.rpe <= 6) {
      rpeLabel = `${lastRpe.rpe} (moderada)`;
      rpeClass = "text-yellow-600";
    } else {
      rpeLabel = `${lastRpe.rpe} (alta carga)`;
      rpeClass = "text-red-600";
    }
  }

  const wellnessToday = lastWellness && isToday(lastWellness.date) ? lastWellness : null;

  return (
    <RoleGate allow={["JUGADOR"]}>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-8 space-y-6">
        {/* Header jugador */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {player.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-gray-500">
                  {player.name?.charAt(0) ?? "J"}
                </span>
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold">{player.name}</h1>
              <p className="mt-1 text-sm text-gray-600 flex flex-wrap justify-center md:justify-start gap-2 items-center">
                {player.position && <span>{player.position}</span>}
                {player.shirtNumber != null && (
                  <span className="text-gray-500">· #{player.shirtNumber}</span>
                )}
                {player.team && (
                  <span className="text-gray-500">· {player.team.name}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex justify-center md:block">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {player.status}
            </span>
          </div>
        </section>

        {/* Grid estado del día */}
  <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* RPE hoy */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">RPE hoy</h2>
            {lastRpe && isToday(lastRpe.date) ? (
              <p className={`text-lg font-semibold ${rpeClass}`}>{rpeLabel}</p>
            ) : (
              <p className="text-sm text-yellow-700">No cargado</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Carga percibida del último entrenamiento.</p>

            {lastRpe && isToday(lastRpe.date) ? (
              <a
                href="/jugador/rpe"
                className="block w-full mt-3 text-center text-blue-600 underline text-sm"
              >
                Editar RPE
              </a>
            ) : (
              <a
                href="/jugador/rpe"
                className="block w-full mt-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md text-sm"
              >
                Cargar RPE
              </a>
            )}
          </div>

          {/* Wellness hoy */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Wellness hoy</h2>
            {wellnessToday ? (
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Fatiga:</span> {wellnessToday.fatigue}
                </p>
                <p>
                  <span className="text-gray-500">Dolor muscular:</span> {wellnessToday.muscleSoreness}
                </p>
                <p>
                  <span className="text-gray-500">Estrés:</span> {wellnessToday.stress}
                </p>
              </div>
            ) : (
              <p className="text-sm text-yellow-700">No cargado</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Tu estado general al inicio del día.</p>

            {wellnessToday ? (
              <a
                href="/jugador/wellness"
                className="block w-full mt-3 text-center text-blue-600 underline text-sm"
              >
                Editar Wellness
              </a>
            ) : (
              <a
                href="/jugador/wellness"
                className="block w-full mt-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md text-sm"
              >
                Cargar Wellness
              </a>
            )}
          </div>

          {/* Minutos últimos 5 partidos */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Minutos últimos 5 partidos
            </h2>
            {/* TODO: conectar con módulo de partidos */}
            <ul className="mt-2 space-y-1 text-xs text-gray-700">
              {fakeMinutes.map((m, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-gray-500">J{idx + 1}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(m / 90) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right">{m}'</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Feedback reciente */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Feedback reciente</h2>
            {feedbacks.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no tienes feedback registrado.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs text-gray-700">
                {feedbacks.map((fb) => (
                  <li key={fb.id} className="border-b last:border-b-0 pb-1 last:pb-0">
                    <p className="font-medium text-gray-800">
                      {fb.subject || "Feedback"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {fb.createdAt.toLocaleDateString()}
                    </p>
                    <p className="mt-0.5 text-gray-600 line-clamp-2">{fb.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Tarjeta GPS */}
  <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">GPS & Carga</h2>
          {/* TODO: conectar con modelo GPS cuando esté listo */}
          <p className="text-sm text-gray-600 mb-3">
            GPS & Carga (próximamente conectado a los archivos XLS del club).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-500">Distancia total</p>
              <p className="text-sm font-semibold">7.800 m</p>
            </div>
            <div>
              <p className="text-gray-500">Alta intensidad</p>
              <p className="text-sm font-semibold">900 m</p>
            </div>
            <div>
              <p className="text-gray-500">Sprints</p>
              <p className="text-sm font-semibold">18</p>
            </div>
            <div>
              <p className="text-gray-500">Aceleraciones</p>
              <p className="text-sm font-semibold">42</p>
            </div>
          </div>
        </section>

        {/* Tarjeta Entrenamiento del día */}
  <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Entrenamiento de hoy
          </h2>
          {training ? (
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">{training.title}</p>
              <p className="text-xs text-gray-500">
                {training.date.toLocaleDateString()} · {training.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              {training.description && (
                <p className="mt-1 text-sm text-gray-700 line-clamp-3">
                  {training.description}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              No hay entrenamiento cargado para hoy.
            </p>
          )}
        </section>

        {/* Tarjeta Rutinas */}
        <Link href="/jugador/rutinas" className="block rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Rutinas</h2>
          {/* TODO: conectar con módulo de rutinas del CT */}
          <ul className="mt-1 space-y-1 text-sm text-gray-700">
            <li>· Pre-partido: activación + movilidad</li>
            <li>· Post-partido: recuperación guiada</li>
            <li>· Gimnasio: fuerza tren inferior 2x semana</li>
          </ul>
        </Link>
      </main>
    </RoleGate>
  );
}
