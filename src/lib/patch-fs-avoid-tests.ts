// src/lib/patch-fs-avoid-tests.ts
// Parche defensivo: si ALGÚN módulo residual intenta leer
// "./test/data/05-versions-space.pdf" en runtime (Vercel no tiene ese archivo),
// lo interceptamos y devolvemos un PDF mínimo sintético para evitar ENOENT.

import * as fs from "node:fs";

type RFN = typeof fs.readFileSync;
const _origReadFileSync: RFN = fs.readFileSync.bind(fs);

function matchesTestPdf(p: unknown): boolean {
  if (typeof p !== "string") return false;
  const norm = p.replace(/\\/g, "/");
  return norm.endsWith("/test/data/05-versions-space.pdf") || norm === "./test/data/05-versions-space.pdf";
}

function fakePdfBuffer(): Buffer {
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
      return fakePdfBuffer();
    }
  } catch {
    // Si algo falla en el check, caemos al original
  }
  return _origReadFileSync(p as any, options);
};
