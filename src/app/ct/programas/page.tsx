import Link from "next/link";
import { dbScope, scopedFindManyArgs } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

export default async function CTProgramsPage() {
  const { prisma, team } = await dbScope();

  const programs = await prisma.program.findMany(
    scopedFindManyArgs(team.id, {
      orderBy: [{ createdAt: "desc" }],
    }) as any,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Programas</h1>
        <Link href="/ct/rutinas" className="text-sm text-blue-600 hover:underline">
          Ver Rutinas
        </Link>
      </div>

      {programs.length === 0 ? (
        <div className="rounded border p-4 text-sm text-gray-600">No hay programas todavía.</div>
      ) : (
        <div className="rounded border divide-y">
          {programs.map((p: any) => (
            <Link key={p.id} href={`/ct/programas/${p.id}`} className="block p-4 hover:bg-gray-50">
              <div className="font-medium">{p.title}</div>
              {p.description ? <div className="text-sm text-gray-600">{p.description}</div> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
