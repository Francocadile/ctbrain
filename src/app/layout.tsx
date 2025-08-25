import type { Metadata } from "next";
import "./globals.css";
import Container from "@/components/ui/container";
import { env } from "@/lib/env";
import TopRightLogout from "@/components/auth/TopRightLogout";

export const metadata: Metadata = {
  title: env.client.NEXT_PUBLIC_APP_NAME,
  description: "Central operativo del cuerpo técnico – MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <header className="sticky top-0 z-10 border-b border-brand-700/30 bg-black/70 backdrop-blur">
          <Container>
            <div className="relative flex items-center justify-between py-4">
              <h1 className="text-xl font-semibold tracking-tight">
                {env.client.NEXT_PUBLIC_APP_NAME}
              </h1>

              <div className="text-sm text-white/70">Fase 0</div>

              {/* Botón de logout fijo arriba a la derecha */}
              <TopRightLogout />
            </div>
          </Container>
        </header>

        <main className="py-10">
          <Container>{children}</Container>
        </main>

        <footer className="border-t border-brand-700/30 py-6 text-center text-xs text-white/60">
          {new Date().getFullYear()} • {env.client.NEXT_PUBLIC_APP_NAME}
        </footer>
      </body>
    </html>
  );
}

