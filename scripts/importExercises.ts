import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

import { prisma } from "../src/lib/prisma";

async function main() {
  // Ruta del archivo Excel
  const excelPath = path.join(process.cwd(), "data", "franco-ejercicios.xlsx");

  if (!fs.existsSync(excelPath)) {
    console.error(`No se encontró el archivo Excel en la ruta: ${excelPath}`);
    process.exit(1);
  }

  console.log(`Leyendo archivo Excel: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    console.error("El archivo Excel no contiene hojas.");
    process.exit(1);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  console.log(`Filas leídas: ${rows.length}`);

  const seenNames = new Set<string>();
  let createdCount = 0;
  let skippedDuplicates = 0;

  for (const row of rows) {
    // Ajustar aquí los nombres de columnas exactos del Excel
    const name = (row["NOMBRE"] ?? row["Nombre"] ?? row["name"]) as string | null;
    const zone = (row["ZONA"] ?? row["Zona"] ?? row["zone"]) as string | null;
    const videoUrl = (row["LINK"] ?? row["Link"] ?? row["video"] ?? row["videoUrl"]) as string | null;

    if (!name) {
      continue; // fila sin nombre, no se puede crear ejercicio
    }

    const trimmedName = name.trim();
    if (!trimmedName) continue;

    // Evitar duplicados dentro del mismo Excel por nombre (case-insensitive)
    const key = trimmedName.toLowerCase();
    if (seenNames.has(key)) {
      skippedDuplicates++;
      continue;
    }
    seenNames.add(key);

    // Evitar duplicados contra la base de datos por name y teamId null
    const existing = await prisma.exercise.findFirst({
      where: {
        teamId: null,
        name: trimmedName,
      },
      select: { id: true },
    });

    if (existing) {
      skippedDuplicates++;
      continue;
    }

    await prisma.exercise.create({
      data: {
        teamId: null,
        name: trimmedName,
        zone: zone?.toString().trim() || null,
        videoUrl: videoUrl?.toString().trim() || null,
      },
    });

    createdCount++;
    if (createdCount % 50 === 0) {
      console.log(`Creados ${createdCount} ejercicios hasta ahora...`);
    }
  }

  console.log(`Importación finalizada. Creados: ${createdCount}, Duplicados/omitidos: ${skippedDuplicates}`);
}

main()
  .catch((err) => {
    console.error("Error al importar ejercicios:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
