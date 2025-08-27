// src/app/ct/page.tsx
import RoleGate from "@/components/auth/RoleGate";

type Dia = "Lun" | "Mar" | "Mié" | "Jue" | "Vie" | "Sáb" | "Dom";
type Sesion = {
  hora: string;
  titulo: string;
  objetivo?: string;
  tipo: "Campo" | "Gimnasio" | "Video" | "Recuperación";
  micro?: "Fuerza" | "Velocidad" | "Táctico" | "Resistencia" | "Descarga";
};

const dias: Dia[] = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const planMock: Record<Dia, Sesion[]> = {
  Lun: [
    { hora: "10:00", titulo: "Activación + Core", tipo: "Gimnasio", micro: "Fuerza", objetivo: "Estabilidad" },
    { hora: "11:00", titulo: "Posesión 6v6+2", tipo: "Campo", micro: "Táctico", objetivo: "Transición" },
  ],
  Mar: [{ hora: "11:00", titulo: "Finalizaciones por bandas", tipo: "Campo", micro: "Velocidad" }],
  Mié: [
    { hora: "10:30", titulo: "Video rival", tipo: "Video", objetivo: "ABP rival" },
    { hora: "11:30", titulo: "ABP propias", tipo: "Campo", micro: "Táctico" },
  ],
  Jue: [{ hora: "11:00", titulo: "Juego reducido 5v5", tipo: "Campo", micro: "Resistencia" }],
  Vie: [
    { hora: "10:00", titulo: "Plan de partido", tipo: "Video" },
    { hora: "11:00", titulo: "Tareas posicionales", tipo: "Campo", micro: "Táctico" },
  ],
  Sáb: [{ hora: "18:00", titulo: "Recuperación + frío", tipo: "Recuperación" }],
  Dom: [],
};

export default async function CtPlanSemanalPage() {
  return (
    <RoleGate allow={["CT"]}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Plan Semanal</h1>
          <p className="mt-1 text-sm text-gray-600">Esqueleto inicial. Próximo paso: persistencia Prisma + CRUD.</p>
        </header>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge>Campo</Badge><Badge>Gimnasio</Badge><Badge>Video</Badge><Badge>Recuperación</Badge>
        </div>

        {/* Grid semanal */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {dias.map((d) => (
              <div key={d} className="rounded-xl border bg-gray-50">
                <div className="border-b px-3 py-2 text-sm font-semibold">{d}</div>
                <div className="space-y-2 p-3">
                  {planMock[d].length === 0 ? (
                    <p className="text-xs text-gray-400">Sin sesiones</p>
                  ) : (
                    planMock[d].map((s, idx) => <SesionCard key={idx} s={s} />)
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </RoleGate>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border px-2 py-1 text-gray-600">{children}</span>;
}
function SesionCard({ s }: { s: Sesion }) {
  const chip =
    s.tipo === "Campo" ? "bg-green-100 text-green-800" :
    s.tipo === "Gimnasio" ? "bg-amber-100 text-amber-800" :
    s.tipo === "Video" ? "bg-blue-100 text-blue-800" :
    "bg-purple-100 text-purple-800";
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{s.hora}</div>
        <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${chip}`}>{s.tipo}</span>
      </div>
      <div className="mt-1 text-sm font-medium">{s.titulo}</div>
      {s.objetivo && <div className="mt-1 text-[12px] text-gray-600"><span className="font-semibold">Obj:</span> {s.objetivo}</div>}
      {s.micro && <div className="mt-1 text-[11px] text-gray-500">Micro: {s.micro}</div>}
    </div>
  );
}

