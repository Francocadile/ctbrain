import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import RoleGate from "@/components/auth/RoleGate";

export const dynamic = "force-dynamic";

export default async function JugadorRivalPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirect("/login");
  }

  if (session.user.role !== "JUGADOR") {
    return redirect("/");
  }

  const player = (await prisma.player.findFirst({
    where: { userId: session.user.id },
  } as any)) as any;

  if (!player || !player.teamId) {
    return (
      <RoleGate allow={["JUGADOR"]}>
        <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
          <div className="max-w-3xl mx-auto">
            <section className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm space-y-2">
              <h1 className="text-lg font-semibold">Próximo rival</h1>
              <p className="text-sm text-gray-600">
                Todavía no hay información cargada del próximo rival.
              </p>
            </section>
          </div>
        </main>
      </RoleGate>
    );
  }

  const today = new Date();

  const rival = await prisma.rivalReport.findFirst({
    where: {
      teamId: player.teamId,
      matchDate: { gte: today },
    },
    orderBy: { matchDate: "asc" },
  } as any);

  if (!rival) {
    return (
      <RoleGate allow={["JUGADOR"]}>
        <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
          <div className="max-w-3xl mx-auto">
            <section className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm space-y-2">
              <h1 className="text-lg font-semibold">Próximo rival</h1>
              <p className="text-sm text-gray-600">
                Todavía no hay información cargada del próximo rival.
              </p>
            </section>
          </div>
        </main>
      </RoleGate>
    );
  }

  const matchDate = new Date(rival.matchDate);
  const videos: { title?: string | null; url?: string | null }[] =
    Array.isArray(rival.videos) ? (rival.videos as any[]) : [];

  return (
    <RoleGate allow={["JUGADOR"]}>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          <section className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm space-y-4">
            <header className="space-y-1">
              <h1 className="text-xl font-semibold text-gray-900">Próximo rival</h1>
              <p className="text-sm text-gray-600">
                Información del siguiente partido y material preparado por el cuerpo técnico.
              </p>
            </header>

            <div className="space-y-1">
              <p className="text-lg font-semibold text-gray-900">{rival.rivalName}</p>
              {rival.competition && (
                <p className="text-sm text-gray-600">{rival.competition}</p>
              )}
              <p className="text-xs text-gray-500">
                {matchDate.toLocaleDateString()} · {" "}
                {matchDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-800">Notas del cuerpo técnico</h2>
              {rival.notes && rival.notes.trim().length > 0 ? (
                <p className="text-sm text-gray-700 whitespace-pre-line">{rival.notes}</p>
              ) : (
                <p className="text-sm text-gray-500">Sin notas cargadas para este rival.</p>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-800">Videos del rival</h2>
              {videos && videos.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {videos.map((v, idx) => {
                    if (!v || !v.url) return null;
                    const title = v.title && v.title.trim().length > 0 ? v.title : "Video sin título";
                    return (
                      <li key={idx} className="flex items-center justify-between gap-2">
                        <span className="text-gray-800 truncate">{title}</span>
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-100"
                        >
                          Ver video
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  Todavía no hay videos cargados para este rival.
                </p>
              )}
            </section>
          </section>
        </div>
      </main>
    </RoleGate>
  );
}
