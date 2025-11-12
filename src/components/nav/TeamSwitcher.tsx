"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type TeamOption = { id: string; name: string };
type TeamSwitcherProps = { className?: string; label?: string };

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export default function TeamSwitcher({ className, label = "Equipo" }: TeamSwitcherProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const teamIds = useMemo(() => session?.user?.teamIds ?? [], [session?.user?.teamIds]);
  const currentTeamId = session?.user?.currentTeamId ?? null;

  const [options, setOptions] = useState<TeamOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTeams = teamIds.length > 0;
  const teamKey = useMemo(() => (hasTeams ? [...teamIds].sort().join("|") : ""), [hasTeams, teamIds]);

  useEffect(() => {
    if (!hasTeams) {
      setOptions([]);
      setSelected("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/session/team", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const p = await res.json().catch(() => null);
          throw new Error(p?.error || `Error ${res.status}`);
        }
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const entries: TeamOption[] = Array.isArray(payload?.teams)
          ? payload.teams
              .map((t: any): TeamOption => ({
                id: String(t?.id ?? "").trim(),
                name: String(t?.name ?? "").trim() || String(t?.id ?? "").trim(),
              }))
              .filter((t: TeamOption) => Boolean(t.id))
          : [];
        const fallback = entries.length > 0 ? entries : teamIds.map((id) => ({ id, name: id }));
        setOptions(fallback);
        const preferred =
          (payload?.currentTeamId && fallback.find((t) => t.id === payload.currentTeamId)?.id) ||
          (currentTeamId && fallback.find((t) => t.id === currentTeamId)?.id) ||
          fallback[0]?.id ||
          "";
        setSelected(preferred);
      })
      .catch(() => {
        if (cancelled) return;
        setOptions(teamIds.map((id) => ({ id, name: id })));
        setError("No se pudieron cargar los equipos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamKey, currentTeamId, hasTeams, teamIds]);

  useEffect(() => {
    if (!currentTeamId) return;
    setSelected(currentTeamId);
  }, [currentTeamId]);

  if (status === "loading" || !hasTeams) return null;

  const secureSuffix = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = e.target.value;
    if (!nextId || nextId === selected) return;

    const prev = selected;
    setSelected(nextId);
    setSaving(true);
    setError(null);

    try {
      document.cookie = `ctb_team=${encodeURIComponent(nextId)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureSuffix}`;

      const res = await fetch("/api/session/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: nextId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || `Error ${res.status}`);
      }

      await update?.();
      router.refresh();
    } catch (err: any) {
      setSelected(prev);
      setError(err?.message || "No se pudo cambiar de equipo.");
    } finally {
      setSaving(false);
    }
  }

  const rootClass = ["flex flex-col gap-1 text-xs", className].filter(Boolean).join(" ");

  return options.length === 0 ? null : (
    <div className={rootClass}>
      <label className="text-[10px] font-semibold uppercase text-gray-500">{label}</label>
      <select
        value={selected}
        onChange={handleChange}
        disabled={loading || saving}
        className="w-full rounded-md border px-2 py-1.5 text-sm disabled:opacity-60"
      >
        {options.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </div>
  );
}
