// src/app/ct/rivales/[id]/layout.tsx
// Objetivo: NO renderizar un segundo menú aquí.
// Dejamos que cada página (por ej. Resumen) pinte su propio Tabs debajo del escudo.

export default function RivalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
