// src/app/ct/rivales/[id]/layout.tsx
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
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
    select: { id: true, name: true, coach: true, baseSystem: true },
  });

  // Contenedor principal (igual que el resto de las vistas)
  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Encabezado “clásico” con nombre/escudo ya lo tenés en cada página.
          No agregamos ninguna barra adicional arriba. */}

      {/* ÚNICA barra de pestañas (debajo del encabezado) */}
      <div className="mt-4">
        <Tabs
          baseHref={`/ct/rivales/${params.id}`}
          tabs={[
            { slug: "", label: "Resumen" },
            { slug: "plan", label: "Plan de partido" },
            { slug: "videos", label: "Videos" },
            { slug: "estadisticas", label: "Estadísticas" },
            { slug: "notas", label: "Notas internas" },
            { slug: "visibilidad", label: "Visibilidad" },
            { slug: "importar", label: "Importar" },
            { slug: "plantel", label: "Plantel" }, // ← NUEVO, en la misma barra
          ]}
        />
      </div>

      {/* Contenido de cada pestaña */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
