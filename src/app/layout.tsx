import "./globals.css";
import Providers from "./providers";
import { MobilePushClient } from "../lib/mobile/pushClient";
import Script from "next/script";

export const metadata = {
  title: {
    default: "OPENBASE",
    template: "%s — OPENBASE",
  },
  description: "App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900">
        <Script
          id="capacitor-bridge-loader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
      (function () {
        try {
          if (typeof window === 'undefined') return;

          // Si ya existe, listo
          if (window.Capacitor) {
            console.log('[mobile-push] Capacitor already present');
            return;
          }

          // Detectar app por user-agent (Capacitor suele agregarlo)
          var ua = navigator.userAgent || '';
          var isApp = ua.includes('Capacitor') || ua.includes('com.openbase.mobile');

          if (!isApp) return;

          var s = document.createElement('script');
          s.src = 'capacitor://localhost/capacitor.js';
          s.async = true;
          s.onload = function () {
            console.log('[mobile-push] capacitor.js loaded');
          };
          s.onerror = function (e) {
            console.log('[mobile-push] capacitor.js failed', e);
          };
          document.head.appendChild(s);
        } catch (e) {
          console.log('[mobile-push] loader error', e);
        }
      })();
    `,
          }}
        />
        {/* Ejecuta la inicialización de push sólo en cliente cuando se carga la app en Capacitor */}
        <MobilePushClient />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

