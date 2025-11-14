// src/app/api/sessions/import-csv/route.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { dbScope, scopedCreateArgs, scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

/** ---------- Utilidades fecha ---------- */
function ymdToDateUTC(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toYMDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getMondayUTC(base: Date) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const dow = d.getUTCDay() || 7; // 1..7 (lunes=1)
  if (dow !== 1) d.setUTCDate(d.getUTCDate() - (dow - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function computeISOForSlot(dayYmd: string, turn: "morning" | "afternoon") {
  const base = ymdToDateUTC(dayYmd);
  base.setUTCHours(turn === "morning" ? 9 : 15, 0, 0, 0);
  return base.toISOString();
}

/** ---------- Convenciones del planner ---------- */
const DAYFLAG_TAG = "DAYFLAG";
function dayFlagMarker(turn: "morning" | "afternoon") { return `[${DAYFLAG_TAG}:${turn}]`; }
function cellMarker(turn: "morning" | "afternoon", row: string) { return `[GRID:${turn}:${row}]`; }
function buildDayFlagTitle(kind: "NONE" | "PARTIDO" | "LIBRE", rival?: string, logoUrl?: string) {
  if (kind === "PARTIDO") return `PARTIDO|${rival ?? ""}|${logoUrl ?? ""}`;
  if (kind === "LIBRE") return "LIBRE";
  return "";
}

const VALID_ROWS = new Set([
  "PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO",
  "LUGAR", "HORA", "VIDEO", "NOMBRE SESIÓN"
]);

/** CSV parser simple con comillas */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ",") { pushField(); i++; continue; }
      if (ch === "\r") { i++; continue; }
      if (ch === "\n") { pushField(); pushRow(); i++; continue; }
      field += ch; i++; continue;
    }
  }
  pushField();
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) pushRow();
  return rows;
}

/** Tipos internos */
type CSVRow = {
  date: string;                           // YYYY-MM-DD
  turn: "morning" | "afternoon";
  row?: string;
  title?: string;
  place?: string | null;
  time?: string | null;                   // HH:MM
  video_label?: string | null;
  video_url?: string | null;
  day_flag?: "NONE" | "PARTIDO" | "LIBRE" | "";
  flag_rival?: string | null;
  flag_logo?: string | null;
};

type PlanAction =
  | { kind: "CELL"; ymd: string; turn: "morning" | "afternoon"; row: string; value: string }
  | { kind: "FLAG"; ymd: string; turn: "morning" | "afternoon"; flag: "PARTIDO" | "LIBRE"; rival?: string; logo?: string }
  | { kind: "CLEAR_CELL"; ymd: string; turn: "morning" | "afternoon"; row: string }
  | { kind: "CLEAR_FLAG"; ymd: string; turn: "morning" | "afternoon" };

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Mapea CSV -> acciones del planner */
function rowsToActions(rows: CSVRow[]) {
  const actions: PlanAction[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const ctx = `fila ${idx + 2}`;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || "")) { errors.push(`${ctx}: date inválida`); continue; }
    if (r.turn !== "morning" && r.turn !== "afternoon") { errors.push(`${ctx}: turn debe ser morning|afternoon`); continue; }

    const df = (r.day_flag || "").toUpperCase() as "NONE" | "PARTIDO" | "LIBRE" | "";
    if (df === "PARTIDO" || df === "LIBRE") {
      actions.push({ kind: "FLAG", ymd: r.date, turn: r.turn, flag: df, rival: r.flag_rival || undefined, logo: r.flag_logo || undefined });
    } else if (df === "NONE") {
      actions.push({ kind: "CLEAR_FLAG", ymd: r.date, turn: r.turn });
    }

    const rowName = (r.row || "").trim();
    if (rowName) {
      if (!VALID_ROWS.has(rowName)) { errors.push(`${ctx}: row inválido "${rowName}"`); continue; }
      let value = (r.title || "").trim();

      if (rowName === "VIDEO") {
        const label = (r.video_label || "").trim();
        const url = (r.video_url || "").trim();
        if (!label && !url && !value) { warnings.push(`${ctx}: VIDEO vacío`); continue; }
        value = label && url ? `${label}|${url}` : (url ? url : label);
        if (url && !/^https?:\/\//i.test(url)) warnings.push(`${ctx}: URL de video no parece válida`);
      }

      if (rowName === "LUGAR" && r.place) value = r.place.trim();
      if (rowName === "HORA" && r.time) value = r.time.trim();

      if (!value) actions.push({ kind: "CLEAR_CELL", ymd: r.date, turn: r.turn, row: rowName });
      else actions.push({ kind: "CELL", ymd: r.date, turn: r.turn, row: rowName, value });
    }
  }

  return { actions, warnings, errors };
}

export async function POST(req: Request) {
  try {
    const { prisma, team, user } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const csvText: string = body.csvText || "";
    const targetStart: string | null = body.targetStart || null; // YYYY-MM-DD
    const overwrite: boolean = !!body.overwrite;
    const dryRun: boolean = !!body.dryRun;

    if (!csvText.trim()) {
      return NextResponse.json({ error: "csvText vacío" }, { status: 400 });
    }

    // Parse
    const rowsRaw = parseCSV(csvText);
    if (!rowsRaw.length) return NextResponse.json({ error: "CSV sin filas" }, { status: 400 });

    // Header
    const header = rowsRaw[0].map(normalizeHeader);
    const required = ["date", "turn"];
    for (const r of required) {
      if (!header.includes(r)) {
        return NextResponse.json({ error: `Falta columna requerida: ${r}` }, { status: 400 });
      }
    }

    // Acomodo a objetos
    const rows: CSVRow[] = rowsRaw.slice(1).map(cols => {
      const obj: any = {};
      header.forEach((h, i) => obj[h] = (cols[i] ?? "").trim());
      obj.turn = (obj.turn || "").toLowerCase();
      if (obj.day_flag) obj.day_flag = String(obj.day_flag).toUpperCase();
      return obj as CSVRow;
    });

    const { actions, warnings, errors } = rowsToActions(rows);
    if (errors.length) {
      return NextResponse.json({ ok: false, errors, warnings }, { status: 400 });
    }

    // Alineación (opcional)
    let diffDays = 0;
    if (targetStart) {
      const minDate = rows
        .map(r => r.date)
        .filter(Boolean)
        .map(ymdToDateUTC)
        .sort((a, b) => a.getTime() - b.getTime())[0] || new Date();

      const sourceMonday = getMondayUTC(minDate);
      const targetMonday = getMondayUTC(ymdToDateUTC(targetStart));
      diffDays = Math.round((targetMonday.getTime() - sourceMonday.getTime()) / (24 * 3600 * 1000));
    }

    // Dry-run
    if (dryRun) {
      const counts = {
        cell_set: actions.filter(a => a.kind === "CELL").length,
        cell_clear: actions.filter(a => a.kind === "CLEAR_CELL").length,
        flag_set: actions.filter(a => a.kind === "FLAG").length,
        flag_clear: actions.filter(a => a.kind === "CLEAR_FLAG").length,
      };
      return NextResponse.json({ ok: true, dryRun: true, diffDays, counts, warnings });
    }

    // Aplicar cambios
    const result = await prisma.$transaction(async (tx) => {
      let created = 0, updated = 0, deleted = 0;

      for (const a of actions) {
        const ymd = diffDays ? toYMDUTC(addDaysUTC(ymdToDateUTC(a.ymd), diffDays)) : a.ymd;

        if (a.kind === "CLEAR_FLAG") {
          const marker = `${dayFlagMarker(a.turn)} | ${ymd}`;
          deleted += await tx.session
            .deleteMany({ where: scopedWhere(team.id, { description: marker }) as Prisma.SessionWhereInput })
            .then(r => r.count);
          continue;
        }

        if (a.kind === "FLAG") {
          const marker = `${dayFlagMarker(a.turn)} | ${ymd}`;
          const title = buildDayFlagTitle(a.flag, a.rival, a.logo);
          const iso = computeISOForSlot(ymd, a.turn);

          if (overwrite) {
            deleted += await tx.session
              .deleteMany({ where: scopedWhere(team.id, { description: marker }) as Prisma.SessionWhereInput })
              .then(r => r.count);
          }

          const existing = await tx.session.findFirst({
            where: scopedWhere(team.id, { description: marker }) as Prisma.SessionWhereInput,
          });
          if (!existing) {
            // ✅ asignamos owner
            const data: any = {
              title,
              description: marker,
              date: new Date(iso),
              type: "GENERAL",
              user: { connect: { id: userId } },
              createdBy: userId, // si existe en el schema, queda seteado
            };
            await tx.session.create(scopedCreateArgs(team.id, { data }));
            created++;
          } else {
            await tx.session.update({ where: { id: existing.id }, data: { title, date: new Date(iso) } });
            updated++;
          }
          continue;
        }

        if (a.kind === "CLEAR_CELL") {
          const marker = `${cellMarker(a.turn, a.row)} | ${ymd}`;
          deleted += await tx.session
            .deleteMany({ where: scopedWhere(team.id, { description: marker }) as Prisma.SessionWhereInput })
            .then(r => r.count);
          continue;
        }

        if (a.kind === "CELL") {
          const marker = `${cellMarker(a.turn, a.row)} | ${ymd}`;
          const iso = computeISOForSlot(ymd, a.turn);

          if (overwrite) {
            deleted += await tx.session
              .deleteMany({ where: scopedWhere(team.id, { description: marker }) as Prisma.SessionWhereInput })
              .then(r => r.count);
          }

          const existing = await tx.session.findFirst({
            where: scopedWhere(team.id, { description: marker }) as Prisma.SessionWhereInput,
          });
          if (!existing) {
            // ✅ asignamos owner
            const data: any = {
              title: a.value,
              description: marker,
              date: new Date(iso),
              type: "GENERAL",
              user: { connect: { id: userId } },
              createdBy: userId, // si existe
            };
            await tx.session.create(scopedCreateArgs(team.id, { data }));
            created++;
          } else {
            await tx.session.update({
              where: { id: existing.id },
              data: { title: a.value, date: new Date(iso) },
            });
            updated++;
          }
          continue;
        }
      }

      return { created, updated, deleted };
    });

    return NextResponse.json({ ok: true, ...result, warnings, diffDays });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Error aplicando CSV" }, { status: 500 });
  }
}
