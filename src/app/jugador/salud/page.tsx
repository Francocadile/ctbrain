import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import RoleGate from "@/components/auth/RoleGate";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

function formatDate(date: Date | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatZone(bodyPart: string | null, laterality: string | null) {
  if (!bodyPart) return "Sin zona";
  if (laterality && laterality !== "NA") {
    return `${bodyPart} (${laterality})`;
  }
  return bodyPart;
}

function statusChipColor(status: string | null | undefined) {
  switch (status) {
    case "BAJA":
      return "bg-red-100 text-red-700 border-red-200";
    case "REINTEGRO":
    case "LIMITADA":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "ALTA":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default async function JugadorSaludPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "JUGADOR") {
    redirect("/");
  }

  const entries = await prisma.clinicalEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 10,
  });

  const today = new Date();
  const current =
    entries.find((e) => e.date <= today) ?? (entries.length > 0 ? entries[0] : null);

  return (
    <RoleGate allow={["JUGADOR"]}>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold text-gray-900">
              Mi estado médico
            </h1>
            <p className="text-sm text-gray-600">
              Vista solo lectura de los partes clínicos cargados por el cuerpo médico.
            </p>
          </header>

          {/* Bloque 1: Estado actual */}
          <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Estado médico actual
            </h2>
            {entries.length === 0 || !current ? (
              <p className="text-sm text-gray-600">
                Todavía no hay partes clínicos cargados para vos.
              </p>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-500 text-xs uppercase tracking-wide">
                    Estado
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusChipColor(
                      current.status,
                    )}`}
                  >
                    {current.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Diagnóstico
                  </p>
                  <p className="text-sm text-gray-800">
                    {current.diagnosis || "Sin diagnóstico cargado"}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Zona
                    </p>
                    <p>{formatZone(current.bodyPart, current.laterality)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Fechas
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Inicio:</span>{" "}
                      {formatDate(current.startDate || current.date)}
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">ETR:</span>{" "}
                      {current.expectedReturn
                        ? formatDate(current.expectedReturn)
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Restricciones */}
                {(current.capMinutes != null ||
                  current.gymOnly ||
                  current.noContact ||
                  current.noSprint ||
                  current.noChangeOfDirection) && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Restricciones actuales
                    </p>
                    <ul className="list-disc pl-4 text-sm text-gray-700 space-y-0.5">
                      {current.capMinutes != null && (
                        <li>Cap minutos: {current.capMinutes}</li>
                      )}
                      {current.gymOnly && <li>Solo gimnasio</li>}
                      {current.noContact && <li>Sin contacto</li>}
                      {current.noSprint && <li>Sin sprints</li>}
                      {current.noChangeOfDirection && (
                        <li>Sin cambios de dirección</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Bloque 2: Historial reciente */}
          {entries.length > 0 && (
            <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Historial clínico reciente
                </h2>
                <p className="text-xs text-gray-500">
                  Últimos {entries.length} episodios
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-gray-700">
                  <thead>
                    <tr className="border-b bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-1">Fecha</th>
                      <th className="px-2 py-1">Estado</th>
                      <th className="px-2 py-1">Zona</th>
                      <th className="px-2 py-1">Diagnóstico</th>
                      <th className="px-2 py-1">ETR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b last:border-b-0">
                        <td className="px-2 py-1 align-top">
                          {formatDate(e.date)}
                        </td>
                        <td className="px-2 py-1 align-top">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusChipColor(
                              e.status,
                            )}`}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="px-2 py-1 align-top">
                          {formatZone(e.bodyPart, e.laterality)}
                        </td>
                        <td className="px-2 py-1 align-top max-w-xs truncate">
                          {e.diagnosis || "—"}
                        </td>
                        <td className="px-2 py-1 align-top">
                          {e.expectedReturn
                            ? formatDate(e.expectedReturn)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </RoleGate>
  );
}
