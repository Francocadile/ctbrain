import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function JugadorRutinasPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "JUGADOR") {
    return redirect("/login");
  }

  const userId = session.user.id as string;

  const routines = (await prisma.routine.findMany({
    where: {
      OR: [
        { shareMode: "ALL_PLAYERS" },
        {
          shareMode: "SELECTED_PLAYERS",
          sharedWithPlayers: {
            some: { playerId: userId },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  } as any)) as any[];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold">Mis rutinas</h1>

      {routines.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no tenés rutinas asignadas.</p>
      ) : (
        <div className="space-y-3">
          {routines.map((r) => (
            <Link
              key={r.id}
              href={`/jugador/rutinas/${r.id}`}
              className="block rounded-lg border bg-white p-3 shadow-sm hover:bg-gray-50 transition"
            >
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-gray-900">{r.title}</h2>
                {r.goal && (
                  <p className="text-[11px] text-gray-600">Objetivo: {r.goal}</p>
                )}
                {r.notesForAthlete && (
                  <p className="text-[11px] text-gray-500 line-clamp-2 whitespace-pre-line">
                    {r.notesForAthlete}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
