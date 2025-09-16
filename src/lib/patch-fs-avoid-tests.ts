// src/lib/patch-fs-avoid-tests.ts
// Parche defensivo: evita que cualquier require perdido intente leer
// "./test/data/05-versions-space.pdf" en runtime (Vercel no tiene ese archivo).

import * as fs from "node:fs";
import * as path from "node:path";

type RFN = typeof fs.readFileSync;
const _origReadFileSync: RFN = fs.readFileSync.bind(fs);

function matchesTestPdf(p: unknown): boolean {
  if (typeof p !== "string") return false;
  // Normalizamos para evitar diferencias de separadores
  const norm = p.replace(/\\/g, "/");
  return norm.endsWith("/test/data/05-versions-space.pdf") || norm === "./test/data/05-versions-space.pdf";
}

function fakePdfBuffer(): Buffer {
  // Un PDF mínimo válido para que cualquier parser no crashee por buffer vacío.
  // No lo vamos a usar realmente, pero evita cascadas de errores.
  const minimal = "%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF";
  return Buffer.from(minimal, "utf-8");
}

// @ts-ignore – sobrescribimos para interceptar
(fs as any).readFileSync = function patchedReadFileSync(
  p: any,
  options?: any
): any {
  try {
    if (matchesTestPdf(p)) {
      // Evitamos ENOENT devolviendo un PDF sintético.
      return fakePdfBuffer();
    }
  } catch {
    // Silencioso: si algo falla en el check, caemos al original
  }
  return _origReadFileSync(p as any, options);
};
