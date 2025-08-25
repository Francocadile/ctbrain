import type { Metadata } from "next";
import "./globals.css";
import Container from "@/components/ui/container";
import { env } from "@/lib/env";
import TopRightLogout from "@/components/auth/TopRightLogout"; // <- ruta correcta
import Providers from "@/components/auth/Providers"; // asegura SessionProvider

export const metadata: Metadata = {
  title: env.client.NEXT_PUBLIC_APP_NAME,
  description: "Central operativo del cuerpo técnico – MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          {/* Header global */}
          <header className="sticky top-0 z-20 border-b border-brand-700/30 bg-black/70 backdrop-blur">
            <Container>
              <div className="flex items-center justify-between py-4">
                <h1 className="text-xl font-semibold tracking-tight">
                  {env.client.NEXT_PUBLIC_APP_NAME}
                </h1>
                <TopRightLogout />
              </div>
            </Container>
          </header>

          {/* Contenido */}
          <main className="py-10">
            <Container>{children}</Container>
          </main>

          {/* Footer */}
          <footer className="border-t border-brand-700/30 py-6 text-center text-xs text-white/60">
            {new Date().getFullYear()} • {env.client.NEXT_PUBLIC_APP_NAME}
          </footer>
        </Providers>
      </body>
    </html>
  );
}


