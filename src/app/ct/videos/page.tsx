import RoleGate from "@/components/auth/RoleGate";
import VideoManager from "@/components/videos/VideoManager";
import { listTeamVideos } from "@/lib/videos";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CTVideosPage() {
  const videos = await listTeamVideos({ roles: [Role.CT, Role.ADMIN] });

  return (
    <RoleGate allow={["CT", "ADMIN"]} requireTeam>
      <main className="min-h-[70vh] space-y-8 px-6 py-10">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Biblioteca de videos</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Comparte análisis y clips clave</h1>
          <p className="mt-2 text-sm text-gray-600">
            Subí videos del equipo propio o rivales para que directivos y cuerpo técnico los revisen desde cualquier dispositivo.
          </p>
        </header>

        <VideoManager initialVideos={videos} />
      </main>
    </RoleGate>
  );
}
