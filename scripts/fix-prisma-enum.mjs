import fs from 'fs';

const file = 'prisma/schema.prisma';
let src = fs.readFileSync(file, 'utf8');

// 1) Mantener solo la PRIMERA definición de enum SessionType
let enumCount = 0;
src = src.replace(/enum\s+SessionType\s*\{[\s\S]*?\}/g, (m) => {
  enumCount++;
  return enumCount === 1 ? m : '';
});

// 2) Remover @default(GENERAL) solo cuando se aplica a campos SessionType
// Casos: ": SessionType @default(GENERAL)" o "SessionType @default(GENERAL)"
src = src.replace(/:\s*SessionType\s*@default\(\s*GENERAL\s*\)/g, ': SessionType');
src = src.replace(/\bSessionType\s*@default\(\s*GENERAL\s*\)/g, 'SessionType');

// 3) Limpieza de saltos de línea múltiples
src = src.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(file, src, 'utf8');
console.log(JSON.stringify({ removedEnums: Math.max(0, enumCount - 1) }));
