"use client";

import PlannerMatchLink from "@/components/PlannerMatchLink";
import type { SessionDTO } from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";

const DAYFLAG_TAG = "DAYFLAG";
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const isDayFlag = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));

type DayFlag =
  | { kind: "NONE" }
  | { kind: "LIBRE" }
  | { kind: "PARTIDO"; rival?: string; logoUrl?: string };

function parseDayFlagTitle(title?: string | null): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival, logoUrl };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

export default function DashboardMatchChip({
  sessions,
  turn,
  className = "text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50",
  fallbackHref,
}: {
  sessions: SessionDTO[];         // sesiones del día (ya las tenés en el dashboard)
  turn: TurnKey;                  // "morning" o "afternoon"
  className?: string;             // estilos del chip/botón
  fallbackHref?: string | null;   // adónde linkear si NO es partido (tu link de "sesión")
}) {
  const df = parseDayFlagTitle(sessions.find((s) => isDayFlag(s, turn))?.title);

  if (df.kind === "PARTIDO") {
    // Muestra el botón que resuelve el rival por nombre y navega a /ct/rivales/[id]
    return (
      <PlannerMatchLink
        rivalName={df.rival || ""}
        className={className}
        label="Plan de partido"
      />
    );
  }

  // Si no es partido, conserva tu chip original de "sesión" (si pasás fallbackHref)
  return fallbackHref ? (
    <a href={fallbackHref} className={className}>
      sesión
    </a>
  ) : null;
}
