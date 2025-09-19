// src/components/DashboardMatchChip.tsx
import PlannerMatchLink from "@/components/PlannerMatchLink";
import type { SessionDTO } from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";

type Props = {
  sessions: SessionDTO[];     // sesiones del día (ya las tenés en el dashboard)
  turn: TurnKey;              // "morning" | "afternoon"
  className?: string;         // estilos del botoncito
  fallbackHref?: string;      // a /ct/sessions/by-day/... cuando no es partido
};

const DAYFLAG_TAG = "DAYFLAG";
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;

function parseDayFlagTitle(title?: string | null) {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" as const };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO" as const, rival, logoUrl };
  if (kind === "LIBRE") return { kind: "LIBRE" as const };
  return { kind: "NONE" as const };
}

export default function DashboardMatchChip({
  sessions,
  turn,
  className,
  fallbackHref = "#",
}: Props) {
  const flagSession = sessions.find(
    (s) => typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn))
  );
  const df = parseDayFlagTitle(flagSession?.title);

  if (df.kind === "PARTIDO") {
    return (
      <PlannerMatchLink
        rivalName={df.rival || ""}
        className={className}
        label="Plan de partido"
        fallbackHref={fallbackHref}
      />
    );
  }

  // Normal / Libre: mostrar acceso a sesiones del día
  return (
    <a href={fallbackHref} className={className}>
      sesión
    </a>
  );
}
