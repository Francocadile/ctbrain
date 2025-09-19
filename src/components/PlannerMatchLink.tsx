// src/components/PlannerMatchLink.tsx
import type { SessionDTO } from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";

type Props = {
  /** Nombre del rival (preferido). */
  rivalName?: string | null;
  /** Opcional: sesiones del día para extraer el rival del flag si no llega rivalName. */
  sessions?: SessionDTO[];
  turn?: TurnKey;

  /** Estilos y texto */
  className?: string;
  label?: string;

  /** Dónde ir si no se puede resolver rival */
  fallbackHref?: string;
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

function resolveHref({
  rivalName,
  sessions,
  turn = "morning",
  fallbackHref,
}: Props): string {
  // 1) Si viene rival explícito, linkeamos al listado filtrado (con intención de abrir plan)
  if (rivalName && rivalName.trim()) {
    return `/ct/rivales?q=${encodeURIComponent(rivalName.trim())}&open=plan`;
  }

  // 2) Intento secundario: deducir del flag del día
  const s = (sessions || []).find(
    (x) => typeof x.description === "string" && x.description.startsWith(dayFlagMarker(turn))
  );
  const df = parseDayFlagTitle(s?.title);
  if (df.kind === "PARTIDO" && df.rival) {
    return `/ct/rivales?q=${encodeURIComponent(df.rival)}&open=plan`;
  }

  // 3) Fallback
  return fallbackHref || "#";
}

export default function PlannerMatchLink(props: Props) {
  const href = resolveHref(props);
  return (
    <a href={href} className={props.className}>
      {props.label ?? "Plan de partido"}
    </a>
  );
}
