import { dbScope } from "@/lib/dbScope";
import { RoutineDetailClient } from "./RoutineDetailClient";

export const dynamic = "force-dynamic";

export default async function CTRoutineDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { prisma, team } = await dbScope();

  const routine = await prisma.routine.findFirst({
    where: { id: params.id, teamId: team.id },
    include: {
      items: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!routine) {
    return <div className="max-w-3xl mx-auto p-4 text-sm text-gray-600">Rutina no encontrada.</div>;
  }

  const dto = {
    id: routine.id,
    title: routine.title,
    description: routine.description ?? null,
  items: routine.items.map((it: any) => ({
      id: it.id,
      title: it.title,
      description: it.description ?? null,
      order: it.order,
    })),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <RoutineDetailClient routine={dto} />
    </div>
  );
}
