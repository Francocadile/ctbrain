  async function fetchRPE(d: string): Promise<RPERow[]> {
    const res = await fetch(`/api/metrics/rpe?date=${d}`, { cache: "no-store" });
    if (!res.ok) return [];
    const arr = await res.json();
    if (!Array.isArray(arr)) return [];
    return arr.map((r: any) => {
      const srpeVal =
        (r.load ?? r.srpe ?? (Number(r.rpe ?? 0) * Number(r.duration ?? 0))) ?? 0; // ← solo nullish
      return {
        userName: r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador",
        srpe: Number(srpeVal),
      };
    });
  }
