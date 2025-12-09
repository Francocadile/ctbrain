import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import { NotificationsSection } from "./NotificationsSection";
import { RivalSection } from "./RivalSection";
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

function getTodayInBuenosAires() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "01");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "01");

  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    startOfDay: start,
    endOfDay: end,
    ymd: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function parseMarker(description?: string) {
  const text = (description || "").trimStart();
  const m = text.match(/^[\[]GRID:(morning|afternoon):(.+?)]\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
  return {
    turn: (m?.[1] || "") as "morning" | "afternoon" | "",
    row: m?.[2] || "",
    ymd: m?.[3] || "",
  };
}

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

  const rawRpeHistory = await prisma.rPEEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 7,
  });

  const rawWellnessHistory = await prisma.wellnessEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 7,
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

  const rpeHistory: RpeEntryDTO[] = rawRpeHistory.map((r) => ({
    id: r.id,
    date: r.date,
    rpe: r.rpe,
  }));

  const wellnessHistory: WellnessEntryDTO[] = rawWellnessHistory.map((w) => ({
    id: w.id,
    date: w.date,
    sleepQuality: w.sleepQuality ?? null,
    fatigue: w.fatigue ?? null,
    soreness: w.muscleSoreness ?? null,
    stress: w.stress ?? null,
    mood: w.mood ?? null,
  }));

  // Rutinas visibles para el jugador: reutilizamos la misma lógica de visibilidad que en la página de detalle
  const routines = await prisma.routine.findMany({
    where: {
      teamId: player.teamId,
      OR: [
        { shareMode: "ALL_PLAYERS" },
        {
          shareMode: "SELECTED_PLAYERS",
          sharedWithPlayers: {
            some: {
              OR: [
                { playerId: player.id },
                { playerId: session.user.id as string },
              ],
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  } as any);

  const { startOfDay, endOfDay, ymd: todayYmdFromTz } = getTodayInBuenosAires();

  const [todaySession] = await Promise.all([
    (prisma as any).session.findFirst({
      where: {
        teamId: player.teamId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      orderBy: { date: "asc" },
    }) as Promise<Session | null>,
  ]);

  const marker = todaySession ? parseMarker(todaySession.description as string | undefined) : null;
  const todayYmd = marker?.ymd || todayYmdFromTz;
  const todayTurn: "morning" | "afternoon" =
    marker?.turn === "morning" || marker?.turn === "afternoon" ? marker.turn : "morning";

  const hasTodaySession = !!todaySession;
  const hasRoutine = Array.isArray(routines) && routines.length > 0;

  return (
    <RoleGate allow={["JUGADOR"]}>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <PlayerHomeHeader player={player} />

          {/* Entrenamiento de hoy */}
          <NotificationsSection
            hasTodaySession={hasTodaySession}
            hasRoutine={hasRoutine}
          />

          <PlayerHomeTodaySessionCard
            todaySession={todaySession}
            todayYmd={todayYmd}
            todayTurn={todayTurn}
          />

          <RivalSection />

          {/* Primero las rutinas visibles para el jugador */}
          <PlayerHomeRoutines routines={routines} />

          {/* Luego el resumen de hoy (RPE, wellness, feedback, minutos) */}
          <PlayerHomeTodayStatus
            lastRpe={lastRpe}
            rpeLabel={rpeLabel}
            rpeClass={rpeClass}
            wellnessToday={wellnessToday}
            fakeMinutes={fakeMinutes}
            feedbacks={feedbacks}
          />

          <PlayerHomeHistoryCard
            rpeHistory={rpeHistory}
            wellnessHistory={wellnessHistory}
          />

          <PlayerHomeGpsCard />
        </div>
      </main>
    </RoleGate>
  );
}

function PlayerHomeTodaySessionCard({
  todaySession,
  todayYmd,
  todayTurn,
}: {
  todaySession: Session | null;
  todayYmd: string;
  todayTurn: "morning" | "afternoon";
}) {
  if (!todaySession) {
    return (
      <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Entrenamiento de hoy
        </h2>
        <p className="text-sm text-gray-600">
          Todavía no hay un entrenamiento cargado para hoy.
        </p>
      </section>
    );
  }

  const d = new Date(todaySession.date);

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Entrenamiento de hoy
        </h2>
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-medium text-gray-900">
          {todaySession.title || "Sesión sin título"}
        </p>
        <p className="text-xs text-gray-600">
          {d.toLocaleDateString()} ·{" "}
          {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="flex justify-end">
        <Link
          href={`/jugador/sesiones/${todaySession.id}`}
          className="text-xs rounded-md border px-3 py-1.5 bg-black text-white hover:bg-gray-800"
        >
          Ver sesión de hoy
        </Link>
      </div>
    </section>
  );
}

type RpeEntryDTO = {
  id: string;
  date: Date;
  rpe: number;
};

type WellnessEntryDTO = {
  id: string;
  date: Date;
  sleepQuality: number | null;
  fatigue: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
};

function PlayerHomeHistoryCard({
  rpeHistory,
  wellnessHistory,
}: {
  rpeHistory: RpeEntryDTO[];
  wellnessHistory: WellnessEntryDTO[];
}) {
  if ((!rpeHistory || rpeHistory.length === 0) && (!wellnessHistory || wellnessHistory.length === 0)) {
    return null;
  }

  const formatShortDate = (d: Date) =>
    d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Historial reciente
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-2">
          <p className="font-semibold text-gray-700">RPE últimos días</p>
          {(!rpeHistory || rpeHistory.length === 0) ? (
            <p className="text-gray-500">Sin registros de RPE aún.</p>
          ) : (
            <ul className="space-y-1">
              {rpeHistory.map((entry) => {
                const d = new Date(entry.date);
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-md border px-2 py-1 bg-gray-50"
                  >
                    <span className="text-gray-600">
                      {formatShortDate(d)}
                    </span>
                    <span className="font-medium text-gray-900">
                      {entry.rpe}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-700">Wellness últimos días</p>
            <Link
              href="/jugador/wellness"
              className="text-[11px] text-blue-600 hover:underline"
            >
              Ver más
            </Link>
          </div>
          {!wellnessHistory || wellnessHistory.length === 0 ? (
            <p className="text-gray-500">Sin registros de wellness aún.</p>
          ) : (
            <ul className="space-y-1">
              {wellnessHistory.map((entry) => {
                const d = new Date(entry.date);

                const components: string[] = [];
                if (entry.sleepQuality != null) components.push(`Sueño ${entry.sleepQuality}`);
                if (entry.fatigue != null) components.push(`Fatiga ${entry.fatigue}`);
                if (entry.soreness != null) components.push(`Dolor ${entry.soreness}`);
                if (entry.stress != null) components.push(`Estrés ${entry.stress}`);
                if (entry.mood != null) components.push(`Ánimo ${entry.mood}`);

                return (
                  <li
                    key={entry.id}
                    className="rounded-md border px-2 py-1 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        {d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                    {components.length > 0 && (
                      <p className="mt-0.5 text-[11px] text-gray-700 line-clamp-2">
                        {components.join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function PlayerHomeHeader({ player }: { player: PlayerWithTeam }) {
  return (
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
          <h1 className="text-xl md:text-2xl font-bold">
            Hola{player.name ? `, ${player.name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-gray-600 flex flex-wrap justify-center md:justify-start gap-2 items-center">
            <span>Tu resumen de hoy</span>
            {player.position && <span>· {player.position}</span>}
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
  );
}

type PlayerHomeTodayStatusProps = {
  lastRpe: any;
  rpeLabel: string;
  rpeClass: string;
  wellnessToday: any;
  fakeMinutes: number[];
  feedbacks: any[];
};

function PlayerHomeTodayStatus({
  lastRpe,
  rpeLabel,
  rpeClass,
  wellnessToday,
  fakeMinutes,
  feedbacks,
}: PlayerHomeTodayStatusProps) {
  const hasRpeToday = lastRpe && isToday(lastRpe.date);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* RPE hoy */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              RPE de hoy
            </h2>
          </div>
          {hasRpeToday ? (
            <p className={`text-lg font-semibold ${rpeClass}`}>{rpeLabel}</p>
          ) : (
            <p className="text-sm text-yellow-700">No cargado</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Cómo sentiste la carga de tu último entrenamiento.
          </p>

          {hasRpeToday ? (
            <Link
              href="/jugador/rpe"
              className="block w-full mt-3 text-center text-blue-600 underline text-sm"
            >
              Editar RPE
            </Link>
          ) : (
            <Link
              href="/jugador/rpe"
              className="block w-full mt-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md text-sm"
            >
              Cargar RPE
            </Link>
          )}
        </div>

        {/* Wellness hoy */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Wellness de hoy
          </h2>
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
            <Link
              href="/jugador/wellness"
              className="block w-full mt-3 text-center text-blue-600 underline text-sm"
            >
              Editar Wellness
            </Link>
          ) : (
            <Link
              href="/jugador/wellness"
              className="block w-full mt-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md text-sm"
            >
              Cargar Wellness
            </Link>
          )}
        </div>

        {/* Feedback reciente */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Feedback reciente
          </h2>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aún no tenés feedback registrado.
            </p>
          ) : (
            <ul className="mt-1 space-y-2 text-xs text-gray-700">
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
      </div>

      {/* Minutos últimos 5 partidos (historial rápido) */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
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
      </section>
    </section>
  );
}

function PlayerHomeRoutines({ routines }: { routines: any[] }) {
  if (!routines || routines.length === 0) {
    return (
      <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Rutina de hoy
          </h2>
          <Link
            href="/jugador/rutinas"
            className="text-[11px] text-blue-600 hover:underline"
          >
            Ver todas
          </Link>
        </div>
        <p className="text-sm text-gray-600">
          Todavía no tenés rutinas asignadas por tu CT.
        </p>
      </section>
    );
  }

  const [first, ...rest] = routines;

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Rutina de hoy
        </h2>
        <Link
          href="/jugador/rutinas"
          className="text-[11px] text-blue-600 hover:underline"
        >
          Ver todas
        </Link>
      </div>

      <p className="text-[11px] text-gray-400">
        {new Date().toLocaleDateString()}
      </p>

      {/* Rutina destacada (última creada / de hoy en el futuro) */}
      <div className="rounded-xl border bg-gray-50 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-gray-500 mb-1">
          Rutina asignada por tu CT
        </p>
        <h3 className="text-sm font-semibold text-gray-900 truncate">{first.title}</h3>
        {first.goal && (
          <p className="text-xs text-gray-600 line-clamp-2">{first.goal}</p>
        )}
        <div className="flex items-center justify-between mt-2 gap-2">
          <p className="text-[11px] text-gray-500">
            Creada el {first.createdAt.toLocaleDateString()}
          </p>
          <Link
            href={`/jugador/rutinas/${first.id}`}
            className="inline-flex items-center justify-center rounded-md bg-black px-3 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800"
          >
            Ver rutina
          </Link>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="space-y-1 pt-1 border-t mt-2">
          <p className="text-[11px] font-semibold text-gray-500 mb-1">
            Otras rutinas disponibles
          </p>
          <ul className="space-y-1 text-xs">
            {rest.map((rt) => (
              <li
                key={rt.id}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{rt.title}</p>
                  {rt.goal && (
                    <p className="text-[11px] text-gray-500 truncate">{rt.goal}</p>
                  )}
                </div>
                <Link
                  href={`/jugador/rutinas/${rt.id}`}
                  className="text-[11px] text-blue-600 hover:underline shrink-0"
                >
                  Ver rutina
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PlayerHomeGpsCard() {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        GPS & Carga
      </h2>
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
  );
}