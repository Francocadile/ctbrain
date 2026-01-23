import type { TeamVideoDTO } from "@/lib/videos";

type Props = {
  video: Pick<TeamVideoDTO, "visibleToDirectivo" | "audienceMode" | "selectedUserIds">;
  active?: boolean;
  className?: string;
};

export default function VisibilityBadges({ video, active, className }: Props) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide";
  const tone = active
    ? "border-white/20 bg-white/10 text-white"
    : "border-gray-200 bg-gray-50 text-gray-700";

  const chips: { key: string; label: string }[] = [];
  if (video.visibleToDirectivo) chips.push({ key: "directivo", label: "Directivos" });
  if (video.audienceMode === "ALL") chips.push({ key: "all", label: "Todos" });
  if (video.audienceMode === "SELECTED")
    chips.push({ key: "selected", label: `Seleccionados (${video.selectedUserIds.length})` });

  return (
    <div className={className ?? ""}>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c.key} className={`${base} ${tone}`}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
