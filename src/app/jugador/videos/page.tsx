import RoleGate from "@/components/auth/RoleGate";
import VideoViewer from "@/components/videos/VideoViewer";
import { listTeamVideos } from "@/lib/videos";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function JugadorVideosPage() {
  const videos = await listTeamVideos({ roles: [Role.JUGADOR] });

  return (
    <RoleGate allow={["JUGADOR"]} requireTeam>
      <main className="min-h-[70vh] space-y-8 px-6 py-10">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Videos del CT</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Revisá los clips del equipo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Acá vas a ver los videos públicos para todo el plantel y los que el CT te asignó.
          </p>
        </header>

        <VideoViewer initialVideos={videos} />
      </main>
    </RoleGate>
  );
}
