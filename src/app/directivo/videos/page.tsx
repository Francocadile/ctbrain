import RoleGate from "@/components/auth/RoleGate";
import VideoViewer from "@/components/videos/VideoViewer";
import { listTeamVideos } from "@/lib/videos";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DirectivoVideosPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;

  const videos = await listTeamVideos({
    roles: [Role.DIRECTIVO, Role.ADMIN, Role.CT],
    scope: role === Role.DIRECTIVO ? "directivo" : "all",
  });

  return (
    <RoleGate allow={["DIRECTIVO", "ADMIN", "CT"]} requireTeam>
      <main className="min-h-[70vh] space-y-8 px-6 py-10">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Videos compartidos</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Análisis audiovisual del equipo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Revisá clips tácticos, scouting de rivales y registros internos publicados por el cuerpo técnico del equipo actual.
          </p>
        </header>

        <VideoViewer initialVideos={videos} />
      </main>
    </RoleGate>
  );
}
