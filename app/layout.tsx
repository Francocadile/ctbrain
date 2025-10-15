import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CTBrain",
  description: "Plataforma integral de gestión deportiva",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
