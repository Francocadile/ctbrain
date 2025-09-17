// src/app/ct/rivales/[id]/layout.tsx
import Image from "next/image";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import Tabs from "./tabs";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

type Props = {
  children: React.ReactNode;
  params: { id: string };
};

export default async function RivalLayout({ children, params }: Props) {
  const rival = await prisma.rival.findUnique({
    where: { id: params.id },
    select: {
      name: true,
      logoUrl: true,
      coach: true,
      baseSystem: true,
      nextMatchDate: true,
      nextMatchCompetition: true,
    },
  });

  const baseHref = `/ct/rivales/${params.id}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Encabezado con escudo y datos básicos */}
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {rival?.logoUrl ? (
            <Image
              src={rival.logoUrl}
              alt={rival?.name ?? "Rival"}
              width={56}
              height={56}
              className="rounded"
            />
          ) : (
            <div className="w-14 h-14 rounded bg-gray-200" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold leading-tight">
                {rival?.name ?? "Rival"}
              </h1>
              <p className="text-sm text-gray-600">
                {[
                  rival?.coach ? `DT: ${rival.coach}` : null,
                  rival?.baseSystem ? `Sistema base: ${rival.baseSystem}` : null,
                  rival?.nextMatchDate
                    ? `Próximo partido: ${rival.nextMatchDate.toLocaleString()}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
            <Link
              href="/ct/rivales"
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Rivales
            </Link>
          </div>

          {/* Tabs (único menú, debajo del escudo) */}
          <div className="mt-6">
            <Tabs
              baseHref={baseHref}
              tabs={[
                { slug: "", label: "Resumen" },
                { slug: "plan", label: "Plan de partido" },
                { slug: "videos", label: "Videos" },
                { slug: "estadisticas", label: "Estadísticas" },
                { slug: "notas", label: "Notas internas" },
                { slug: "visibilidad", label: "Visibilidad" },
                { slug: "importar", label: "Importar" },
                { slug: "plantel", label: "Plantel" }, // ← NUEVO al lado de Resumen
              ]}
            />
          </div>
        </div>
      </div>

      {/* Contenido de cada pestaña */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
