"use client";

import * as React from "react";


const Info = ({ text }: { text: string }) => (
  <div role="status" className="rounded-xl border p-3 text-sm text-muted-foreground">
    {text}
  </div>
);

type AnySession = {
  id?: string | number;
  name?: string;
  title?: string;
  place?: string;
  location?: string;
  startAt?: string;
  date?: string;
  time?: string;
  dayLabel?: string;
  [key: string]: any;
};

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // lunes
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
}

async function tryFetch(url: string) {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as AnySession[] | { data?: AnySession[] };
  } catch {
    return null;
  }
}
async function fetchWeekSessions(): Promise<AnySession[]> {
  const candidates = [
    "/api/ct/sessions?scope=week&relative=0",
    "/api/sessions?scope=week&relative=0",
    "/api/planner?scope=week&relative=0",
    "/api/search?scope=sessions&week=current",
  ];
  for (const u of candidates) {
    const data = await tryFetch(u);
    if (!data) continue;
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).data)) return (data as any).data as AnySession[];
  }
  return [];
}
function getSessionDate(s: AnySession): Date | null {
  const raw = s.startAt || s.date;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  if (s.time) {
    const now = new Date();
    const [hh, mm] = String(s.time).split(":").map((x) => parseInt(x, 10));
    now.setHours(hh || 0, mm || 0, 0, 0);
    return now;
  }
  return null;
}

export default function JugadorPlanSemanalPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sessions, setSessions] = React.useState<AnySession[]>([]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchWeekSessions();
        if (!alive) return;
        setSessions(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setError("No se pudo cargar la planificación. Probá más tarde.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const start = startOfWeek();
  const end = endOfWeek();

  const byDay = React.useMemo(() => {
    const map = new Map<string, AnySession[]>();
    for (const s of sessions) {
      const d = getSessionDate(s);
      const key =
        s.dayLabel ||
        (d ? d.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "2-digit" }) : "Sin fecha");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [sessions]);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Planificación semanal</h1>
        <p className="text-sm text-muted-foreground">
          Semana del {fmt(start)} al {fmt(end)} — Solo lectura
        </p>
      </header>

      {loading && <p className="text-sm">Cargando…</p>}
  {error && <Info text={error} />}

      {!loading && !error && byDay.length === 0 && (
        <Info text="No hay sesiones planificadas esta semana" />
      )}

      {!loading && !error && byDay.length > 0 && (
        <div className="space-y-3">
          {byDay.map(([day, list]) => (
            <div key={day} className="rounded-xl border p-3">
              <h3 className="font-medium mb-2">{day}</h3>
              <ul className="space-y-2">
                {list.map((s, i) => {
                  const d = getSessionDate(s);
                  const name = s.name || s.title || "Sesión";
                  const place = s.place || s.location || "";
                  const hour =
                    s.time ||
                    (d ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "");
                  return (
                    <li key={s.id ?? i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {place ? `${place} · ` : ""}{hour ? `${hour}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
