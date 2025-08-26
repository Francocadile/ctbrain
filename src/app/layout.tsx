import type { Metadata } from "next";
import "./globals.css";

import Providers from "@/components/auth/Providers";
import TopRightLogout from "@/components/auth/TopRightLogout";
import Container from "@/components/ui/container";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: env.client.NEXT_PUBLIC_APP_NAME,
  description: "Central operativo del cuerpo técnico — MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <TopRightLogout />
          <Container>{children}</Container>
        </Providers>
      </body>
    </html>
  );
}
