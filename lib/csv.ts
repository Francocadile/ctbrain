// src/lib/csv.ts
export function toCsv(
  rows: Array<Record<string, any>>,
  headers?: string[]
): string {
  if (!rows || rows.length === 0) return "";

  const cols = headers && headers.length ? headers : Object.keys(rows[0]);

  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const head = cols.map(esc).join(",");
  const body = rows.map((r) => cols.map((h) => esc(r[h])).join(",")).join("\n");

  // BOM para Excel
  return "\uFEFF" + head + "\n" + body;
}
